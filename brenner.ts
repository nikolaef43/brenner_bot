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

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

// Shared modules from web lib (bundled by Bun)
import { AgentMailClient } from "./apps/web/src/lib/agentMail";
import { buildExcerptFromSections, composeExcerpt, type ComposedExcerpt, type ExcerptSection } from "./apps/web/src/lib/excerpt-builder";
import type { Json } from "./apps/web/src/lib/json";
import { parseQuoteBank } from "./apps/web/src/lib/quotebank-parser";
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
import { parseTranscript } from "./apps/web/src/lib/transcript-parser";

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

function parseAgentNameFromToolResult(result: Json): string | undefined {
  if (!isRecord(result)) return undefined;

  const structuredContent = result.structuredContent;
  if (isRecord(structuredContent)) {
    const name = structuredContent.name;
    if (typeof name === "string" && name.length > 0) return name;
  }

  const content = result.content;
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0];
    if (isRecord(first) && typeof first.text === "string") {
      try {
        const parsed = JSON.parse(first.text) as Json;
        if (isRecord(parsed) && typeof parsed.name === "string" && parsed.name.length > 0) return parsed.name;
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

function isToolError(result: Json): boolean {
  return isRecord(result) && result.isError === true;
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

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function envNonEmpty(key: string): string | undefined {
  return nonEmptyString(process.env[key]);
}

type BrennerConfigFile = {
  agentMail?: {
    baseUrl?: string;
    path?: string;
    bearerToken?: string;
  };
  defaults?: {
    projectKey?: string;
    template?: string;
  };
};

type BrennerLoadedConfig = {
  path: string | null;
  config: BrennerConfigFile;
};

type BrennerRuntimeConfig = {
  configFilePath: string | null;
  agentMail: { baseUrl: string; path: string; bearerToken?: string };
  defaults: { projectKey: string; template: string };
};

function defaultConfigPath(): string {
  if (process.platform === "win32") {
    const base = envNonEmpty("APPDATA") ?? join(homedir(), "AppData", "Roaming");
    return join(base, "brenner", "config.json");
  }

  const base = envNonEmpty("XDG_CONFIG_HOME") ?? join(homedir(), ".config");
  return join(base, "brenner", "config.json");
}

function resolveConfigPath(flags: ParsedArgs["flags"]): { path: string; explicit: boolean } {
  const flagPath = nonEmptyString(asStringFlag(flags, "config"));
  const envPath = envNonEmpty("BRENNER_CONFIG_PATH");
  if (flagPath) return { path: resolve(flagPath), explicit: true };
  if (envPath) return { path: resolve(envPath), explicit: true };
  return { path: defaultConfigPath(), explicit: false };
}

function parseBrennerConfigJson(text: string, configPath: string): BrennerConfigFile {
  let parsed: Json;
  try {
    parsed = JSON.parse(text) as Json;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse config JSON at ${configPath}: ${msg}`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`Config file must be a JSON object: ${configPath}`);
  }

  const out: BrennerConfigFile = {};

  const agentMail = parsed.agentMail;
  if (agentMail !== undefined) {
    if (!isRecord(agentMail)) throw new Error(`Config field "agentMail" must be an object: ${configPath}`);
    const baseUrl = nonEmptyString(agentMail.baseUrl);
    const path = nonEmptyString(agentMail.path);
    const bearerToken = nonEmptyString(agentMail.bearerToken);
    if (baseUrl || path || bearerToken) {
      out.agentMail = {
        ...(baseUrl ? { baseUrl } : {}),
        ...(path ? { path } : {}),
        ...(bearerToken ? { bearerToken } : {}),
      };
    }
  }

  const defaults = parsed.defaults;
  if (defaults !== undefined) {
    if (!isRecord(defaults)) throw new Error(`Config field "defaults" must be an object: ${configPath}`);
    const projectKey = nonEmptyString(defaults.projectKey);
    const template = nonEmptyString(defaults.template);
    if (projectKey || template) {
      out.defaults = { ...(projectKey ? { projectKey } : {}), ...(template ? { template } : {}) };
    }
  }

  return out;
}

function loadBrennerConfig(flags: ParsedArgs["flags"]): BrennerLoadedConfig {
  const { path, explicit } = resolveConfigPath(flags);
  if (!existsSync(path)) {
    if (explicit) throw new Error(`Config file not found: ${path}`);
    return { path: null, config: {} };
  }

  const raw = readTextFile(path);
  return { path, config: parseBrennerConfigJson(raw, path) };
}

function resolveBrennerRuntimeConfig(loaded: BrennerLoadedConfig): BrennerRuntimeConfig {
  const fileAgentMail = loaded.config.agentMail;
  const baseUrl = (envNonEmpty("AGENT_MAIL_BASE_URL") ?? fileAgentMail?.baseUrl ?? "http://127.0.0.1:8765").replace(
    /\/+$/,
    "",
  );
  const rawPath = envNonEmpty("AGENT_MAIL_PATH") ?? fileAgentMail?.path ?? "/mcp/";
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const bearerToken = envNonEmpty("AGENT_MAIL_BEARER_TOKEN") ?? fileAgentMail?.bearerToken;

  const fileDefaults = loaded.config.defaults;
  const defaultProjectKey = resolve(fileDefaults?.projectKey ?? process.cwd());
  const defaultTemplate = fileDefaults?.template ?? "metaprompt_by_gpt_52.md";

  return {
    configFilePath: loaded.path,
    agentMail: { baseUrl, path, bearerToken },
    defaults: { projectKey: defaultProjectKey, template: defaultTemplate },
  };
}

type BrennerBuildInfo = {
  version: string;
  gitSha: string | null;
  buildDate: string | null;
  platformTarget: string;
};

type DoctorCheckStatus = "ok" | "missing" | "error" | "skipped";

type DoctorCheck = {
  status: DoctorCheckStatus;
  path: string | null;
  verifyCommand: string | null;
  exitCode: number | null;
  notes?: string | null;
  stdout?: string;
  stderr?: string;
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

function splitCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i] ?? "";

    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (current.length > 0) tokens.push(current);
  return tokens;
}

function runCommand(command: string): { exitCode: number; stdout: string; stderr: string } {
  const argv = splitCommand(command);
  if (argv.length === 0) return { exitCode: 1, stdout: "", stderr: "Empty command" };

  try {
    const proc = Bun.spawnSync(argv, { stdout: "pipe", stderr: "pipe" });
    return {
      exitCode: proc.exitCode ?? 1,
      stdout: proc.stdout.toString(),
      stderr: proc.stderr.toString(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { exitCode: 1, stdout: "", stderr: msg };
  }
}

function normalizeExcerptQuote(text: string, maxWords: number): string {
  const normalized = text.replace(/\s+/g, " ").trim().replaceAll("\"", "'");
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return normalized;
  return words.slice(0, maxWords).join(" ") + "...";
}

type CassMemoryContextBullet = {
  id: string | null;
  content: string;
  raw: Json;
};

type CassMemoryContextHistorySnippet = {
  snippet: string;
  raw: Json;
};

type CassMemoryContextNormalized = {
  success: boolean;
  task: string;
  relevantBullets: CassMemoryContextBullet[];
  antiPatterns: CassMemoryContextBullet[];
  historySnippets: CassMemoryContextHistorySnippet[];
  suggestedCassQueries: string[];
  degraded: Json | null;
  error: { code?: string; message?: string; hint?: string; retryable?: boolean } | null;
  raw: Json;
};

type CassMemoryContextOptions = {
  workspace?: string;
  top?: number;
  history?: number;
  days?: number;
  logContext?: boolean;
  sessionId?: string;
};

type CassMemoryContextProvenance = {
  mode: "mcp" | "cli" | "none";
  startedAt: string;
  durationMs: number;
  mcp?: { baseUrl: string; path: string; tool: string; args: Record<string, Json> };
  cli?: { argv: string[]; exitCode: number; stderr: string };
  errors: string[];
};

type CassMemoryContextResult = {
  ok: boolean;
  context: CassMemoryContextNormalized | null;
  provenance: CassMemoryContextProvenance;
};

type CassMemoryKickoffAudit = {
  enabled: true;
  ok: boolean;
  injected: boolean;
  memoryContext: string | null;
  provenance: CassMemoryContextProvenance;
} | null;

function normalizeCassMemoryBullet(item: Json): CassMemoryContextBullet {
  if (typeof item === "string") return { id: null, content: item, raw: item };

  if (isRecord(item)) {
    const content = typeof item.content === "string" ? item.content : JSON.stringify(item);
    const id = typeof item.id === "string" && item.id.length > 0 ? item.id : null;
    return { id, content, raw: item };
  }

  return { id: null, content: JSON.stringify(item), raw: item };
}

function normalizeCassMemoryHistorySnippet(item: Json): CassMemoryContextHistorySnippet {
  if (typeof item === "string") return { snippet: item, raw: item };

  if (isRecord(item)) {
    const snippet = typeof item.snippet === "string" ? item.snippet : JSON.stringify(item);
    return { snippet, raw: item };
  }

  return { snippet: JSON.stringify(item), raw: item };
}

function normalizeCassMemoryStringArray(value: Json | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function parseCassMemoryContext(raw: Json, fallbackTask: string): CassMemoryContextNormalized {
  if (!isRecord(raw)) {
    return {
      success: false,
      task: fallbackTask,
      relevantBullets: [],
      antiPatterns: [],
      historySnippets: [],
      suggestedCassQueries: [],
      degraded: null,
      error: { message: "Malformed cm context JSON (expected object)" },
      raw,
    };
  }

  const success = raw.success === true;
  const task = typeof raw.task === "string" && raw.task.length > 0 ? raw.task : fallbackTask;

  const relevantBullets = Array.isArray(raw.relevantBullets)
    ? raw.relevantBullets.map((item) => normalizeCassMemoryBullet(item))
    : [];

  const antiPatterns = Array.isArray(raw.antiPatterns) ? raw.antiPatterns.map((item) => normalizeCassMemoryBullet(item)) : [];

  const historySnippets = Array.isArray(raw.historySnippets)
    ? raw.historySnippets.map((item) => normalizeCassMemoryHistorySnippet(item))
    : [];

  const suggestedCassQueries = normalizeCassMemoryStringArray(raw.suggestedCassQueries);

  const degraded = raw.degraded === undefined ? null : raw.degraded;

  const error = success
    ? null
    : {
        ...(typeof raw.code === "string" ? { code: raw.code } : {}),
        ...(typeof raw.error === "string" ? { message: raw.error } : {}),
        ...(typeof raw.hint === "string" ? { hint: raw.hint } : {}),
        ...(typeof raw.retryable === "boolean" ? { retryable: raw.retryable } : {}),
      };

  return {
    success,
    task,
    relevantBullets,
    antiPatterns,
    historySnippets,
    suggestedCassQueries,
    degraded,
    error,
    raw,
  };
}

function extractMcpToolPayload(result: Json): Json | null {
  if (!isRecord(result)) return null;

  const structured = result.structuredContent;
  if (isRecord(structured)) {
    if (typeof structured.success === "boolean") return structured;
    if (isRecord(structured.result) && typeof structured.result.success === "boolean") return structured.result;
  }

  const content = result.content;
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0];
    if (isRecord(first) && typeof first.text === "string") {
      try {
        return JSON.parse(first.text) as Json;
      } catch {
        return null;
      }
    }
  }

  return null;
}

async function getCassMemoryContext(task: string, options: CassMemoryContextOptions = {}): Promise<CassMemoryContextResult> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const errors: string[] = [];

  let mcpContext: CassMemoryContextNormalized | null = null;
  let mcpProvenance: CassMemoryContextProvenance["mcp"] | undefined = undefined;

  const mcpBaseUrl = process.env.CM_MCP_BASE_URL?.trim();
  const mcpPath = (process.env.CM_MCP_PATH ?? "/mcp/").trim() || "/mcp/";
  const mcpBearerToken = process.env.CM_MCP_BEARER_TOKEN?.trim();

  const toolArgs: Record<string, Json> = { task };
  if (options.workspace) toolArgs.workspace = options.workspace;
  if (options.top !== undefined) toolArgs.top = options.top;
  if (options.history !== undefined) toolArgs.history = options.history;
  if (options.days !== undefined) toolArgs.days = options.days;
  if (options.logContext) toolArgs.log_context = true;
  if (options.sessionId) toolArgs.session = options.sessionId;

  if (mcpBaseUrl) {
    try {
      const mcpClient = new AgentMailClient({ baseUrl: mcpBaseUrl, path: mcpPath, bearerToken: mcpBearerToken });
      mcpProvenance = { baseUrl: mcpBaseUrl, path: mcpPath, tool: "cm_context", args: toolArgs };
      const toolResult = await mcpClient.toolsCall("cm_context", toolArgs);
      if (isToolError(toolResult)) {
        errors.push(`mcp cm_context: ${JSON.stringify(toolResult)}`);
      } else {
        const payload = extractMcpToolPayload(toolResult);
        if (!payload) {
          errors.push("mcp cm_context: could not parse tool payload");
        } else {
          const parsed = parseCassMemoryContext(payload, task);
          const durationMs = Date.now() - startMs;
          if (parsed.success) {
            return {
              ok: true,
              context: parsed,
              provenance: {
                mode: "mcp",
                startedAt,
                durationMs,
                mcp: mcpProvenance,
                errors,
              },
            };
          }

          mcpContext = parsed;
          errors.push(
            `mcp cm_context: success=false${parsed.error?.message ? ` (${parsed.error.message})` : ""}${parsed.error?.hint ? ` — ${parsed.error.hint}` : ""}`
          );
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`mcp cm_context: ${msg}`);
    }
  }

  const cmPath = Bun.which("cm");
  if (!cmPath) {
    const durationMs = Date.now() - startMs;
    const allErrors = [...errors, "cm not found"];
    if (mcpContext) {
      return { ok: false, context: mcpContext, provenance: { mode: "mcp", startedAt, durationMs, mcp: mcpProvenance, errors: allErrors } };
    }
    return { ok: false, context: null, provenance: { mode: "none", startedAt, durationMs, errors: allErrors } };
  }

  const argv: string[] = [cmPath, "context", task, "--json"];
  if (options.workspace) argv.push("--workspace", options.workspace);
  if (options.top !== undefined) argv.push("--top", String(options.top));
  if (options.history !== undefined) argv.push("--history", String(options.history));
  if (options.days !== undefined) argv.push("--days", String(options.days));
  if (options.logContext) argv.push("--log-context");
  if (options.sessionId) argv.push("--session", options.sessionId);

  try {
    const proc = Bun.spawnSync(argv, { stdout: "pipe", stderr: "pipe" });
    const stdout = proc.stdout.toString();
    const stderr = proc.stderr.toString();
    const exitCode = proc.exitCode ?? 1;

    const durationMs = Date.now() - startMs;

    if (exitCode !== 0) {
      errors.push(`cm context exited ${exitCode}: ${stderr.trim() || "(no stderr)"}`);
      const cli = { argv, exitCode, stderr };
      if (mcpContext) {
        return { ok: false, context: mcpContext, provenance: { mode: "mcp", startedAt, durationMs, mcp: mcpProvenance, cli, errors } };
      }
      return { ok: false, context: null, provenance: { mode: "cli", startedAt, durationMs, cli, errors } };
    }

    let payload: Json;
    try {
      payload = JSON.parse(stdout) as Json;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`cm context returned non-JSON stdout: ${msg}`);
      const cli = { argv, exitCode, stderr };
      if (mcpContext) {
        return { ok: false, context: mcpContext, provenance: { mode: "mcp", startedAt, durationMs, mcp: mcpProvenance, cli, errors } };
      }
      return { ok: false, context: null, provenance: { mode: "cli", startedAt, durationMs, cli, errors } };
    }

    const parsed = parseCassMemoryContext(payload, task);

    if (!parsed.success) {
      errors.push(
        `cm context: success=false${parsed.error?.message ? ` (${parsed.error.message})` : ""}${parsed.error?.hint ? ` — ${parsed.error.hint}` : ""}`
      );
      return {
        ok: false,
        context: parsed,
        provenance: { mode: "cli", startedAt, durationMs, cli: { argv, exitCode, stderr }, errors },
      };
    }

    return {
      ok: true,
      context: parsed,
      provenance: { mode: "cli", startedAt, durationMs, cli: { argv, exitCode, stderr }, errors },
    };
  } catch (e) {
    const durationMs = Date.now() - startMs;
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`cm context spawn error: ${msg}`);
    if (mcpContext) {
      return { ok: false, context: mcpContext, provenance: { mode: "mcp", startedAt, durationMs, mcp: mcpProvenance, errors } };
    }
    return { ok: false, context: null, provenance: { mode: "cli", startedAt, durationMs, errors } };
  }
}

function formatCassMemoryContextForKickoff(result: CassMemoryContextResult): string | null {
  const ctx = result.context;
  if (!ctx) return null;
  if (!ctx.success) return null;

  const hasAny =
    ctx.relevantBullets.length > 0 ||
    ctx.antiPatterns.length > 0 ||
    ctx.suggestedCassQueries.length > 0 ||
    ctx.historySnippets.length > 0;
  if (!hasAny) return null;

  const normalizeLine = (value: string): string => value.replace(/\s+/g, " ").trim();

  const lines: string[] = [];
  lines.push("## MEMORY CONTEXT (cass-memory)");
  lines.push(
    `> Provenance: Generated by cass-memory (${result.provenance.mode}) at ${result.provenance.startedAt}. These are heuristics, not transcript evidence. If anything conflicts with the excerpt, the excerpt wins.`
  );
  lines.push("");

  lines.push("### Relevant rules");
  if (ctx.relevantBullets.length > 0) {
    for (const bullet of ctx.relevantBullets.slice(0, 5)) {
      lines.push(`- ${bullet.id ? `[${bullet.id}] ` : ""}${normalizeLine(bullet.content)}`);
    }
  } else {
    lines.push("- (none returned)");
  }
  lines.push("");

  lines.push("### Known pitfalls / anti-patterns");
  if (ctx.antiPatterns.length > 0) {
    for (const bullet of ctx.antiPatterns.slice(0, 5)) {
      lines.push(`- ${bullet.id ? `[${bullet.id}] ` : ""}${normalizeLine(bullet.content)}`);
    }
  } else {
    lines.push("- (none returned)");
  }

  if (ctx.suggestedCassQueries.length > 0) {
    lines.push("");
    lines.push("### Suggested cass queries");
    for (const query of ctx.suggestedCassQueries.slice(0, 5)) {
      lines.push(`- \`${query}\``);
    }
  }

  if (ctx.historySnippets.length > 0) {
    lines.push("");
    lines.push("### Prior sessions (optional)");
    for (const snippet of ctx.historySnippets.slice(0, 3)) {
      lines.push(`- ${normalizeLine(snippet.snippet)}`);
    }
  }

  return lines.join("\n").trim();
}

function formatDoctorHuman(summary: {
  brenner: BrennerBuildInfo;
  checks: Record<string, DoctorCheck>;
  warnings: string[];
}): string {
  const lines: string[] = [];
  lines.push("Brenner Doctor");
  lines.push("=============");
  lines.push("");
  lines.push(formatBrennerVersionText(summary.brenner));
  lines.push("");

  const order = ["ntm", "cass", "cm", "agentMail"];
  for (const key of order) {
    const check = summary.checks[key];
    if (!check) continue;
    const label = key === "agentMail" ? "agent_mail" : key;
    lines.push(`${label}: ${check.status}${check.path ? ` (${check.path})` : ""}`);
    if (check.verifyCommand) lines.push(`  verify: ${check.verifyCommand}`);
    if (check.notes) lines.push(`  notes: ${check.notes}`);
    if (check.status === "error" && check.stderr) lines.push(`  error: ${check.stderr.trim()}`);
  }

  if (summary.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const w of summary.warnings) lines.push(`- ${w}`);
  }

  return lines.join("\n");
}

function usage(): string {
  return `
Usage:
  ./brenner.ts <command> [args] [--flags]
  ./brenner.ts --version

Commands:
  version
  doctor [--json] [--manifest <path>] [--agent-mail] [--skip-ntm] [--skip-cass] [--skip-cm]
  memory context <task> [--top <n>] [--history <n>] [--days <n>] [--workspace <path>] [--log-context] [--session <id>]
  excerpt build [--sections <A,B>] [--tags <A,B>] [--limit <n>] [--theme <s>] [--ordering <relevance|chronological>]
               [--max-total-words <n>] [--max-quote-words <n>] [--transcript-file <path>] [--quote-bank-file <path>] [--json]
  mail health
  mail tools
  mail agents [--project-key <abs-path>]
  mail send [--project-key <abs-path>] --sender <AgentName> --to <A,B> --subject <s> --body-file <path> [--thread-id <id>] [--ack-required]
  mail inbox [--project-key <abs-path>] --agent <AgentName> [--limit <n>] [--since <iso>] [--urgent-only] [--include-bodies] [--threads]
  mail read [--project-key <abs-path>] --agent <AgentName> --message-id <n>
  mail ack [--project-key <abs-path>] --agent <AgentName> --message-id <n>
  mail thread [--project-key <abs-path>] --thread-id <id> [--include-examples] [--llm]

  toolchain plan [--manifest <path>] [--platform <p>] [--json]

  prompt compose --excerpt-file <path> [--template <path>] [--theme <s>] [--domain <s>] [--question <s>]

  session start [--project-key <abs-path>] --sender <AgentName> --to <A,B> --thread-id <id>
               --excerpt-file <path> --question <s> [--context <s>]
               [--hypotheses <s>] [--constraints <s>] [--outputs <s>]
               [--with-memory] [--unified] [--template <path>] [--theme <s>] [--domain <s>]

  session status [--project-key <abs-path>] --thread-id <id> [--watch] [--timeout <seconds>]

    By default, sends role-specific prompts to each recipient:
      - Codex/GPT → Hypothesis Generator
      - Opus/Claude → Test Designer
      - Gemini → Adversarial Critic

    Use --unified to send the same prompt to all recipients (legacy mode).

Aliases:
  orchestrate start  (alias for: session start)

Config file (JSON):
  --config <path>             optional (or set BRENNER_CONFIG_PATH)
  Default (POSIX)             ~/.config/brenner/config.json (or $XDG_CONFIG_HOME/brenner/config.json)
  Default (Windows)           %APPDATA%\\brenner\\config.json

Agent Mail connection (env):
  AGENT_MAIL_BASE_URL        default: http://127.0.0.1:8765
  AGENT_MAIL_PATH            default: /mcp/
  AGENT_MAIL_BEARER_TOKEN    optional

Cass Memory MCP connection (env):
  CM_MCP_BASE_URL            optional (enables MCP mode; e.g. http://127.0.0.1:3001)
  CM_MCP_PATH                default: /mcp/
  CM_MCP_BEARER_TOKEN        optional

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
  ./brenner.ts doctor --json --skip-ntm --skip-cass --skip-cm
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
  memoryContext?: string;
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
  if (options.memoryContext) {
    chunks.push(options.memoryContext.trim());
    chunks.push("");
  }
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

  const runtimeConfig = resolveBrennerRuntimeConfig(loadBrennerConfig(flags));

  if (top === "doctor") {
    const jsonMode = asBoolFlag(flags, "json");
    const checkAgentMail = asBoolFlag(flags, "agent-mail");
    const manifestPath = asStringFlag(flags, "manifest");

    const skipNtm = asBoolFlag(flags, "skip-ntm");
    const skipCass = asBoolFlag(flags, "skip-cass");
    const skipCm = asBoolFlag(flags, "skip-cm");

    const buildInfo = getBrennerBuildInfo();
    const warnings: string[] = [];

    // Resolve tool checks (default commands if manifest unavailable)
    const defaultVerify: Record<string, string> = {
      ntm: "ntm version",
      cass: "cass health",
      cm: "cm --version",
    };

    let manifestTools: Record<string, { verifyCommand?: string; notes?: string }> | null = null;

    // If a manifest path is provided (or the default exists), prefer it for platform-aware notes/commands.
    const resolvedManifestPath = resolve(manifestPath ?? "specs/toolchain.manifest.json");
    try {
      const rawManifest = readTextFile(resolvedManifestPath);
      const parsed = parseManifest(rawManifest);
      if (!parsed.ok) {
        console.error(parsed.error);
        process.exit(1);
      }
      const platform = detectPlatform() ?? undefined;
      if (!platform) {
        warnings.push(
          `Unsupported platform for toolchain manifest: ${process.platform}/${process.arch}. ` +
            `Falling back to presence-only checks.`
        );
      } else {
        const plan = generateInstallPlan(parsed.manifest, platform);
        manifestTools = {};
        for (const t of plan.targets) {
          manifestTools[t.tool] = { verifyCommand: t.verifyCommand ?? undefined, notes: t.notes ?? undefined };
        }
        for (const skipped of plan.skipped) {
          manifestTools[skipped.tool] = { notes: skipped.reason };
        }
      }
    } catch (e) {
      if (manifestPath) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Failed to read manifest: ${msg}`);
        process.exit(1);
      }
    }

    const checks: Record<string, DoctorCheck> = {};

    const checkTool = (tool: "ntm" | "cass" | "cm", opts: { skip: boolean; required: boolean }): void => {
      const meta = manifestTools?.[tool];
      const verifyCommand = meta?.verifyCommand ?? defaultVerify[tool] ?? null;

      if (opts.skip) {
        checks[tool] = { status: "skipped", path: null, verifyCommand, exitCode: null };
        return;
      }

      const binPath = Bun.which(tool);
      if (!binPath) {
        checks[tool] = {
          status: "missing",
          path: null,
          verifyCommand,
          exitCode: null,
          notes: opts.required ? null : "Optional tool",
        };
        return;
      }

      const result = runCommand(verifyCommand);
      checks[tool] = {
        status: result.exitCode === 0 ? "ok" : "error",
        path: binPath,
        verifyCommand,
        exitCode: result.exitCode,
        ...(result.exitCode === 0 ? {} : { stderr: result.stderr }),
      };
    };

    // Required by default except ntm on Windows.
    const isWindows = process.platform === "win32";
    checkTool("ntm", { skip: skipNtm || isWindows, required: !isWindows });
    checkTool("cass", { skip: skipCass, required: true });
    checkTool("cm", { skip: skipCm, required: true });

    if (checkAgentMail) {
      const baseUrl = runtimeConfig.agentMail.baseUrl;
      const headers: Record<string, string> = {};
      if (runtimeConfig.agentMail.bearerToken) headers.Authorization = `Bearer ${runtimeConfig.agentMail.bearerToken}`;
      try {
        const res = await fetch(`${baseUrl}/health/readiness`, { headers });
        if (res.ok) {
          checks.agentMail = { status: "ok", path: baseUrl, verifyCommand: "GET /health/readiness", exitCode: 0 };
        } else {
          checks.agentMail = {
            status: "error",
            path: baseUrl,
            verifyCommand: "GET /health/readiness",
            exitCode: res.status,
            notes: `HTTP ${res.status}`,
          };
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        checks.agentMail = {
          status: "error",
          path: baseUrl,
          verifyCommand: "GET /health/readiness",
          exitCode: 1,
          notes: msg,
        };
      }
    } else {
      checks.agentMail = { status: "skipped", path: null, verifyCommand: null, exitCode: null };
    }

    const missingRequired = Object.entries(checks).some(([key, check]) => {
      if (key === "agentMail") return false;
      const required = key !== "ntm" || process.platform !== "win32";
      if (!required) return false;
      if (check.status === "skipped") return false;
      return check.status !== "ok";
    });

    const exitCode = missingRequired ? 1 : 0;

    if (jsonMode) {
      const payload = {
        status: exitCode === 0 ? "ok" : "error",
        version: buildInfo.version,
        gitSha: buildInfo.gitSha,
        buildDate: buildInfo.buildDate,
        platformTarget: buildInfo.platformTarget,
        checks,
        warnings,
      };
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log(formatDoctorHuman({ brenner: buildInfo, checks, warnings }));
    }

    process.exit(exitCode);
  }

  if (top === "mail") {
    const client = new AgentMailClient(runtimeConfig.agentMail);
    const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;

    if (sub === "health") {
      // Prefer the FastAPI health endpoint when reachable; fall back to MCP tool.
      const baseUrl = runtimeConfig.agentMail.baseUrl;
      const headers: Record<string, string> = {};
      if (runtimeConfig.agentMail.bearerToken) headers.Authorization = `Bearer ${runtimeConfig.agentMail.bearerToken}`;
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
      const projectSlug = isAbsolute(projectKey)
        ? parseEnsureProjectSlug(await client.toolsCall("ensure_project", { human_key: projectKey }))
        : projectKey;
      if (!projectSlug) throw new Error("Agent Mail ensure_project did not return a project slug.");
      const result = await client.resourcesRead(`resource://agents/${projectSlug}`);
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    if (sub === "send") {
      let sender = asStringFlag(flags, "sender") ?? process.env.AGENT_NAME;
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

      if (isAbsolute(projectKey)) {
        await client.toolsCall("ensure_project", { human_key: projectKey });
      }

      const whoisResult = await client.toolsCall("whois", {
        project_key: projectKey,
        agent_name: sender,
        include_recent_commits: false,
      });

      if (isToolError(whoisResult)) {
        const registerResult = await client.toolsCall("register_agent", {
          project_key: projectKey,
          name: sender,
          program: "brenner-cli",
          model: "orchestrator",
          task_description: threadId ? `Brenner CLI mail send: ${threadId}` : "Brenner CLI mail send",
        });
        const actualName = parseAgentNameFromToolResult(registerResult);
        if (actualName && actualName !== sender) {
          console.error(`Agent Mail assigned sender name "${actualName}" (requested "${sender}").`);
          sender = actualName;
        }
      }

      const result = await client.toolsCall("send_message", {
        project_key: projectKey,
        sender_name: sender,
        to,
        subject,
        body_md: bodyMd,
        thread_id: threadId ?? null,
        ack_required: ackRequired,
      });
      if (isToolError(result)) {
        console.error(JSON.stringify(result, null, 2));
        process.exit(1);
      }
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
          {
            thread_id: string;
            message_ids: number[];
            latest_ts: string | null;
            ack_required_message_count: number;
          }
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
            ack_required_message_count: 0,
          });

          if (messageId !== null) existing.message_ids.push(messageId);
          if (createdTs && (!existing.latest_ts || createdTs > existing.latest_ts)) existing.latest_ts = createdTs;
          if (ackRequired) existing.ack_required_message_count++;
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

  if (top === "excerpt" && sub === "build") {
    const jsonMode = asBoolFlag(flags, "json");

    const transcriptSelectionRaw = asStringFlag(flags, "sections") ?? asStringFlag(flags, "anchors");
    const tagsSelectionRaw = asStringFlag(flags, "tags") ?? asStringFlag(flags, "tag");
    if (!transcriptSelectionRaw && !tagsSelectionRaw) {
      throw new Error("Missing selection. Provide --sections/--anchors or --tags/--tag.");
    }
    if (transcriptSelectionRaw && tagsSelectionRaw) {
      throw new Error("Ambiguous selection. Provide either --sections/--anchors or --tags/--tag (not both).");
    }

    const orderingRaw = asStringFlag(flags, "ordering");
    const ordering = orderingRaw ? (orderingRaw as "relevance" | "chronological") : undefined;
    if (orderingRaw && ordering !== "relevance" && ordering !== "chronological") {
      throw new Error(`Invalid --ordering: expected "relevance" or "chronological", got "${orderingRaw}"`);
    }

    const theme = asStringFlag(flags, "theme");
    const maxTotalWords = asIntFlag(flags, "max-total-words");
    const maxQuoteWords = asIntFlag(flags, "max-quote-words");

    let composed: ComposedExcerpt;

    if (transcriptSelectionRaw) {
      const transcriptPath = resolve(asStringFlag(flags, "transcript-file") ?? "complete_brenner_transcript.md");
      const transcript = parseTranscript(readTextFile(transcriptPath));
      const sections = splitCsv(transcriptSelectionRaw);
      if (sections.length === 0) throw new Error("Missing --sections/--anchors values.");

      composed = buildExcerptFromSections(transcript, sections, {
        theme: theme ?? undefined,
        ordering: ordering ?? undefined,
        maxTotalWords: maxTotalWords ?? undefined,
        maxQuoteWords: maxQuoteWords ?? undefined,
      });
    } else {
      const quoteBankPath = resolve(asStringFlag(flags, "quote-bank-file") ?? "quote_bank_restored_primitives.md");
      const tags = splitCsv(tagsSelectionRaw);
      if (tags.length === 0) throw new Error("Missing --tags/--tag values.");

      const quoteBank = parseQuoteBank(readTextFile(quoteBankPath));
      const maxSections = asIntFlag(flags, "limit") ?? 7;
      if (maxSections <= 0) throw new Error(`Invalid --limit: expected > 0, got ${maxSections}`);

      const selected: ExcerptSection[] = [];
      const seen = new Set<string>();
      let matched = 0;

      for (const quote of quoteBank.quotes) {
        if (!tags.some((tag) => quote.tags.includes(tag))) continue;
        matched++;

        if (selected.length >= maxSections) continue;
        if (seen.has(quote.sectionId)) continue;

        seen.add(quote.sectionId);
        selected.push({
          anchor: quote.sectionId,
          quote: normalizeExcerptQuote(quote.quote, maxQuoteWords ?? 150),
          title: quote.title,
        });
      }

      if (selected.length === 0) {
        throw new Error(`No quotes matched tag(s): ${tags.join(", ")}`);
      }

      composed = composeExcerpt({
        theme: theme ?? (tags.length === 1 ? `Tag: ${tags[0]}` : `Tags: ${tags.join(", ")}`),
        sections: selected,
        ordering: ordering ?? "relevance",
        maxTotalWords: maxTotalWords ?? 800,
      });

      if (matched > selected.length) {
        composed.warnings.push(`Limited to ${selected.length} of ${matched} matching quotes`);
      }
    }

    if (jsonMode) {
      console.log(JSON.stringify(composed, null, 2));
    } else {
      console.log(composed.markdown);
    }

    process.exit(0);
  }

  if (top === "prompt" && sub === "compose") {
    const templatePath = resolve(asStringFlag(flags, "template") ?? runtimeConfig.defaults.template);
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

  if (top === "memory" && sub === "context") {
    const positionalTask = positional.slice(2).join(" ").trim();
    const task = positionalTask || asStringFlag(flags, "task");
    if (!task) throw new Error("Missing task. Usage: ./brenner.ts memory context \"...\" (or --task \"...\").");

    const result = await getCassMemoryContext(task, {
      workspace: asStringFlag(flags, "workspace"),
      top: asIntFlag(flags, "top"),
      history: asIntFlag(flags, "history"),
      days: asIntFlag(flags, "days"),
      logContext: asBoolFlag(flags, "log-context"),
      sessionId: asStringFlag(flags, "session"),
    });

    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  const normalizedTop = top === "orchestrate" ? "session" : top;

  if (normalizedTop === "session" && sub === "start") {
    const client = new AgentMailClient(runtimeConfig.agentMail);
    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);
    let sender = asStringFlag(flags, "sender") ?? process.env.AGENT_NAME;
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
    const withMemory = asBoolFlag(flags, "with-memory");
    let memoryAudit: CassMemoryKickoffAudit = null;

    // Ensure project + sender identity exist
    await client.toolsCall("ensure_project", { human_key: projectKey });
    const registerResult = await client.toolsCall("register_agent", {
      project_key: projectKey,
      name: sender,
      program: "brenner-cli",
      model: "orchestrator",
      task_description: `Brenner Protocol session: ${threadId}`,
    });
    const actualName = parseAgentNameFromToolResult(registerResult);
    if (actualName && actualName !== sender) {
      console.error(`Agent Mail assigned sender name "${actualName}" (requested "${sender}").`);
      sender = actualName;
    }

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

    if (withMemory) {
      const memoryResult = await getCassMemoryContext(question, { workspace: projectKey, top: 5, history: 0 });
      const memoryContext = formatCassMemoryContextForKickoff(memoryResult);
      memoryAudit = {
        enabled: true,
        ok: memoryResult.ok,
        injected: Boolean(memoryContext),
        memoryContext: memoryContext ?? null,
        provenance: memoryResult.provenance,
      };
      if (memoryContext) {
        kickoffConfig.memoryContext = memoryContext;
        console.error(`Injected MEMORY CONTEXT (cass-memory) via ${memoryResult.provenance.mode}.`);
      } else {
        const details = memoryResult.provenance.errors.join("; ");
        console.error(
          `No MEMORY CONTEXT injected (cass-memory ${memoryResult.provenance.mode}${details ? `: ${details}` : ""}).`
        );
      }
    }

    if (unified) {
      // Legacy mode: send same message to all recipients
      const templatePath = resolve(asStringFlag(flags, "template") ?? runtimeConfig.defaults.template);
      const body = composePrompt({
        templatePath,
        excerpt,
        memoryContext: kickoffConfig.memoryContext,
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
      const payload = isRecord(result) ? { ...result, memory: memoryAudit } : { memory: memoryAudit, send: result };
      console.log(JSON.stringify(payload, null, 2));
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

      console.log(JSON.stringify({ memory: memoryAudit, sent: results.length, messages: results }, null, 2));
    }

    process.exit(0);
  }

  if (normalizedTop === "session" && sub === "status") {
    const client = new AgentMailClient(runtimeConfig.agentMail);
    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);
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
