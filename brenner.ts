#!/usr/bin/env bun
/**
 * Brenner Bot CLI.
 *
 * Goals (v0):
 * - Render/promote prompt templates with transcript excerpt injection.
 * - Coordinate multi-agent work via MCP Agent Mail (HTTP Streamable MCP).
 *
 * Runtime: Bun-only. Local imports are bundled when compiled.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Shared modules from web lib (bundled by Bun)
import { AgentMailClient } from "./apps/web/src/lib/agentMail";
import type { Json } from "./apps/web/src/lib/json";
import { composeKickoffMessages, type KickoffConfig } from "./apps/web/src/lib/session-kickoff";
import { computeThreadStatusFromThread, formatThreadStatusSummary } from "./apps/web/src/lib/threadStatus";
import {
  parseManifest,
  detectPlatform,
  generateInstallPlan,
  formatPlanHuman,
  formatPlanJson,
  type PlatformString,
} from "./apps/web/src/lib/toolchain-manifest";

function isRecord(value: Json): value is { [key: string]: Json } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEnsureProjectSlug(result: Json): string | undefined {
  if (!isRecord(result)) return undefined;

  const structuredContent = result.structuredContent;
  if (isRecord(structuredContent)) {
    const slug = structuredContent.slug;
    if (typeof slug === "string" && slug.length > 0) return slug;
  }

  const content = result.content;
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0];
    if (isRecord(first) && typeof first.text === "string") {
      try {
        const parsed = JSON.parse(first.text) as Json;
        if (isRecord(parsed) && typeof parsed.slug === "string" && parsed.slug.length > 0) return parsed.slug;
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

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

function asIntFlag(flags: ParsedArgs["flags"], key: string): number | undefined {
  const raw = asStringFlag(flags, key);
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) throw new Error(`Invalid --${key}: expected integer, got "${raw}"`);
  return n;
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

type BrennerBuildInfo = {
  version: string;
  gitSha: string | null;
  buildDate: string | null;
  platformTarget: string;
};

function normalizeSemverTag(tag: string): string | null {
  const trimmed = tag.trim();
  const withoutV = trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;
  if (/^\d+\.\d+\.\d+(-[0-9A-Za-z-.]+)?$/.test(withoutV)) return withoutV;
  return null;
}

function tryGit(args: string[]): string | null {
  try {
    const proc = Bun.spawnSync(["git", ...args], { stdout: "pipe", stderr: "pipe" });
    if (proc.exitCode !== 0) return null;
    const out = proc.stdout.toString().trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

function inferPlatformTarget(): string {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "darwin") return arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  if (platform === "linux") return arch === "arm64" ? "linux-arm64" : "linux-x64";
  if (platform === "win32") return arch === "arm64" ? "win-arm64" : "win-x64";

  return `${platform}-${arch}`;
}

function getBrennerBuildInfo(): BrennerBuildInfo {
  const envVersion = process.env.BRENNER_VERSION;
  const envGitSha = process.env.BRENNER_GIT_SHA;
  const envBuildDate = process.env.BRENNER_BUILD_DATE;
  const envTarget = process.env.BRENNER_TARGET;

  const gitTag = tryGit(["describe", "--tags", "--exact-match"]);
  const normalizedGitTag = gitTag ? normalizeSemverTag(gitTag) : null;

  const normalizedEnvVersion = envVersion ? normalizeSemverTag(envVersion) : null;

  const version = normalizedEnvVersion ?? normalizedGitTag ?? envVersion ?? "0.0.0-dev";

  const gitSha = envGitSha ?? tryGit(["rev-parse", "HEAD"]);
  const buildDate = envBuildDate ?? tryGit(["show", "-s", "--format=%cI", "HEAD"]);
  const platformTarget = envTarget ?? inferPlatformTarget();

  return { version, gitSha, buildDate, platformTarget };
}

function formatBrennerVersionText(info: BrennerBuildInfo): string {
  const sha = info.gitSha ? info.gitSha.slice(0, 12) : "unknown";
  const built = info.buildDate ?? "unknown";

  return [
    `brenner ${info.version}`,
    `git: ${sha}`,
    `built: ${built}`,
    `target: ${info.platformTarget}`,
  ].join("\n");
}

function usage(): string {
  return `
Usage:
  ./brenner.ts <command> [args] [--flags]
  ./brenner.ts --version

Commands:
  version
  mail health
  mail tools
  mail agents --project-key <abs-path>
  mail send --project-key <abs-path> --sender <AgentName> --to <A,B> --subject <s> --body-file <path> [--thread-id <id>] [--ack-required]
  mail inbox --project-key <abs-path> --agent <AgentName> [--limit <n>] [--since <iso>] [--urgent-only] [--include-bodies] [--threads]
  mail read --project-key <abs-path> --agent <AgentName> --message-id <n>
  mail ack --project-key <abs-path> --agent <AgentName> --message-id <n>
  mail thread --project-key <abs-path> --thread-id <id> [--include-examples] [--llm]

  toolchain plan [--manifest <path>] [--platform <p>] [--json]

  prompt compose --template <path> --excerpt-file <path> [--theme <s>] [--domain <s>] [--question <s>]

  session start --project-key <abs-path> --sender <AgentName> --to <A,B> --thread-id <id>
               --excerpt-file <path> --question <s> [--context <s>]
               [--hypotheses <s>] [--constraints <s>] [--outputs <s>]
               [--unified] [--template <path>] [--theme <s>] [--domain <s>]

  session status --project-key <abs-path> --thread-id <id> [--watch] [--timeout <seconds>]

    By default, sends role-specific prompts to each recipient:
      - Codex/GPT → Hypothesis Generator
      - Opus/Claude → Test Designer
      - Gemini → Adversarial Critic

    Use --unified to send the same prompt to all recipients (legacy mode).

Aliases:
  orchestrate start  (alias for: session start)

Agent Mail connection (env):
  AGENT_MAIL_BASE_URL        default: http://127.0.0.1:8765
  AGENT_MAIL_PATH            default: /mcp/
  AGENT_MAIL_BEARER_TOKEN    optional

Build metadata (for --version):
  BRENNER_VERSION            optional (prefer semver, e.g. 0.1.0)
  BRENNER_GIT_SHA            optional
  BRENNER_BUILD_DATE         optional (ISO 8601)
  BRENNER_TARGET             optional (e.g. linux-x64)

Examples:
  ./brenner.ts mail tools
  ./brenner.ts mail inbox --project-key "$PWD" --agent GreenCastle --threads
  ./brenner.ts mail ack --project-key "$PWD" --agent GreenCastle --message-id 123
  ./brenner.ts --version
  ./brenner.ts toolchain plan
  ./brenner.ts toolchain plan --platform darwin-arm64 --json
  ./brenner.ts prompt compose --template metaprompt_by_gpt_52.md --excerpt-file excerpt.md --theme "problem choice"
  ./brenner.ts session start --project-key "$PWD" --sender GreenCastle --to BlueMountain,RedForest \\
    --thread-id FEAT-123 --excerpt-file excerpt.md --question "..." --ack-required
`.trim();
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

  if (asBoolFlag(flags, "version")) {
    console.log(formatBrennerVersionText(getBrennerBuildInfo()));
    process.exit(0);
  }

  if (!top || asBoolFlag(flags, "help") || top === "help" || top === "-h") {
    console.log(usage());
    process.exit(0);
  }

  if (top === "version") {
    console.log(formatBrennerVersionText(getBrennerBuildInfo()));
    process.exit(0);
  }

  if (top === "mail") {
    const client = new AgentMailClient();
    const projectKey = asStringFlag(flags, "project-key") ?? process.cwd();

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
      const projectSlug = projectKey.startsWith("/")
        ? parseEnsureProjectSlug(await client.toolsCall("ensure_project", { human_key: projectKey }))
        : projectKey;
      if (!projectSlug) throw new Error("Agent Mail ensure_project did not return a project slug.");
      const result = await client.resourcesRead(`resource://agents/${projectSlug}`);
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    if (sub === "send") {
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

    if (sub === "inbox") {
      const agentName = asStringFlag(flags, "agent") ?? process.env.AGENT_NAME;
      if (!agentName) throw new Error("Missing --agent (or set AGENT_NAME).");

      const limit = asIntFlag(flags, "limit") ?? 20;
      const urgentOnly = asBoolFlag(flags, "urgent-only");
      const includeBodies = asBoolFlag(flags, "include-bodies");
      const sinceTs = asStringFlag(flags, "since");

      const result = await client.toolsCall("fetch_inbox", {
        project_key: projectKey,
        agent_name: agentName,
        limit,
        urgent_only: urgentOnly,
        include_bodies: includeBodies,
        since_ts: sinceTs ?? null,
      });

      if (asBoolFlag(flags, "threads")) {
        // Best-effort grouping by thread_id from structuredContent, falling back to raw content parsing.
        const messages: Array<Record<string, Json>> = [];

        if (isRecord(result) && isRecord(result.structuredContent)) {
          const structured = result.structuredContent.result;
          if (Array.isArray(structured)) {
            for (const item of structured) {
              if (isRecord(item)) messages.push(item);
            }
          }
        } else if (isRecord(result) && Array.isArray(result.content) && result.content.length > 0) {
          const first = result.content[0];
          if (isRecord(first) && typeof first.text === "string") {
            try {
              const parsed = JSON.parse(first.text) as Json;
              if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  if (isRecord(item)) messages.push(item);
                }
              }
            } catch {
              // ignore
            }
          }
        }

        const threads: Record<
          string,
          { thread_id: string; message_ids: number[]; latest_ts: string | null; ack_required_count: number }
        > = {};

        for (const m of messages) {
          const threadId = typeof m.thread_id === "string" && m.thread_id.length > 0 ? m.thread_id : "(no-thread)";
          const messageId = typeof m.id === "number" ? m.id : null;
          const createdTs = typeof m.created_ts === "string" ? m.created_ts : null;
          const ackRequired = m.ack_required === true;

          const existing = (threads[threadId] ??= {
            thread_id: threadId,
            message_ids: [],
            latest_ts: null,
            ack_required_count: 0,
          });

          if (messageId !== null) existing.message_ids.push(messageId);
          if (createdTs && (!existing.latest_ts || createdTs > existing.latest_ts)) existing.latest_ts = createdTs;
          if (ackRequired) existing.ack_required_count++;
        }

        const out = {
          agent: agentName,
          threads: Object.values(threads).sort((a, b) => (b.latest_ts ?? "").localeCompare(a.latest_ts ?? "")),
        };
        console.log(JSON.stringify(out, null, 2));
      } else {
        console.log(JSON.stringify(result, null, 2));
      }

      process.exit(0);
    }

    if (sub === "read") {
      const agentName = asStringFlag(flags, "agent") ?? process.env.AGENT_NAME;
      if (!agentName) throw new Error("Missing --agent (or set AGENT_NAME).");
      const messageId = asIntFlag(flags, "message-id");
      if (!messageId) throw new Error("Missing --message-id.");

      const result = await client.toolsCall("mark_message_read", {
        project_key: projectKey,
        agent_name: agentName,
        message_id: messageId,
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    if (sub === "ack") {
      const agentName = asStringFlag(flags, "agent") ?? process.env.AGENT_NAME;
      if (!agentName) throw new Error("Missing --agent (or set AGENT_NAME).");
      const messageId = asIntFlag(flags, "message-id");
      if (!messageId) throw new Error("Missing --message-id.");

      const result = await client.toolsCall("acknowledge_message", {
        project_key: projectKey,
        agent_name: agentName,
        message_id: messageId,
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    if (sub === "thread") {
      const threadId = asStringFlag(flags, "thread-id");
      if (!threadId) throw new Error("Missing --thread-id.");
      const includeExamples = asBoolFlag(flags, "include-examples");
      const llmMode = asBoolFlag(flags, "llm");

      const result = await client.toolsCall("summarize_thread", {
        project_key: projectKey,
        thread_id: threadId,
        include_examples: includeExamples,
        llm_mode: llmMode,
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    throw new Error(`Unknown mail command: ${sub ?? "(missing)"}`);
  }

  if (top === "toolchain" && sub === "plan") {
    const manifestPath = resolve(asStringFlag(flags, "manifest") ?? "specs/toolchain.manifest.json");
    const jsonMode = asBoolFlag(flags, "json");
    const platformOverride = asStringFlag(flags, "platform") as PlatformString | undefined;

    // Read and parse manifest
    let manifestJson: string;
    try {
      manifestJson = readTextFile(manifestPath);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Failed to read manifest: ${msg}`);
      process.exit(1);
    }

    const parseResult = parseManifest(manifestJson);
    if (!parseResult.ok) {
      console.error(parseResult.error);
      process.exit(1);
    }

    // Detect or use override platform
    const platform = platformOverride ?? detectPlatform();
    if (!platform) {
      console.error(
        `Unsupported platform: ${process.platform}/${process.arch}\n` +
          `Supported: linux-x64, linux-arm64, darwin-arm64, darwin-x64, win-x64`
      );
      process.exit(1);
    }

    // Validate platform override if provided
    const validPlatforms = ["linux-x64", "linux-arm64", "darwin-arm64", "darwin-x64", "win-x64"];
    if (platformOverride && !validPlatforms.includes(platformOverride)) {
      console.error(`Invalid --platform: ${platformOverride}\nSupported: ${validPlatforms.join(", ")}`);
      process.exit(1);
    }

    const plan = generateInstallPlan(parseResult.manifest, platform);

    if (jsonMode) {
      console.log(formatPlanJson(plan));
    } else {
      console.log(formatPlanHuman(plan));
    }

    process.exit(0);
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

  const normalizedTop = top === "orchestrate" ? "session" : top;

  if (normalizedTop === "session" && sub === "start") {
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

    const question = asStringFlag(flags, "question");
    if (!question) throw new Error("Missing --question (research question).");

    const context = asStringFlag(flags, "context") ?? "See excerpt for background.";
    const unified = asBoolFlag(flags, "unified");

    // Ensure project + sender identity exist
    await client.toolsCall("ensure_project", { human_key: projectKey });
    await client.toolsCall("register_agent", {
      project_key: projectKey,
      name: sender,
      program: "brenner-cli",
      model: "orchestrator",
      task_description: `Brenner Protocol session: ${threadId}`,
    });

    // Compose kickoff configuration
    const kickoffConfig: KickoffConfig = {
      threadId,
      researchQuestion: question,
      context,
      excerpt,
      recipients: to,
      initialHypotheses: asStringFlag(flags, "hypotheses"),
      constraints: asStringFlag(flags, "constraints"),
      requestedOutputs: asStringFlag(flags, "outputs"),
    };

    if (unified) {
      // Legacy mode: send same message to all recipients
      const templatePath = resolve(asStringFlag(flags, "template") ?? "metaprompt_by_gpt_52.md");
      const body = composePrompt({
        templatePath,
        excerpt,
        theme: asStringFlag(flags, "theme"),
        domain: asStringFlag(flags, "domain"),
        question,
      });
      const subject = asStringFlag(flags, "subject") ?? `KICKOFF: [${threadId}] ${question.slice(0, 50)}...`;

      const result = await client.toolsCall("send_message", {
        project_key: projectKey,
        sender_name: sender,
        to,
        subject,
        body_md: body,
        thread_id: threadId,
        ack_required: true,
      });
      console.log(JSON.stringify(result, null, 2));
    } else {
      // Role-specific mode: each agent gets their role prompt
      const messages = composeKickoffMessages(kickoffConfig);
      const results: Json[] = [];

      for (const msg of messages) {
        console.error(`Sending kickoff to ${msg.to} as ${msg.role.displayName}...`);
        const result = await client.toolsCall("send_message", {
          project_key: projectKey,
          sender_name: sender,
          to: [msg.to],
          subject: msg.subject,
          body_md: msg.body,
          thread_id: threadId,
          ack_required: msg.ackRequired,
        });
        results.push(result);
      }

      console.log(JSON.stringify({ sent: results.length, messages: results }, null, 2));
    }

    process.exit(0);
  }

  if (normalizedTop === "session" && sub === "status") {
    const client = new AgentMailClient();
    const projectKey = asStringFlag(flags, "project-key") ?? process.cwd();
    const threadId = asStringFlag(flags, "thread-id");
    if (!threadId) throw new Error("Missing --thread-id.");

    const watch = asBoolFlag(flags, "watch");
    const timeoutSeconds = asIntFlag(flags, "timeout") ?? 900;
    if (timeoutSeconds <= 0) throw new Error(`Invalid --timeout: expected > 0 seconds, got ${timeoutSeconds}`);

    const timeoutMs = timeoutSeconds * 1000;
    const startMs = Date.now();

    const fetchStatus = async () => {
      const thread = await client.readThread({ projectKey, threadId, includeBodies: false });
      return computeThreadStatusFromThread(thread);
    };

    let status = await fetchStatus();
    process.stdout.write(formatThreadStatusSummary(status) + "\n");

    if (!watch) {
      process.exit(status.isComplete ? 0 : 1);
    }

    let delayMs = 2000;
    let lastPrintedKey = JSON.stringify({
      phase: status.phase,
      roles: Object.fromEntries(Object.entries(status.roles).map(([role, s]) => [role, s.completed])),
      pendingAcks: status.acks.pendingCount,
      artifactVersion: status.latestArtifact?.version ?? null,
    });

    while (!status.isComplete) {
      if (Date.now() - startMs > timeoutMs) {
        console.error(`Timed out after ${timeoutSeconds}s waiting for roles to complete in thread ${threadId}.`);
        process.exit(2);
      }

      await new Promise((r) => setTimeout(r, delayMs));
      delayMs = Math.min(Math.round(delayMs * 1.5), 60_000);

      status = await fetchStatus();
      const key = JSON.stringify({
        phase: status.phase,
        roles: Object.fromEntries(Object.entries(status.roles).map(([role, s]) => [role, s.completed])),
        pendingAcks: status.acks.pendingCount,
        artifactVersion: status.latestArtifact?.version ?? null,
      });

      if (key !== lastPrintedKey) {
        process.stdout.write("\n" + formatThreadStatusSummary(status) + "\n");
        lastPrintedKey = key;
      }
    }

    process.exit(0);
  }

  throw new Error(`Unknown command: ${[top, sub, action].filter(Boolean).join(" ")}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
