#!/usr/bin/env bun
/**
 * Brenner Bot CLI (single-file).
 *
 * Goals (v0):
 * - Render/promote prompt templates with transcript excerpt injection.
 * - Coordinate multi-agent work via MCP Agent Mail (HTTP Streamable MCP).
 *
 * No external deps; Bun-only.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

type ParsedArgs = {
  positional: string[];
  flags: Record<string, string | boolean>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] ?? "";
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const eq = token.indexOf("=");
    if (eq !== -1) {
      const key = token.slice(2, eq).trim();
      const value = token.slice(eq + 1);
      flags[key] = value;
      continue;
    }

    const key = token.slice(2).trim();
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i++;
  }

  return { positional, flags };
}

function asStringFlag(flags: ParsedArgs["flags"], key: string): string | undefined {
  const value = flags[key];
  if (typeof value === "string") return value;
  return undefined;
}

function asBoolFlag(flags: ParsedArgs["flags"], key: string): boolean {
  return flags[key] === true;
}

function splitCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function readTextFile(path: string): string {
  return readFileSync(path, "utf8");
}

function usage(): string {
  return `
Usage:
  ./brenner.ts <command> [args] [--flags]

Commands:
  mail health
  mail tools
  mail agents --project-key <abs-path>
  mail send --project-key <abs-path> --sender <AgentName> --to <A,B> --subject <s> --body-file <path> [--thread-id <id>] [--ack-required]

  prompt compose --template <path> --excerpt-file <path> [--theme <s>] [--domain <s>] [--question <s>]

  orchestrate start --project-key <abs-path> --sender <AgentName> --to <A,B> --thread-id <id> --excerpt-file <path>
                   [--template <path>] [--theme <s>] [--domain <s>] [--question <s>] [--subject <s>] [--ack-required]

Agent Mail connection (env):
  AGENT_MAIL_BASE_URL        default: http://127.0.0.1:8765
  AGENT_MAIL_PATH            default: /mcp/
  AGENT_MAIL_BEARER_TOKEN    optional

Examples:
  ./brenner.ts mail tools
  ./brenner.ts prompt compose --template metaprompt_by_gpt_52.md --excerpt-file excerpt.md --theme "problem choice"
  ./brenner.ts orchestrate start --project-key "$PWD" --sender GreenCastle --to BlueMountain,RedForest \\
    --thread-id FEAT-123 --excerpt-file excerpt.md --question "..." --ack-required
`.trim();
}

class AgentMailClient {
  private readonly baseUrl: string;
  private readonly path: string;
  private readonly bearerToken?: string;

  constructor(options?: { baseUrl?: string; path?: string; bearerToken?: string }) {
    this.baseUrl = (options?.baseUrl ?? process.env.AGENT_MAIL_BASE_URL ?? "http://127.0.0.1:8765").replace(/\/+$/, "");
    this.path = (options?.path ?? process.env.AGENT_MAIL_PATH ?? "/mcp/").startsWith("/")
      ? options?.path ?? process.env.AGENT_MAIL_PATH ?? "/mcp/"
      : `/${options?.path ?? process.env.AGENT_MAIL_PATH ?? "mcp/"}`;
    this.bearerToken = options?.bearerToken ?? process.env.AGENT_MAIL_BEARER_TOKEN;
  }

  private endpoint(): string {
    const p = this.path.endsWith("/") ? this.path : `${this.path}/`;
    return `${this.baseUrl}${p}`;
  }

  async call(method: string, params?: Json): Promise<Json> {
    const id = crypto.randomUUID();
    const body = JSON.stringify({ jsonrpc: "2.0", id, method, params: params ?? {} });

    const headers: Record<string, string> = {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    };
    if (this.bearerToken) headers.Authorization = `Bearer ${this.bearerToken}`;

    const res = await fetch(this.endpoint(), { method: "POST", headers, body });
    const text = await res.text();
    let data: any = undefined;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      // Some clients/servers may respond via SSE; keep the raw text for debugging.
      throw new Error(`Agent Mail non-JSON response (HTTP ${res.status}): ${text.slice(0, 400)}`);
    }

    if (!res.ok) {
      throw new Error(`Agent Mail HTTP ${res.status}: ${JSON.stringify(data)}`);
    }
    if (data?.error) {
      throw new Error(`Agent Mail MCP error: ${JSON.stringify(data.error)}`);
    }
    return data?.result as Json;
  }

  toolsList(): Promise<Json> {
    return this.call("tools/list", {});
  }

  toolsCall(name: string, args: Record<string, Json>): Promise<Json> {
    return this.call("tools/call", { name, arguments: args } as any);
  }

  resourcesRead(uri: string): Promise<Json> {
    return this.call("resources/read", { uri } as any);
  }
}

function composePrompt(options: {
  templatePath: string;
  excerpt: string;
  theme?: string;
  domain?: string;
  question?: string;
}): string {
  const template = readTextFile(options.templatePath);

  const chunks: string[] = [];
  chunks.push(template.trimEnd());
  chunks.push("");
  chunks.push("---");
  chunks.push("");
  chunks.push("## TRANSCRIPT EXCERPT(S)");
  chunks.push(options.excerpt.trim());
  chunks.push("");
  if (options.theme) {
    chunks.push("## FOCUS THEME");
    chunks.push(options.theme.trim());
    chunks.push("");
  }
  if (options.domain) {
    chunks.push("## TARGET RESEARCH DOMAIN");
    chunks.push(options.domain.trim());
    chunks.push("");
  }
  if (options.question) {
    chunks.push("## CURRENT RESEARCH QUESTION");
    chunks.push(options.question.trim());
    chunks.push("");
  }
  return chunks.join("\n");
}

async function main(): Promise<void> {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [top, sub, action] = positional;

  if (!top || asBoolFlag(flags, "help") || top === "help" || top === "-h") {
    console.log(usage());
    process.exit(0);
  }

  if (top === "mail") {
    const client = new AgentMailClient();

    if (sub === "health") {
      // Prefer the FastAPI health endpoint when reachable; fall back to MCP tool.
      const baseUrl = (process.env.AGENT_MAIL_BASE_URL ?? "http://127.0.0.1:8765").replace(/\/+$/, "");
      const headers: Record<string, string> = {};
      if (process.env.AGENT_MAIL_BEARER_TOKEN) headers.Authorization = `Bearer ${process.env.AGENT_MAIL_BEARER_TOKEN}`;
      try {
        const res = await fetch(`${baseUrl}/health/readiness`, { headers });
        const json = await res.json().catch(() => ({}));
        console.log(JSON.stringify({ ok: res.ok, status: res.status, readiness: json }, null, 2));
        process.exit(res.ok ? 0 : 1);
      } catch {
        const result = await client.toolsCall("health_check", {});
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      }
    }

    if (sub === "tools") {
      const result = await client.toolsList();
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    if (sub === "agents") {
      const projectKey = asStringFlag(flags, "project-key") ?? process.cwd();
      const result = await client.resourcesRead(`resource://agents/${projectKey}`);
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    if (sub === "send") {
      const projectKey = asStringFlag(flags, "project-key") ?? process.cwd();
      const sender = asStringFlag(flags, "sender") ?? process.env.AGENT_NAME;
      if (!sender) throw new Error("Missing --sender (or set AGENT_NAME).");
      const to = splitCsv(asStringFlag(flags, "to"));
      if (to.length === 0) throw new Error("Missing --to <A,B>.");
      const subject = asStringFlag(flags, "subject") ?? "";
      if (!subject) throw new Error("Missing --subject.");
      const bodyFile = asStringFlag(flags, "body-file");
      if (!bodyFile) throw new Error("Missing --body-file.");
      const bodyMd = readTextFile(resolve(bodyFile));
      const threadId = asStringFlag(flags, "thread-id");
      const ackRequired = asBoolFlag(flags, "ack-required");

      const result = await client.toolsCall("send_message", {
        project_key: projectKey,
        sender_name: sender,
        to,
        subject,
        body_md: bodyMd,
        thread_id: threadId ?? null,
        ack_required: ackRequired,
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    throw new Error(`Unknown mail command: ${sub ?? "(missing)"}`);
  }

  if (top === "prompt" && sub === "compose") {
    const templatePath = resolve(asStringFlag(flags, "template") ?? "metaprompt_by_gpt_52.md");
    const excerptFile = asStringFlag(flags, "excerpt-file");
    if (!excerptFile) throw new Error("Missing --excerpt-file.");
    const excerpt = readTextFile(resolve(excerptFile));

    const out = composePrompt({
      templatePath,
      excerpt,
      theme: asStringFlag(flags, "theme"),
      domain: asStringFlag(flags, "domain"),
      question: asStringFlag(flags, "question"),
    });
    process.stdout.write(out);
    process.exit(0);
  }

  if (top === "orchestrate" && sub === "start") {
    const client = new AgentMailClient();
    const projectKey = asStringFlag(flags, "project-key") ?? process.cwd();
    const sender = asStringFlag(flags, "sender") ?? process.env.AGENT_NAME;
    if (!sender) throw new Error("Missing --sender (or set AGENT_NAME).");
    const to = splitCsv(asStringFlag(flags, "to"));
    if (to.length === 0) throw new Error("Missing --to <A,B>.");
    const threadId = asStringFlag(flags, "thread-id");
    if (!threadId) throw new Error("Missing --thread-id.");

    const excerptFile = asStringFlag(flags, "excerpt-file");
    if (!excerptFile) throw new Error("Missing --excerpt-file.");
    const excerpt = readTextFile(resolve(excerptFile));

    const templatePath = resolve(asStringFlag(flags, "template") ?? "metaprompt_by_gpt_52.md");
    const subject = asStringFlag(flags, "subject") ?? `[${threadId}] Brenner Loop kickoff`;
    const ackRequired = asBoolFlag(flags, "ack-required");

    const body = composePrompt({
      templatePath,
      excerpt,
      theme: asStringFlag(flags, "theme"),
      domain: asStringFlag(flags, "domain"),
      question: asStringFlag(flags, "question"),
    });

    // Ensure project + sender identity exist, then send the kickoff prompt.
    await client.toolsCall("ensure_project", { human_key: projectKey });
    await client.toolsCall("register_agent", {
      project_key: projectKey,
      name: sender,
      program: "codex-cli",
      model: "gpt-5.2",
      task_description: `Brenner Bot orchestration: ${threadId}`,
    });

    const result = await client.toolsCall("send_message", {
      project_key: projectKey,
      sender_name: sender,
      to,
      subject,
      body_md: body,
      thread_id: threadId,
      ack_required: ackRequired,
    });

    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  throw new Error(`Unknown command: ${[top, sub, action].filter(Boolean).join(" ")}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});

