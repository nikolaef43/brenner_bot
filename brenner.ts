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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

// Shared modules from web lib (bundled by Bun)
import { AgentMailClient } from "./apps/web/src/lib/agentMail";
import { buildExcerptFromSections, composeExcerpt, type ComposedExcerpt, type ExcerptSection } from "./apps/web/src/lib/excerpt-builder";
import { CORPUS_DOCS } from "./apps/web/src/lib/corpus";
import { globalSearch, type SearchCategory } from "./apps/web/src/lib/globalSearch";
import type { Json } from "./apps/web/src/lib/json";
import { parseQuoteBank } from "./apps/web/src/lib/quotebank-parser";
import { composeKickoffMessages, type AgentRole, type KickoffConfig } from "./apps/web/src/lib/session-kickoff";
import { parseDeltaMessage, type ValidDelta } from "./apps/web/src/lib/delta-parser";
import {
  createEmptyArtifact,
  formatLintReportHuman,
  formatLintReportJson,
  lintArtifact,
  mergeArtifactWithTimestamps,
  renderArtifactMarkdown,
  type Artifact,
} from "./apps/web/src/lib/artifact-merge";
import {
  computeThreadStatusFromThread,
  extractVersion,
  formatThreadStatusSummary,
  parseSubjectType,
} from "./apps/web/src/lib/threadStatus";
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

function ensureTrailingNewline(text: string): string {
  return text.endsWith("\n") ? text : `${text}\n`;
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
    if (token === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }
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

const VALID_ROSTER_ROLES: AgentRole[] = ["hypothesis_generator", "test_designer", "adversarial_critic"];

function parseRoleMapFlag(value: string): Record<string, AgentRole> {
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    throw new Error(
      `Invalid --role-map: expected "Name=role,Name=role" (roles: ${VALID_ROSTER_ROLES.join(", ")})`
    );
  }

  const out: Record<string, AgentRole> = {};
  const seen = new Map<string, string>();

  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) throw new Error(`Invalid --role-map entry "${part}": expected "Name=role"`);

    const name = part.slice(0, eq).trim();
    const roleRaw = part.slice(eq + 1).trim();

    if (!name) throw new Error(`Invalid --role-map entry "${part}": missing agent name`);
    if (!roleRaw) throw new Error(`Invalid --role-map entry "${part}": missing role`);

    const normalizedName = name.toLowerCase();
    const previous = seen.get(normalizedName);
    if (previous) {
      throw new Error(`Invalid --role-map: duplicate mapping for "${name}" (also provided for "${previous}")`);
    }
    seen.set(normalizedName, name);

    if (!VALID_ROSTER_ROLES.includes(roleRaw as AgentRole)) {
      throw new Error(
        `Invalid --role-map role for "${name}": "${roleRaw}". Expected one of: ${VALID_ROSTER_ROLES.join(", ")}`
      );
    }

    out[name] = roleRaw as AgentRole;
  }

  return out;
}

function readTextFile(path: string): string {
  return readFileSync(path, "utf8");
}

function parseArtifactFromJsonFile(path: string): Artifact {
  let parsed: Json;
  try {
    parsed = JSON.parse(readTextFile(path)) as Json;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse artifact JSON at ${path}: ${msg}`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`Artifact JSON must be an object: ${path}`);
  }

  return parsed as unknown as Artifact;
}

function stdoutLine(message: string): void {
  process.stdout.write(ensureTrailingNewline(message));
}

function stderrLine(message: string): void {
  process.stderr.write(ensureTrailingNewline(message));
}

const sanitizeThreadIdForArtifactFilename = (threadId: string): string => {
  const trimmed = threadId.trim();
  const withoutSeparators = trimmed.replace(/[\\/]+/g, "-");
  const withoutUnsafe = withoutSeparators.replace(/[^A-Za-z0-9._-]+/g, "-");
  const collapsedDashes = withoutUnsafe.replace(/-+/g, "-");
  const strippedEdges = collapsedDashes.replace(/^[-.]+|[-.]+$/g, "");
  return strippedEdges || "thread";
};

function formatUtcTimestampForFilename(date: Date): string {
  // YYYYMMDDTHHMMSSZ (UTC)
  const iso = date.toISOString(); // e.g. 2025-12-31T04:03:31.119Z
  const head = iso.slice(0, 19); // 2025-12-31T04:03:31
  return head.replace(/[-:]/g, "") + "Z";
}

type ExperimentResultV01 = {
  schema_version: "experiment_result_v0.1";
  result_id: string;
  capture_mode: "run" | "record";
  thread_id: string;
  test_id: string;

  created_at: string;
  cwd: string;
  argv: string[] | null;

  timeout_seconds: number | null;
  timed_out: boolean;

  exit_code: number;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;

  stdout: string;
  stderr: string;

  git?: {
    sha: string;
    dirty: boolean;
    status_porcelain: string[];
  };

  runtime: {
    platform: string;
    arch: string;
    bun_version: string;
  };
};

// ============================================================================
// Evidence Pack Types (v0.1)
// ============================================================================

type EvidenceType =
  | "paper"
  | "preprint"
  | "dataset"
  | "experiment"
  | "observation"
  | "prior_session"
  | "expert_opinion"
  | "code_artifact";

type EvidenceExcerpt = {
  anchor: string; // E1, E2, etc.
  text: string;
  verbatim: boolean;
  location?: string;
  note?: string;
};

type EvidenceRecord = {
  id: string; // EV-001, EV-002, etc.
  type: EvidenceType;
  title: string;
  authors?: string[];
  date?: string;
  source: string;
  access_method: "url" | "doi" | "file" | "session" | "manual";
  imported_at: string;
  imported_by: string;
  relevance: string;
  key_findings: string[];
  supports?: string[];
  refutes?: string[];
  informs?: string[];
  verified: boolean;
  verification_notes?: string;
  excerpts: EvidenceExcerpt[];
};

type EvidencePack = {
  version: "0.1";
  thread_id: string;
  created_at: string;
  updated_at: string;
  next_id: number;
  records: EvidenceRecord[];
};

function bestEffortGitProvenance(cwd: string):
  | {
      sha: string;
      dirty: boolean;
      status_porcelain: string[];
    }
  | null {
  const gitPath = Bun.which("git");
  if (!gitPath) return null;

  try {
    const rev = Bun.spawnSync([gitPath, "rev-parse", "HEAD"], { cwd, stdout: "pipe", stderr: "pipe" });
    if (rev.exitCode !== 0) return null;
    const sha = rev.stdout.toString().trim();
    if (!sha) return null;

    const status = Bun.spawnSync([gitPath, "status", "--porcelain"], { cwd, stdout: "pipe", stderr: "pipe" });
    if (status.exitCode !== 0) return null;
    const statusLines = status.stdout
      .toString()
      .split("\n")
      .map((s) => s.trimEnd())
      .filter(Boolean);

    return { sha, dirty: statusLines.length > 0, status_porcelain: statusLines };
  } catch {
    return null;
  }
}

async function withWorkingDirectory<T>(cwd: string, fn: () => Promise<T>): Promise<T> {
  const previous = process.cwd();
  process.chdir(cwd);
  try {
    return await fn();
  } finally {
    process.chdir(previous);
  }
}

function resolveWebAppCwd(projectKey: string): string {
  const absoluteProjectKey = resolve(projectKey);

  const webAppMarkerFiles = ["package.json", "next.config.ts"];
  if (webAppMarkerFiles.every((f) => existsSync(join(absoluteProjectKey, f)))) return absoluteProjectKey;

  let cursor = absoluteProjectKey;
  while (true) {
    const repoRootCandidate = resolve(cursor, "apps", "web");
    if (existsSync(join(repoRootCandidate, "package.json"))) return repoRootCandidate;

    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }

  throw new Error(
    `Could not locate apps/web from project key: ${absoluteProjectKey}\n` +
      `Expected either:\n` +
      `- A repo root (or subdir) containing apps/web/package.json\n` +
      `- The web app root itself (apps/web) containing: ${webAppMarkerFiles.join(", ")}`
  );
}

function normalizePublicBaseUrl(value: string, envName: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${envName} must be an absolute http(s) URL (got "${value}")`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${envName} must be an absolute http(s) URL (got "${value}")`);
  }

  url.pathname = "";
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

function getCliPublicBaseUrl(): string {
  const explicit = process.env.BRENNER_PUBLIC_BASE_URL?.trim();
  if (explicit) return normalizePublicBaseUrl(explicit, "BRENNER_PUBLIC_BASE_URL");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  if (process.env.NODE_ENV === "development") return "http://localhost:3000";

  return "https://brennerbot.org";
}

function toAbsoluteUrl(url: string, baseUrl: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!trimmed.startsWith("/")) return trimmed;

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return `${baseUrl.replace(/\/$/, "")}${trimmed}`;
  }
}

function singleLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
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
      const merged: { projectKey?: string; template?: string } = {};
      if (projectKey) merged.projectKey = projectKey;
      if (template) merged.template = template;
      out.defaults = merged;
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

  try {
    const raw = readTextFile(path);
    return { path, config: parseBrennerConfigJson(raw, path) };
  } catch (e) {
    if (explicit) throw e;

    const msg = e instanceof Error ? e.message : String(e);
    stderrLine(`Warning: ignoring invalid config at ${path}: ${msg}`);
    return { path: null, config: {} };
  }
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

  let error: { code?: string; message?: string; hint?: string; retryable?: boolean } | null = null;
  if (!success) {
    const err: { code?: string; message?: string; hint?: string; retryable?: boolean } = {};
    if (typeof raw.code === "string") err.code = raw.code;
    if (typeof raw.error === "string") err.message = raw.error;
    if (typeof raw.hint === "string") err.hint = raw.hint;
    if (typeof raw.retryable === "boolean") err.retryable = raw.retryable;
    error = err;
  }

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
          let detail = "";
          if (parsed.error?.message) detail += ` (${parsed.error.message})`;
          if (parsed.error?.hint) detail += ` — ${parsed.error.hint}`;
          errors.push(`mcp cm_context: success=false${detail}`);
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
      let detail = "";
      if (parsed.error?.message) detail += ` (${parsed.error.message})`;
      if (parsed.error?.hint) detail += ` — ${parsed.error.hint}`;
      errors.push(`cm context: success=false${detail}`);
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
  doctor [--json] [--manifest <path>] [--agent-mail] [--skip-ntm] [--skip-cass] [--skip-cm] [--skip-agents]
  upgrade [--version <ver>]
  memory context <task> [--top <n>] [--history <n>] [--days <n>] [--workspace <path>] [--log-context] [--session <id>]
  excerpt build [--sections <A,B>] [--tags <A,B>] [--limit <n>] [--theme <s>] [--ordering <relevance|chronological>]
               [--max-total-words <n>] [--max-quote-words <n>] [--transcript-file <path>] [--quote-bank-file <path>] [--json]
  corpus search <query> [--limit <n>] [--docs <A,B>] [--category <s>] [--model <s>] [--project-key <abs-path>] [--json]
  experiment run --thread-id <id> --test-id <id> [--timeout <seconds>] [--cwd <path>] [--out-file <path>] [--json] -- <cmd> [args...]
  experiment record --thread-id <id> --test-id <id> --exit-code <n>
                   [--stdout-file <path>] [--stderr-file <path>] [--stdout <text>] [--stderr <text>]
                   [--cwd <path>] [--command <s>] [--out-file <path>] [--json]
  experiment encode --result-file <path> [--out-file <path>] [--project-key <abs-path>] [--json]
  experiment post --result-file <path> --sender <AgentName> --to <A,B> [--project-key <abs-path>] [--json]

  evidence init --thread-id <id> [--project-key <abs-path>]
  evidence add --thread-id <id> --type <type> --title <s> --source <s> [--relevance <s>]
              [--supports <H1,H2>] [--refutes <H3>] [--informs <T1>] [--project-key <abs-path>] [--json]
  evidence add-excerpt --thread-id <id> --evidence-id <EV-NNN> --text <s>
              [--verbatim] [--location <s>] [--note <s>] [--project-key <abs-path>] [--json]
  evidence list --thread-id <id> [--project-key <abs-path>] [--json]
  evidence render --thread-id <id> [--project-key <abs-path>] [--out-file <path>]
  evidence verify --thread-id <id> --evidence-id <EV-NNN> --notes <s> [--project-key <abs-path>] [--json]

  mail health
  mail tools
  mail agents [--project-key <abs-path>]
  mail send [--project-key <abs-path>] [--sender <AgentName>] --to <A,B> --subject <s> --body-file <path> [--thread-id <id>] [--ack-required]
  mail inbox [--project-key <abs-path>] [--agent <AgentName>] [--limit <n>] [--since <iso>] [--urgent-only] [--include-bodies] [--threads] [--summaries]
  mail read [--project-key <abs-path>] [--agent <AgentName>] --message-id <n>
  mail ack [--project-key <abs-path>] [--agent <AgentName>] --message-id <n>
  mail thread [--project-key <abs-path>] --thread-id <id> [--include-examples] [--llm]

  toolchain plan [--manifest <path>] [--platform <p>] [--json]
  lint <artifact.json> [--json]

  prompt compose --excerpt-file <path> [--template <path>] [--theme <s>] [--domain <s>] [--question <s>]

  cockpit start [--project-key <abs-path>] --thread-id <id> --sender <AgentName> --to <A,B>
               --excerpt-file <path> --question <s> [--context <s>]
               [--hypotheses <s>] [--constraints <s>] [--outputs <s>] [--role-map <s>] [--with-memory]
               [--ntm-args <s>] [--skip-ntm] [--skip-broadcast] [--broadcast-message <s>] [--dry-run] [--json]

  session start [--project-key <abs-path>] [--sender <AgentName>] --to <A,B> --thread-id <id>
               --excerpt-file <path> --question <s> [--context <s>]
               [--hypotheses <s>] [--constraints <s>] [--outputs <s>]
               [--role-map <s>] [--with-memory] [--unified] [--template <path>] [--theme <s>] [--domain <s>]

  session status [--project-key <abs-path>] --thread-id <id> [--watch] [--timeout <seconds>]
  session compile [--project-key <abs-path>] --thread-id <id> [--out-file <path>] [--json]
  session write [--project-key <abs-path>] --thread-id <id> [--out-file <path>] [--json]
  session publish [--project-key <abs-path>] --thread-id <id> [--sender <AgentName>] --to <A,B>
                [--subject <s>] [--ack-required] [--json]

    By default, sends role-specific prompts to each recipient using name heuristics:
      - Codex/GPT → Hypothesis Generator
      - Opus/Claude → Test Designer
      - Gemini → Adversarial Critic

    Use --unified to send the same prompt to all recipients (legacy mode).
    For real Agent Mail identities (e.g. BlueLake), pass an explicit roster:
      --role-map "BlueLake=hypothesis_generator,PurpleMountain=test_designer,RedForest=adversarial_critic"

Aliases:
  orchestrate start  (alias for: session start)

Config file (JSON):
  --config <path>             optional (or set BRENNER_CONFIG_PATH)
  Precedence                  flags > env > config > defaults
  Default (POSIX)             ~/.config/brenner/config.json (or $XDG_CONFIG_HOME/brenner/config.json)
  Default (Windows)           %APPDATA%\\brenner\\config.json

Agent identity (env):
  AGENT_NAME                 optional (default for --sender / --agent)

Agent Mail connection (env):
  AGENT_MAIL_BASE_URL        default: http://127.0.0.1:8765
  AGENT_MAIL_PATH            default: /mcp/
  AGENT_MAIL_BEARER_TOKEN    optional

Cass Memory MCP connection (env):
  CM_MCP_BASE_URL            optional (enables MCP mode; e.g. http://127.0.0.1:3001)
  CM_MCP_PATH                default: /mcp/
  CM_MCP_BEARER_TOKEN        optional

Corpus fetch (env):
  BRENNER_PUBLIC_BASE_URL    optional (absolute http(s) URL; default: auto)

Build metadata (for --version):
  BRENNER_VERSION            optional (prefer semver, e.g. 0.1.0)
  BRENNER_GIT_SHA            optional
  BRENNER_BUILD_DATE         optional (ISO 8601)
  BRENNER_TARGET             optional (e.g. linux-x64)

Examples:
  ./brenner.ts --version
  ./brenner.ts doctor --agent-mail

  export AGENT_NAME=GreenCastle

  # Build an excerpt (stdout -> file)
  ./brenner.ts excerpt build --sections "§12,§13" --ordering chronological > excerpt.md

  # Upgrade (prints canonical installer commands)
  ./brenner.ts upgrade

  # Search corpus (ranked hits with anchors + snippets)
  ./brenner.ts corpus search "ribosome" --docs transcript --limit 5

  # Capture an experiment run
  ./brenner.ts experiment run --thread-id RS-20251231-example --test-id T1 --timeout 60 -- bash -lc "echo hi; echo err 1>&2; exit 3"

  # Start a session (role-specific prompts) + watch status
  ./brenner.ts session start --project-key "$PWD" --to PurplePond,PurpleCat \\
    --thread-id RS-20251230-example --excerpt-file excerpt.md --question "..." --with-memory
  ./brenner.ts session status --project-key "$PWD" --thread-id RS-20251230-example --watch

  # One-command: spawn ntm + send role-specific kickoff + broadcast "check mail"
  ./brenner.ts cockpit start --project-key "$PWD" --thread-id RS-20251230-example --sender FuchsiaDog \\
    --to BlueLake,PurpleMountain,RedForest \\
    --role-map "BlueLake=hypothesis_generator,PurpleMountain=test_designer,RedForest=adversarial_critic" \\
    --excerpt-file excerpt.md --question "..."

  # Work the inbox (threads -> read -> ack)
  ./brenner.ts mail inbox --project-key "$PWD" --threads
  ./brenner.ts mail read --project-key "$PWD" --message-id 123
  ./brenner.ts mail ack --project-key "$PWD" --message-id 123

  # Send a message (markdown file -> Agent Mail)
  ./brenner.ts mail send --project-key "$PWD" --to PurplePond \\
    --subject "FYI: ..." --body-file message.md --thread-id COORD-20251230-team
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

type CompileSessionResult =
  | {
      ok: true;
      threadId: string;
      version: number;
      markdown: string;
      lint: ReturnType<typeof lintArtifact>;
      merge: {
        applied: number;
        skipped: number;
        warnings: Json[];
      };
      deltas: {
        total_blocks: number;
        valid: number;
        invalid: number;
      };
      invalid_deltas: Array<{ message_id: number; subject: string; error: string }>;
    }
  | {
      ok: false;
      threadId: string;
      errors: Json[];
      warnings: Json[];
      merge: { applied: number; skipped: number };
      deltas: {
        total_blocks: number;
        valid: number;
        invalid: number;
      };
      invalid_deltas: Array<{ message_id: number; subject: string; error: string }>;
    };

function computeNextCompiledVersion(messages: Array<{ subject: string }>): number {
  let maxVersion = 0;
  let compiledCount = 0;

  for (const message of messages) {
    const type = parseSubjectType(message.subject).type;
    if (type !== "compiled") continue;
    compiledCount++;

    const parsed = extractVersion(message.subject);
    if (typeof parsed === "number" && parsed > maxVersion) maxVersion = parsed;
  }

  return Math.max(maxVersion, compiledCount) + 1;
}

async function compileSessionArtifact(args: {
  client: AgentMailClient;
  projectKey: string;
  threadId: string;
}): Promise<CompileSessionResult> {
  if (isAbsolute(args.projectKey)) {
    await args.client.toolsCall("ensure_project", { human_key: args.projectKey });
  }

  const thread = await args.client.readThread({ projectKey: args.projectKey, threadId: args.threadId, includeBodies: true });
  const version = computeNextCompiledVersion(thread.messages);

  const base = createEmptyArtifact(args.threadId);
  base.metadata.version = Math.max(0, version - 1);
  base.metadata.status = "active";

  const mergedDeltas: Array<ValidDelta & { timestamp: string; agent: string }> = [];
  const invalidDeltas: Array<{ message_id: number; subject: string; error: string }> = [];

  let totalBlocks = 0;
  let validCount = 0;
  let invalidCount = 0;

  for (const message of thread.messages) {
    if (typeof message.body_md !== "string" || message.body_md.trim().length === 0) continue;
    const parsed = parseDeltaMessage(message.body_md);
    totalBlocks += parsed.totalBlocks;
    validCount += parsed.validCount;
    invalidCount += parsed.invalidCount;

    for (const delta of parsed.deltas) {
      if (delta.valid) {
        mergedDeltas.push({
          ...delta,
          timestamp: message.created_ts,
          agent: message.from ?? "unknown",
        });
        continue;
      }

      invalidDeltas.push({
        message_id: message.id,
        subject: message.subject,
        error: delta.error,
      });
    }
  }

  const mergeResult = mergeArtifactWithTimestamps(base, mergedDeltas);
  if (!mergeResult.ok) {
    return {
      ok: false,
      threadId: args.threadId,
      errors: mergeResult.errors as unknown as Json[],
      warnings: mergeResult.warnings as unknown as Json[],
      merge: { applied: mergeResult.applied_count, skipped: mergeResult.skipped_count },
      deltas: { total_blocks: totalBlocks, valid: validCount, invalid: invalidCount },
      invalid_deltas: invalidDeltas,
    };
  }

  const lint = lintArtifact(mergeResult.artifact);
  const markdown = renderArtifactMarkdown(mergeResult.artifact);

  return {
    ok: true,
    threadId: args.threadId,
    version: mergeResult.artifact.metadata.version,
    markdown,
    lint,
    merge: {
      applied: mergeResult.applied_count,
      skipped: mergeResult.skipped_count,
      warnings: mergeResult.warnings as unknown as Json[],
    },
    deltas: { total_blocks: totalBlocks, valid: validCount, invalid: invalidCount },
    invalid_deltas: invalidDeltas,
  };
}

async function main(): Promise<void> {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [top, sub, action] = positional;

  if (asBoolFlag(flags, "version")) {
    stdoutLine(formatBrennerVersionText(getBrennerBuildInfo()));
    process.exit(0);
  }

  if (!top || asBoolFlag(flags, "help") || top === "help" || top === "-h") {
    stdoutLine(usage());
    process.exit(0);
  }

  if (top === "version") {
    stdoutLine(formatBrennerVersionText(getBrennerBuildInfo()));
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
    const skipAgents = asBoolFlag(flags, "skip-agents");

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
        stderrLine(parsed.error);
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
        stderrLine(`Failed to read manifest: ${msg}`);
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

    // Agent CLI checks (optional - presence only)
    // Each agent may have multiple binary names depending on installation method
    const agentCliBinaries: Record<string, string[]> = {
      claude: ["claude", "claude-code"],
      codex: ["codex", "codex-cli"],
      gemini: ["gemini", "gemini-cli"],
    };

    const checkAgentCli = (name: string, binaries: string[]): void => {
      if (skipAgents) {
        checks[name] = { status: "skipped", path: null, verifyCommand: null, exitCode: null };
        return;
      }

      // Try each binary name until one is found
      for (const bin of binaries) {
        const binPath = Bun.which(bin);
        if (binPath) {
          checks[name] = {
            status: "ok",
            path: binPath,
            verifyCommand: `${bin} --version`,
            exitCode: 0,
            notes: `Found as '${bin}'`,
          };
          return;
        }
      }

      // None found
      checks[name] = {
        status: "missing",
        path: null,
        verifyCommand: null,
        exitCode: null,
        notes: `Optional. Tried: ${binaries.join(", ")}`,
      };
    };

    for (const [name, binaries] of Object.entries(agentCliBinaries)) {
      checkAgentCli(name, binaries);
    }

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
      stdoutLine(JSON.stringify(payload, null, 2));
    } else {
      stdoutLine(formatDoctorHuman({ brenner: buildInfo, checks, warnings }));
    }

    process.exit(exitCode);
  }

  if (top === "upgrade") {
    const rawRequestedVersion = asStringFlag(flags, "version")?.trim() ?? null;
    const requestedSemver = rawRequestedVersion ? normalizeSemverTag(rawRequestedVersion) : null;
    let requestedVersion = requestedSemver ?? rawRequestedVersion?.replace(/^v/, "") ?? null;
    if (requestedVersion) {
      const lowered = requestedVersion.toLowerCase();
      if (lowered === "latest" || lowered === "main" || lowered === "master") requestedVersion = null;
    }

    const buildInfo = getBrennerBuildInfo();
    const currentSemver = normalizeSemverTag(buildInfo.version);

    const owner = "Dicklesworthstone";
    const repo = "brenner_bot";

    const suggestableCurrentVersion = currentSemver && !currentSemver.includes("dev") ? currentSemver : null;
    const versionExample = requestedVersion ?? suggestableCurrentVersion;
    const versionExampleSuffix = versionExample ? "" : " # example";
    const resolvedVersionForDisplay = versionExample ?? "0.1.0";

    const lines: string[] = [];
    lines.push("Brenner Upgrade");
    lines.push("==============");
    lines.push("");
    lines.push("This command does not modify your system.");
    lines.push("It prints the canonical installer commands so you can review and run them.");
    if (buildInfo.version) lines.push(`Installed brenner version: ${buildInfo.version}`);
    lines.push("");
    lines.push("Pinned release (recommended):");
    lines.push(`  export VERSION="${resolvedVersionForDisplay}"${versionExampleSuffix}`);
    lines.push(
      `  curl -fsSL "https://raw.githubusercontent.com/${owner}/${repo}/v\${VERSION}/install.sh" | bash -s -- --version "\${VERSION}" --easy-mode --verify`
    );
    lines.push("");
    lines.push("Latest from main (not pinned):");
    lines.push(
      `  curl -fsSL "https://raw.githubusercontent.com/${owner}/${repo}/main/install.sh" | bash -s -- --easy-mode --verify`
    );
    lines.push("");
    lines.push("Windows (PowerShell):");
    lines.push(`  $Version = "${resolvedVersionForDisplay}"${versionExampleSuffix}`);
    lines.push(
      `  iwr "https://raw.githubusercontent.com/${owner}/${repo}/v$Version/install.ps1" -OutFile install.ps1`
    );
    lines.push(`  pwsh -ExecutionPolicy Bypass -File .\\install.ps1 -Version $Version -EasyMode -Verify`);
    lines.push("");
    lines.push("Notes:");
    lines.push("- Default install destination is `~/.local/bin` (or override with `--dest <path>` in the installer).");
    lines.push("- Remove `--easy-mode` if you do not want PATH changes.");
    lines.push("- Remove `--verify` if you only want installation (not recommended).");

    stdoutLine(lines.join("\n"));
    process.exit(0);
  }

  if (top === "experiment") {
    const jsonMode = asBoolFlag(flags, "json");

    // Handle encode subcommand separately (thread-id and test-id come from result file)
    if (sub === "encode") {
      const resultFilePath = asStringFlag(flags, "result-file");
      if (!resultFilePath) throw new Error("Missing --result-file.");

      const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
      const resolvedResultFile = resolve(projectKey, resultFilePath);

      // Read and parse the result file
      let resultJson: string;
      try {
        resultJson = readTextFile(resolvedResultFile);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Cannot read result file "${resolvedResultFile}": ${msg}`);
      }

      let result: ExperimentResultV01;
      try {
        result = JSON.parse(resultJson) as ExperimentResultV01;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Invalid JSON in result file: ${msg}`);
      }

      // Validate required fields
      if (!result.result_id) throw new Error("Result file missing required field: result_id");
      if (!result.test_id) throw new Error("Result file missing required field: test_id");
      if (!result.thread_id) throw new Error("Result file missing required field: thread_id");
      if (typeof result.exit_code !== "number") throw new Error("Result file missing required field: exit_code");
      if (typeof result.timed_out !== "boolean") throw new Error("Result file missing required field: timed_out");

      // Compute relative path for result_path (relative to project key)
      const resultPath = resultFilePath.startsWith("/")
        ? resultFilePath.replace(projectKey + "/", "")
        : resultFilePath;

      // Determine status based on exit code and timeout
      let status: "passed" | "failed" | "blocked";
      if (result.timed_out) {
        status = "blocked";
      } else if (result.exit_code === 0) {
        status = "passed";
      } else {
        status = "failed";
      }

      // Generate summary
      let summary: string;
      if (result.timed_out) {
        const timeoutSec = result.timeout_seconds ?? "unknown";
        summary = `Test blocked: timed out after ${timeoutSec}s`;
      } else if (result.duration_ms != null) {
        const durationSec = (result.duration_ms / 1000).toFixed(1);
        summary = `Test completed: exit ${result.exit_code} in ${durationSec}s`;
      } else {
        summary = `Test completed: exit ${result.exit_code}`;
      }

      // Build the DELTA object
      const delta = {
        operation: "EDIT",
        section: "discriminative_tests",
        target_id: result.test_id,
        payload: {
          test_id: result.test_id,
          last_run: {
            result_id: result.result_id,
            result_path: resultPath,
            run_at: result.started_at ?? result.created_at,
            exit_code: result.exit_code,
            timed_out: result.timed_out,
            ...(result.duration_ms != null ? { duration_ms: result.duration_ms } : {}),
            summary,
          },
          status,
        },
        rationale: `Recording result of experiment run ${result.result_id.slice(0, 8)} for ${result.test_id}`,
      };

      // Build markdown output
      const markdown = `## Deltas

Recording experiment result for test **${result.test_id}** in thread \`${result.thread_id}\`.

- **Status**: ${status}
- **Exit code**: ${result.exit_code}
- **Result file**: \`${resultPath}\`

\`\`\`delta
${JSON.stringify(delta, null, 2)}
\`\`\`
`;

      // Output
      const outFileRaw = asStringFlag(flags, "out-file");
      if (outFileRaw) {
        const outFile = resolve(projectKey, outFileRaw);
        mkdirSync(dirname(outFile), { recursive: true });
        writeFileSync(outFile, markdown, "utf8");
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: true, out_file: outFile, delta }, null, 2));
        } else {
          stdoutLine(outFile);
        }
      } else {
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: true, delta, markdown }, null, 2));
        } else {
          stdoutLine(markdown);
        }
      }

      process.exit(0);
    }

    // Handle post subcommand (encode + send in one step)
    if (sub === "post") {
      // Validate required flags first (fail fast, before file I/O)
      const resultFilePath = asStringFlag(flags, "result-file");
      if (!resultFilePath) throw new Error("Missing --result-file.");

      let sender = asStringFlag(flags, "sender") ?? process.env.AGENT_NAME;
      if (!sender) throw new Error("Missing --sender (or set AGENT_NAME).");
      const to = splitCsv(asStringFlag(flags, "to"));
      if (to.length === 0) throw new Error("Missing --to <A,B>.");

      const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
      const resolvedResultFile = resolve(projectKey, resultFilePath);

      // Read and parse the result file
      let resultJson: string;
      try {
        resultJson = readTextFile(resolvedResultFile);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Cannot read result file "${resolvedResultFile}": ${msg}`);
      }

      let result: ExperimentResultV01;
      try {
        result = JSON.parse(resultJson) as ExperimentResultV01;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Invalid JSON in result file: ${msg}`);
      }

      // Validate required fields
      if (!result.result_id) throw new Error("Result file missing required field: result_id");
      if (!result.test_id) throw new Error("Result file missing required field: test_id");
      if (!result.thread_id) throw new Error("Result file missing required field: thread_id");
      if (typeof result.exit_code !== "number") throw new Error("Result file missing required field: exit_code");
      if (typeof result.timed_out !== "boolean") throw new Error("Result file missing required field: timed_out");

      // Compute relative path for result_path (relative to project key)
      const resultPath = resultFilePath.startsWith("/")
        ? resultFilePath.replace(projectKey + "/", "")
        : resultFilePath;

      // Determine status based on exit code and timeout
      let status: "passed" | "failed" | "blocked";
      if (result.timed_out) {
        status = "blocked";
      } else if (result.exit_code === 0) {
        status = "passed";
      } else {
        status = "failed";
      }

      // Generate summary
      let summary: string;
      if (result.timed_out) {
        const timeoutSec = result.timeout_seconds ?? "unknown";
        summary = `Test blocked: timed out after ${timeoutSec}s`;
      } else if (result.duration_ms != null) {
        const durationSec = (result.duration_ms / 1000).toFixed(1);
        summary = `Test completed: exit ${result.exit_code} in ${durationSec}s`;
      } else {
        summary = `Test completed: exit ${result.exit_code}`;
      }

      // Build the DELTA object
      const delta = {
        operation: "EDIT",
        section: "discriminative_tests",
        target_id: result.test_id,
        payload: {
          test_id: result.test_id,
          last_run: {
            result_id: result.result_id,
            result_path: resultPath,
            run_at: result.started_at ?? result.created_at,
            exit_code: result.exit_code,
            timed_out: result.timed_out,
            ...(result.duration_ms != null ? { duration_ms: result.duration_ms } : {}),
            summary,
          },
          status,
        },
        rationale: `Recording result of experiment run ${result.result_id.slice(0, 8)} for ${result.test_id}`,
      };

      // Build markdown body
      const bodyMd = `## Deltas

Recording experiment result for test **${result.test_id}** in thread \`${result.thread_id}\`.

- **Status**: ${status}
- **Exit code**: ${result.exit_code}
- **Result file**: \`${resultPath}\`

\`\`\`delta
${JSON.stringify(delta, null, 2)}
\`\`\`
`;

      // Send via Agent Mail
      const client = new AgentMailClient(runtimeConfig.agentMail);

      if (isAbsolute(projectKey)) {
        await client.toolsCall("ensure_project", { human_key: projectKey });
      }

      // Check if sender exists, register if needed
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
          task_description: `Brenner CLI experiment post: ${result.thread_id}`,
        });
        const actualName = parseAgentNameFromToolResult(registerResult);
        if (actualName && actualName !== sender) {
          stderrLine(`Agent Mail assigned sender name "${actualName}" (requested "${sender}").`);
          sender = actualName;
        }
      }

      // Build subject
      const subject = `DELTA[results]: ${result.test_id} ${status}`;

      // Send the message
      const sendResult = await client.toolsCall("send_message", {
        project_key: projectKey,
        sender_name: sender,
        to,
        subject,
        body_md: bodyMd,
        thread_id: result.thread_id,
        ack_required: false,
      });

      if (isToolError(sendResult)) {
        stderrLine(`Error sending message: ${JSON.stringify(sendResult, null, 2)}`);
        process.exit(1);
      }

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, delta, message: sendResult }, null, 2));
      } else {
        stdoutLine(`Sent DELTA message to thread ${result.thread_id}`);
        stdoutLine(`Subject: ${subject}`);
        stdoutLine(`To: ${to.join(", ")}`);
      }

      process.exit(0);
    }

    // For run and record, thread-id and test-id are required
    const threadId = asStringFlag(flags, "thread-id");
    const testId = asStringFlag(flags, "test-id");
    if (!threadId) throw new Error("Missing --thread-id.");
    if (!testId) throw new Error("Missing --test-id.");

    const cwd = resolve(asStringFlag(flags, "cwd") ?? runtimeConfig.defaults.projectKey);
    const outFileRaw = asStringFlag(flags, "out-file") ?? asStringFlag(flags, "out");

    const safeThreadId = sanitizeThreadIdForArtifactFilename(threadId);
    const safeTestId = sanitizeThreadIdForArtifactFilename(testId);
    if (!outFileRaw && safeThreadId !== threadId) {
      stderrLine(`Warning: sanitized thread id for experiment path: "${threadId}" -> "${safeThreadId}"`);
    }
    if (!outFileRaw && safeTestId !== testId) {
      stderrLine(`Warning: sanitized test id for experiment path: "${testId}" -> "${safeTestId}"`);
    }

    const resultId = randomUUID();
    const createdAt = new Date();
    const timestamp = formatUtcTimestampForFilename(createdAt);
    const defaultOutFile = join(
      cwd,
      "artifacts",
      safeThreadId,
      "experiments",
      safeTestId,
      `${timestamp}_${resultId}.json`
    );
    const outFile = outFileRaw ? resolve(cwd, outFileRaw) : defaultOutFile;

    if (sub === "run") {
      const timeoutSeconds = asIntFlag(flags, "timeout") ?? 900;
      if (timeoutSeconds <= 0) throw new Error("Invalid --timeout: must be > 0.");

      const rawArgv = process.argv.slice(2);
      const sepIndex = rawArgv.indexOf("--");
      if (sepIndex === -1) throw new Error('Missing "--" separator before command.');
      const commandArgv = rawArgv.slice(sepIndex + 1);
      if (commandArgv.length === 0) throw new Error('Missing command after "--".');

      const startedAt = createdAt;
      let timedOut = false;
      let stdout = "";
      let stderr = "";

      const proc = Bun.spawn(commandArgv, { cwd, stdout: "pipe", stderr: "pipe" });
      const timeoutMs = timeoutSeconds * 1000;
      const killTimer = setTimeout(() => {
        timedOut = true;
        try {
          proc.kill();
        } catch {
          // ignore
        }
        setTimeout(() => {
          try {
            proc.kill("SIGKILL");
          } catch {
            // ignore
          }
        }, 1000);
      }, timeoutMs);

      try {
        const stdoutPromise = proc.stdout ? new Response(proc.stdout).text() : Promise.resolve("");
        const stderrPromise = proc.stderr ? new Response(proc.stderr).text() : Promise.resolve("");
        const exitCodePromise = proc.exited;
        const [out, err, exitCode] = await Promise.all([stdoutPromise, stderrPromise, exitCodePromise]);
        stdout = out;
        stderr = err;
        const resolvedExitCode = typeof exitCode === "number" ? exitCode : timedOut ? 124 : 1;

        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();
        const git = bestEffortGitProvenance(cwd);

        const result: ExperimentResultV01 = {
          schema_version: "experiment_result_v0.1",
          result_id: resultId,
          capture_mode: "run",
          thread_id: threadId,
          test_id: testId,

          created_at: startedAt.toISOString(),
          cwd,
          argv: commandArgv,

          timeout_seconds: timeoutSeconds,
          timed_out: timedOut,

          exit_code: resolvedExitCode,
          started_at: startedAt.toISOString(),
          finished_at: finishedAt.toISOString(),
          duration_ms: durationMs,

          stdout,
          stderr,

          ...(git ? { git } : {}),
          runtime: { platform: process.platform, arch: process.arch, bun_version: Bun.version },
        };

        mkdirSync(dirname(outFile), { recursive: true });
        writeFileSync(outFile, JSON.stringify(result, null, 2), "utf8");

        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: true, out_file: outFile, result }, null, 2));
        } else {
          stdoutLine(outFile);
          if (timedOut) stderrLine(`Timed out after ${timeoutSeconds}s.`);
        }

        process.exit(0);
      } finally {
        clearTimeout(killTimer);
      }
    }

    if (sub === "record") {
      const exitCode = asIntFlag(flags, "exit-code");
      if (typeof exitCode !== "number") throw new Error("Missing --exit-code.");

      const stdoutFile = asStringFlag(flags, "stdout-file");
      const stderrFile = asStringFlag(flags, "stderr-file");
      const stdoutInline = asStringFlag(flags, "stdout");
      const stderrInline = asStringFlag(flags, "stderr");
      const commandRaw = asStringFlag(flags, "command");

      if (stdoutFile && stdoutInline) throw new Error("Use either --stdout-file or --stdout (not both).");
      if (stderrFile && stderrInline) throw new Error("Use either --stderr-file or --stderr (not both).");

      const stdoutText = stdoutFile ? readTextFile(resolve(cwd, stdoutFile)) : stdoutInline ?? "";
      const stderrText = stderrFile ? readTextFile(resolve(cwd, stderrFile)) : stderrInline ?? "";

      let argv: string[] | null = null;
      if (commandRaw) {
        if (commandRaw.trim().startsWith("[")) {
          try {
            const parsed = JSON.parse(commandRaw) as Json;
            if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) argv = parsed as string[];
          } catch {
            // ignore
          }
        }
        if (!argv) {
          if (commandRaw.includes(",")) {
            const csv = commandRaw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            if (csv.length > 0) argv = csv;
          } else {
            const tokens = splitCommand(commandRaw);
            if (tokens.length > 0) argv = tokens;
          }
        }
      }

      const git = bestEffortGitProvenance(cwd);

      const result: ExperimentResultV01 = {
        schema_version: "experiment_result_v0.1",
        result_id: resultId,
        capture_mode: "record",
        thread_id: threadId,
        test_id: testId,

        created_at: createdAt.toISOString(),
        cwd,
        argv,

        timeout_seconds: null,
        timed_out: false,

        exit_code: exitCode,
        started_at: null,
        finished_at: null,
        duration_ms: null,

        stdout: stdoutText,
        stderr: stderrText,

        ...(git ? { git } : {}),
        runtime: { platform: process.platform, arch: process.arch, bun_version: Bun.version },
      };

      mkdirSync(dirname(outFile), { recursive: true });
      writeFileSync(outFile, JSON.stringify(result, null, 2), "utf8");

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, out_file: outFile, result }, null, 2));
      } else {
        stdoutLine(outFile);
      }

      process.exit(0);
    }

    throw new Error(`Unknown experiment subcommand: ${sub ?? "(missing)"}`);
  }

  // ============================================================================
  // Evidence Pack Commands
  // ============================================================================

  if (top === "evidence") {
    const jsonMode = asBoolFlag(flags, "json");
    const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
    const threadId = asStringFlag(flags, "thread-id");

    if (!threadId) throw new Error("Missing --thread-id.");

    // Evidence pack path: artifacts/<thread_id>/evidence.json
    const safeThreadId = threadId.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const evidenceDir = resolve(projectKey, "artifacts", safeThreadId);
    const evidenceJsonPath = join(evidenceDir, "evidence.json");
    const evidenceMdPath = join(evidenceDir, "evidence.md");

    // Helper: read existing evidence pack or return null
    function readEvidencePack(): EvidencePack | null {
      if (!existsSync(evidenceJsonPath)) return null;
      try {
        const content = readTextFile(evidenceJsonPath);
        return JSON.parse(content) as EvidencePack;
      } catch {
        return null;
      }
    }

    // Helper: write evidence pack
    function writeEvidencePack(pack: EvidencePack): void {
      pack.updated_at = new Date().toISOString();
      mkdirSync(evidenceDir, { recursive: true });
      writeFileSync(evidenceJsonPath, JSON.stringify(pack, null, 2), "utf8");
    }

    // Helper: format evidence ID
    function formatEvidenceId(n: number): string {
      return `EV-${String(n).padStart(3, "0")}`;
    }

    // Helper: infer access method from source
    function inferAccessMethod(source: string): EvidenceRecord["access_method"] {
      if (source.startsWith("doi:") || source.startsWith("https://doi.org/")) return "doi";
      if (source.startsWith("http://") || source.startsWith("https://")) return "url";
      if (source.startsWith("file://") || source.startsWith("/") || source.startsWith("./")) return "file";
      if (source.startsWith("session://")) return "session";
      return "manual";
    }

    // Helper: escape pipe characters for markdown tables
    function escapeTableValue(s: string): string {
      return s.replace(/\|/g, "\\|");
    }

    // Helper: render evidence pack to markdown
    function renderEvidenceMd(pack: EvidencePack): string {
      const lines: string[] = [];
      lines.push(`# Evidence Pack: ${pack.thread_id}`);
      lines.push("");
      lines.push(`> Created: ${pack.created_at}`);
      lines.push(`> Updated: ${pack.updated_at}`);
      lines.push(`> Records: ${pack.records.length}`);
      lines.push("");
      lines.push("---");

      for (const rec of pack.records) {
        lines.push("");
        lines.push(`## ${rec.id}: ${escapeTableValue(rec.title)}`);
        lines.push("");
        lines.push("| Field | Value |");
        lines.push("|-------|-------|");
        lines.push(`| Type | ${rec.type} |`);
        if (rec.authors?.length) lines.push(`| Authors | ${escapeTableValue(rec.authors.join("; "))} |`);
        if (rec.date) lines.push(`| Date | ${escapeTableValue(rec.date)} |`);
        lines.push(`| Source | ${escapeTableValue(rec.source)} |`);
        lines.push(`| Verified | ${rec.verified ? `Yes${rec.verification_notes ? ` (${escapeTableValue(rec.verification_notes)})` : ""}` : "No"} |`);
        if (rec.supports?.length) lines.push(`| Supports | ${escapeTableValue(rec.supports.join(", "))} |`);
        if (rec.refutes?.length) lines.push(`| Refutes | ${escapeTableValue(rec.refutes.join(", "))} |`);
        if (rec.informs?.length) lines.push(`| Informs | ${escapeTableValue(rec.informs.join(", "))} |`);
        lines.push("");
        lines.push(`**Relevance**: ${rec.relevance}`);
        lines.push("");
        if (rec.key_findings.length > 0) {
          lines.push("**Key Findings**:");
          for (const finding of rec.key_findings) {
            lines.push(`- ${finding}`);
          }
          lines.push("");
        }
        if (rec.excerpts.length > 0) {
          lines.push("### Excerpts");
          lines.push("");
          for (const ex of rec.excerpts) {
            const loc = ex.location ? `, ${ex.location}` : "";
            const type = ex.verbatim ? "verbatim" : "paraphrased";
            lines.push(`**${rec.id}#${ex.anchor}** (${type}${loc}):`);
            // Handle multi-line text by prefixing each line with >
            const textLines = ex.text.split("\n");
            for (const textLine of textLines) {
              lines.push(`> ${textLine}`);
            }
            if (ex.note) {
              lines.push(`>`);
              // Handle multi-line notes too
              const noteLines = ex.note.split("\n");
              for (const noteLine of noteLines) {
                lines.push(`> *${noteLine}*`);
              }
            }
            lines.push("");
          }
        }
        lines.push("---");
      }

      return lines.join("\n");
    }

    // Subcommand: init
    if (sub === "init") {
      const existing = readEvidencePack();
      if (existing) {
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: true, existing: true, path: evidenceJsonPath, records: existing.records.length }, null, 2));
        } else {
          stdoutLine(`Evidence pack already exists: ${evidenceJsonPath} (${existing.records.length} records)`);
        }
        process.exit(0);
      }

      const now = new Date().toISOString();
      const pack: EvidencePack = {
        version: "0.1",
        thread_id: threadId,
        created_at: now,
        updated_at: now,
        next_id: 1,
        records: [],
      };
      writeEvidencePack(pack);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, created: true, path: evidenceJsonPath }, null, 2));
      } else {
        stdoutLine(`Created: ${evidenceJsonPath}`);
      }
      process.exit(0);
    }

    // Subcommand: add
    if (sub === "add") {
      const evTypeRaw = asStringFlag(flags, "type");
      const title = asStringFlag(flags, "title");
      const source = asStringFlag(flags, "source");
      const relevance = asStringFlag(flags, "relevance") ?? "";
      const supports = splitCsv(asStringFlag(flags, "supports"));
      const refutes = splitCsv(asStringFlag(flags, "refutes"));
      const informs = splitCsv(asStringFlag(flags, "informs"));

      const validTypes: EvidenceType[] = ["paper", "preprint", "dataset", "experiment", "observation", "prior_session", "expert_opinion", "code_artifact"];
      if (!evTypeRaw) throw new Error("Missing --type (paper|preprint|dataset|experiment|observation|prior_session|expert_opinion|code_artifact).");
      if (!validTypes.includes(evTypeRaw as EvidenceType)) {
        throw new Error(`Invalid --type "${evTypeRaw}". Valid types: ${validTypes.join(", ")}`);
      }
      const evType = evTypeRaw as EvidenceType;
      if (!title) throw new Error("Missing --title.");
      if (!source) throw new Error("Missing --source.");

      let pack = readEvidencePack();
      if (!pack) {
        // Auto-init
        const now = new Date().toISOString();
        pack = {
          version: "0.1",
          thread_id: threadId,
          created_at: now,
          updated_at: now,
          next_id: 1,
          records: [],
        };
      }

      const evId = formatEvidenceId(pack.next_id);
      const agentName = process.env.AGENT_NAME ?? "operator";

      const record: EvidenceRecord = {
        id: evId,
        type: evType,
        title,
        source,
        access_method: inferAccessMethod(source),
        imported_at: new Date().toISOString(),
        imported_by: agentName,
        relevance,
        key_findings: [],
        verified: false,
        excerpts: [],
      };
      if (supports.length > 0) record.supports = supports;
      if (refutes.length > 0) record.refutes = refutes;
      if (informs.length > 0) record.informs = informs;

      pack.records.push(record);
      pack.next_id++;
      writeEvidencePack(pack);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, evidence_id: evId, path: evidenceJsonPath }, null, 2));
      } else {
        stdoutLine(`Added ${evId}: ${title}`);
      }
      process.exit(0);
    }

    // Subcommand: add-excerpt
    if (sub === "add-excerpt") {
      const evidenceId = asStringFlag(flags, "evidence-id");
      const text = asStringFlag(flags, "text");
      const verbatim = asBoolFlag(flags, "verbatim");
      const location = asStringFlag(flags, "location");
      const note = asStringFlag(flags, "note");

      if (!evidenceId) throw new Error("Missing --evidence-id (e.g., EV-001).");
      if (!text) throw new Error("Missing --text.");

      const pack = readEvidencePack();
      if (!pack) throw new Error(`No evidence pack found at ${evidenceJsonPath}. Run 'evidence init' first.`);

      const record = pack.records.find((r) => r.id === evidenceId);
      if (!record) throw new Error(`Evidence record ${evidenceId} not found.`);

      const nextAnchor = `E${record.excerpts.length + 1}`;
      const excerpt: EvidenceExcerpt = {
        anchor: nextAnchor,
        text,
        verbatim,
      };
      if (location) excerpt.location = location;
      if (note) excerpt.note = note;

      record.excerpts.push(excerpt);
      writeEvidencePack(pack);

      const fullAnchor = `${evidenceId}#${nextAnchor}`;
      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, anchor: fullAnchor, path: evidenceJsonPath }, null, 2));
      } else {
        stdoutLine(`Added excerpt ${fullAnchor}`);
      }
      process.exit(0);
    }

    // Subcommand: list
    if (sub === "list") {
      const pack = readEvidencePack();
      if (!pack) {
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: true, records: [], path: evidenceJsonPath, exists: false }, null, 2));
        } else {
          stdoutLine(`No evidence pack found at ${evidenceJsonPath}`);
        }
        process.exit(0);
      }

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, records: pack.records, path: evidenceJsonPath, exists: true }, null, 2));
      } else {
        if (pack.records.length === 0) {
          stdoutLine("No evidence records.");
        } else {
          for (const rec of pack.records) {
            const verified = rec.verified ? "✓" : " ";
            const excerpts = rec.excerpts.length > 0 ? ` (${rec.excerpts.length} excerpts)` : "";
            stdoutLine(`[${verified}] ${rec.id}: ${rec.title} [${rec.type}]${excerpts}`);
          }
        }
      }
      process.exit(0);
    }

    // Subcommand: render
    if (sub === "render") {
      const outFile = asStringFlag(flags, "out-file");

      const pack = readEvidencePack();
      if (!pack) throw new Error(`No evidence pack found at ${evidenceJsonPath}. Run 'evidence init' first.`);

      const md = renderEvidenceMd(pack);

      if (outFile) {
        const resolvedOut = resolve(projectKey, outFile);
        mkdirSync(dirname(resolvedOut), { recursive: true });
        writeFileSync(resolvedOut, md, "utf8");
        stdoutLine(resolvedOut);
      } else {
        // Also write to default location
        writeFileSync(evidenceMdPath, md, "utf8");
        stdoutLine(md);
      }
      process.exit(0);
    }

    // Subcommand: verify
    if (sub === "verify") {
      const evidenceId = asStringFlag(flags, "evidence-id");
      const notes = asStringFlag(flags, "notes");

      if (!evidenceId) throw new Error("Missing --evidence-id (e.g., EV-001).");
      if (!notes) throw new Error("Missing --notes.");

      const pack = readEvidencePack();
      if (!pack) throw new Error(`No evidence pack found at ${evidenceJsonPath}. Run 'evidence init' first.`);

      const record = pack.records.find((r) => r.id === evidenceId);
      if (!record) throw new Error(`Evidence record ${evidenceId} not found.`);

      record.verified = true;
      record.verification_notes = notes;
      writeEvidencePack(pack);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, evidence_id: evidenceId, verified: true }, null, 2));
      } else {
        stdoutLine(`Verified ${evidenceId}: ${notes}`);
      }
      process.exit(0);
    }

    throw new Error(`Unknown evidence subcommand: ${sub ?? "(missing)"}`);
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
        stdoutLine(JSON.stringify({ ok: res.ok, status: res.status, readiness: json }, null, 2));
        process.exit(res.ok ? 0 : 1);
      } catch {
        const result = await client.toolsCall("health_check", {});
        stdoutLine(JSON.stringify(result, null, 2));
        process.exit(0);
      }
    }

    if (sub === "tools") {
      const result = await client.toolsList();
      stdoutLine(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    if (sub === "agents") {
      const projectSlug = isAbsolute(projectKey)
        ? parseEnsureProjectSlug(await client.toolsCall("ensure_project", { human_key: projectKey }))
        : projectKey;
      if (!projectSlug) throw new Error("Agent Mail ensure_project did not return a project slug.");
      const result = await client.resourcesRead(`resource://agents/${projectSlug}`);
      stdoutLine(JSON.stringify(result, null, 2));
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
          stderrLine(`Agent Mail assigned sender name "${actualName}" (requested "${sender}").`);
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
        stderrLine(JSON.stringify(result, null, 2));
        process.exit(1);
      }
      stdoutLine(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    if (sub === "inbox") {
      const agentName = asStringFlag(flags, "agent") ?? process.env.AGENT_NAME;
      if (!agentName) throw new Error("Missing --agent (or set AGENT_NAME).");

      const limit = asIntFlag(flags, "limit") ?? 20;
      const urgentOnly = asBoolFlag(flags, "urgent-only");
      const includeBodies = asBoolFlag(flags, "include-bodies");
      const includeSummaries = asBoolFlag(flags, "summaries");
      const threadsMode = asBoolFlag(flags, "threads");
      const sinceTs = asStringFlag(flags, "since");

      if (includeSummaries && !threadsMode) {
        throw new Error("Use --summaries together with --threads.");
      }
      if (includeSummaries && includeBodies) {
        throw new Error("Use either --include-bodies or --summaries (not both).");
      }

      const result = await client.toolsCall("fetch_inbox", {
        project_key: projectKey,
        agent_name: agentName,
        limit,
        urgent_only: urgentOnly,
        include_bodies: includeBodies,
        since_ts: sinceTs ?? null,
      });

      if (threadsMode) {
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

        const baseThreads = Object.values(threads).sort((a, b) => (b.latest_ts ?? "").localeCompare(a.latest_ts ?? ""));

        if (!includeSummaries) {
          const out = { agent: agentName, threads: baseThreads };
          stdoutLine(JSON.stringify(out, null, 2));
          process.exit(0);
        }

        const enriched: Array<
          (typeof baseThreads)[number] & {
            status?: {
              phase: string;
              respondedRoleCount: number;
              totalRoleCount: number;
              pendingAcks: number;
              awaitingAckFrom: string[];
              hasArtifact: boolean;
              latestArtifact: null | {
                message_id: number;
                version: number | null;
                compiledAt: string;
                contributors: string[];
              };
              roleContributors: Record<string, string[]>;
              summary: string;
            } | null;
            status_error?: string;
          }
        > = [];

        for (const threadMeta of baseThreads) {
          if (threadMeta.thread_id === "(no-thread)") {
            enriched.push({ ...threadMeta, status: null });
            continue;
          }

          try {
            const thread = await client.readThread({ projectKey, threadId: threadMeta.thread_id, includeBodies: false });
            const status = computeThreadStatusFromThread(thread);
            const totalRoleCount = Object.keys(status.roles).length;
            const respondedRoleCount = Object.values(status.roles).filter((r) => r.completed).length;
            let artifactLabel: string | null = null;
            if (status.latestArtifact) {
              if (status.latestArtifact.version) {
                artifactLabel = `v${status.latestArtifact.version}`;
              } else {
                artifactLabel = "latest";
              }
            }

            const summaryParts = [
              `${respondedRoleCount}/${totalRoleCount} roles`,
              `Phase: ${status.phase.replace(/_/g, " ")}`,
              status.acks.pendingCount > 0 ? `${status.acks.pendingCount} pending acks` : null,
              artifactLabel ? `Artifact: ${artifactLabel}` : null,
            ].filter(Boolean) as string[];

            enriched.push({
              ...threadMeta,
              status: {
                phase: status.phase,
                respondedRoleCount,
                totalRoleCount,
                pendingAcks: status.acks.pendingCount,
                awaitingAckFrom: status.acks.awaitingFrom,
                hasArtifact: status.latestArtifact !== null,
                latestArtifact: status.latestArtifact
                  ? {
                      message_id: status.latestArtifact.message.id,
                      version: status.latestArtifact.version,
                      compiledAt: status.latestArtifact.compiledAt,
                      contributors: status.latestArtifact.contributors,
                    }
                  : null,
                roleContributors: Object.fromEntries(
                  Object.entries(status.roles).map(([role, roleStatus]) => [role, roleStatus.contributors])
                ),
                summary: summaryParts.join(" | "),
              },
            });
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            enriched.push({ ...threadMeta, status_error: message });
          }
        }

        stdoutLine(JSON.stringify({ agent: agentName, threads: enriched }, null, 2));
      } else {
        stdoutLine(JSON.stringify(result, null, 2));
      }

      process.exit(0);
    }

    if (sub === "read") {
      const agentName = asStringFlag(flags, "agent") ?? process.env.AGENT_NAME;
      if (!agentName) throw new Error("Missing --agent (or set AGENT_NAME).");
      const messageId = asIntFlag(flags, "message-id");
      if (!messageId) throw new Error("Missing --message-id.");

      // Fetch the message (with bodies) so `mail read` actually shows content.
      // Agent Mail doesn't currently expose a direct "get message by id" tool,
      // so we scan the agent's inbox for the requested message_id.
      const inbox = await client.toolsCall("fetch_inbox", {
        project_key: projectKey,
        agent_name: agentName,
        limit: 200,
        urgent_only: false,
        include_bodies: true,
        since_ts: null,
      });

      if (isToolError(inbox)) {
        stderrLine(JSON.stringify(inbox, null, 2));
        process.exit(1);
      }

      const messages: Array<Record<string, Json>> = [];
      if (isRecord(inbox) && isRecord(inbox.structuredContent)) {
        const structured = inbox.structuredContent.result;
        if (Array.isArray(structured)) {
          for (const item of structured) {
            if (isRecord(item)) messages.push(item);
          }
        }
      } else if (isRecord(inbox) && Array.isArray(inbox.content) && inbox.content.length > 0) {
        const first = inbox.content[0];
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

      const message = messages.find((m) => m.id === messageId);
      if (!message) {
        throw new Error(`Message ${messageId} not found in ${agentName} inbox (limit=200).`);
      }

      const markRead = await client.toolsCall("mark_message_read", {
        project_key: projectKey,
        agent_name: agentName,
        message_id: messageId,
      });

      stdoutLine(JSON.stringify({ message, mark_read: markRead }, null, 2));
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
      stdoutLine(JSON.stringify(result, null, 2));
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
      stdoutLine(JSON.stringify(result, null, 2));
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
      stderrLine(`Failed to read manifest: ${msg}`);
      process.exit(1);
    }

    const parseResult = parseManifest(manifestJson);
    if (!parseResult.ok) {
      stderrLine(parseResult.error);
      process.exit(1);
    }

    // Detect or use override platform
    const platform = platformOverride ?? detectPlatform();
    if (!platform) {
      stderrLine(
        `Unsupported platform: ${process.platform}/${process.arch}\n` +
          `Supported: linux-x64, linux-arm64, darwin-arm64, darwin-x64, win-x64`
      );
      process.exit(1);
    }

    // Validate platform override if provided
    const validPlatforms = ["linux-x64", "linux-arm64", "darwin-arm64", "darwin-x64", "win-x64"];
    if (platformOverride && !validPlatforms.includes(platformOverride)) {
      stderrLine(`Invalid --platform: ${platformOverride}\nSupported: ${validPlatforms.join(", ")}`);
      process.exit(1);
    }

    const plan = generateInstallPlan(parseResult.manifest, platform);

    if (jsonMode) {
      stdoutLine(formatPlanJson(plan));
    } else {
      stdoutLine(formatPlanHuman(plan));
    }

    process.exit(0);
  }

  if (top === "lint") {
    const jsonMode = asBoolFlag(flags, "json");
    const artifactPathRaw = sub;
    if (!artifactPathRaw) throw new Error("Missing <artifact.json> path.");

    const artifactPath = resolve(artifactPathRaw);
    const artifact = parseArtifactFromJsonFile(artifactPath);
    const report = lintArtifact(artifact);

    const artifactName = artifact.metadata?.session_id ? artifact.metadata.session_id : artifactPath;
    if (jsonMode) {
      stdoutLine(formatLintReportJson(report, artifactName));
    } else {
      stdoutLine(formatLintReportHuman(report, artifactName));
    }

    process.exit(report.valid ? 0 : 1);
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
      stdoutLine(JSON.stringify(composed, null, 2));
    } else {
      stdoutLine(composed.markdown);
    }

    process.exit(0);
  }

  if (top === "corpus" && sub === "search") {
    const jsonMode = asBoolFlag(flags, "json");
    const publicBaseUrl = getCliPublicBaseUrl();

    const positionalQuery = positional.slice(2).join(" ").trim();
    const query = positionalQuery || asStringFlag(flags, "query");
    if (!query) throw new Error("Missing query. Usage: ./brenner.ts corpus search \"...\" (or --query \"...\").");

    const limit = asIntFlag(flags, "limit") ?? 20;
    if (limit <= 0) throw new Error(`Invalid --limit: expected > 0, got ${limit}`);

    const docIds = splitCsv(asStringFlag(flags, "docs") ?? asStringFlag(flags, "doc"));
    if (docIds.length > 0) {
      const known = new Set(CORPUS_DOCS.map((d) => d.id));
      const unknown = docIds.filter((id) => !known.has(id));
      if (unknown.length > 0) {
        throw new Error(
          `Unknown doc id(s): ${unknown.join(", ")}\n` +
            `Known docs:\n` +
            CORPUS_DOCS.map((d) => `- ${d.id}${d.title ? `: ${d.title}` : ""}`).join("\n")
        );
      }
    }

    const categoryRaw = asStringFlag(flags, "category");
    const allowedCategories: SearchCategory[] = [
      "all",
      "transcript",
      "quote-bank",
      "distillation",
      "metaprompt",
      "raw-response",
    ];
    const category = (categoryRaw ?? "all") as SearchCategory;
    if (categoryRaw && !allowedCategories.includes(category)) {
      throw new Error(`Invalid --category: expected one of ${allowedCategories.join(", ")}, got "${categoryRaw}"`);
    }

    const modelRaw = asStringFlag(flags, "model");
    const model = modelRaw ? (modelRaw as "gpt" | "opus" | "gemini") : undefined;
    if (modelRaw && model !== "gpt" && model !== "opus" && model !== "gemini") {
      throw new Error(`Invalid --model: expected "gpt", "opus", or "gemini", got "${modelRaw}"`);
    }

    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);

    const runSearch = () =>
      globalSearch(query, {
        limit,
        category,
        model,
        ...(docIds.length > 0 ? { docIds } : {}),
      });

    let result: Awaited<ReturnType<typeof runSearch>>;
    let webCwd: string | null = null;
    try {
      webCwd = resolveWebAppCwd(projectKey);
    } catch {
      // ignore
    }

    if (webCwd) {
      result = await withWorkingDirectory(webCwd, runSearch);
    } else {
      // Fall back to HTTP-only mode (works outside the repo).
      result = await runSearch();
    }

    if (jsonMode) {
      stdoutLine(
        JSON.stringify(
          {
            ...result,
            filters: { limit, category, model: model ?? null, docIds },
            publicBaseUrl,
          },
          null,
          2
        )
      );
      process.exit(0);
    }

    const lines: string[] = [];
    lines.push(`Query: ${query}`);
    if (docIds.length > 0) lines.push(`Docs: ${docIds.join(", ")}`);
    if (category !== "all") lines.push(`Category: ${category}`);
    if (model) lines.push(`Model: ${model}`);
    lines.push(`Matches: ${result.totalMatches} (showing ${result.hits.length}) in ${result.searchTimeMs}ms`);

    for (const [i, hit] of result.hits.entries()) {
      lines.push("");
      const where = [hit.docId, hit.anchor].filter(Boolean).join(" ");
      lines.push(`${i + 1}. ${where} — ${hit.title}`);
      lines.push(`   ${singleLine(hit.snippet)}`);
      lines.push(`   ${toAbsoluteUrl(hit.url, publicBaseUrl)}`);
    }

    stdoutLine(lines.join("\n").trim());
    process.exit(0);
  }

  if (top === "corpus") {
    throw new Error(`Unknown corpus command: ${[sub, action].filter(Boolean).join(" ") || "(missing subcommand)"}`);
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

    stdoutLine(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (top === "cockpit" && sub === "start") {
    const jsonMode = asBoolFlag(flags, "json");
    const dryRun = asBoolFlag(flags, "dry-run");
    const skipNtm = asBoolFlag(flags, "skip-ntm");
    const skipBroadcast = asBoolFlag(flags, "skip-broadcast");
    const ntmArgsRaw = asStringFlag(flags, "ntm-args") ?? "--cc=1 --cod=1 --gmi=1";

    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);
    const threadId = asStringFlag(flags, "thread-id");
    if (!threadId) throw new Error("Missing --thread-id.");

    let sender = asStringFlag(flags, "sender") ?? process.env.AGENT_NAME;
    if (!sender) throw new Error("Missing --sender (or set AGENT_NAME).");

    const to = splitCsv(asStringFlag(flags, "to"));
    if (to.length === 0) throw new Error("Missing --to <A,B>.");

    const excerptFile = asStringFlag(flags, "excerpt-file");
    if (!excerptFile) throw new Error("Missing --excerpt-file.");
    const excerpt = readTextFile(resolve(excerptFile));

    const question = asStringFlag(flags, "question");
    if (!question) throw new Error("Missing --question (research question).");

    const context = asStringFlag(flags, "context") ?? "See excerpt for background.";
    const withMemory = asBoolFlag(flags, "with-memory");
    let memoryAudit: CassMemoryKickoffAudit = null;

    const roleMapRaw = asStringFlag(flags, "role-map")?.trim();
    if (!roleMapRaw) {
      throw new Error(
        "Missing --role-map. Cockpit sessions require an explicit roster mapping. " +
          'Example: --role-map "BlueLake=hypothesis_generator,PurpleMountain=test_designer,RedForest=adversarial_critic"'
      );
    }

    const recipientRoles = parseRoleMapFlag(roleMapRaw);
    const normalizedMap = new Set(Object.keys(recipientRoles).map((k) => k.trim().toLowerCase()));
    const missing = to.filter((r) => !normalizedMap.has(r.trim().toLowerCase()));
    if (missing.length > 0) {
      throw new Error(`--role-map is missing entries for: ${missing.join(", ")}`);
    }

    const kickoffConfig: KickoffConfig = {
      threadId,
      researchQuestion: question,
      context,
      excerpt,
      recipients: to,
      recipientRoles,
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
      }
    }

    const broadcastMessage =
      asStringFlag(flags, "broadcast-message") ?? `Please check your Agent Mail inbox for thread: ${threadId}`;

    const ntmSpawnArgv = ["ntm", "spawn", threadId, ...splitCommand(ntmArgsRaw)];
    const ntmSendArgv = ["ntm", "send", threadId, "--all", broadcastMessage];

    const kickoffPreview = composeKickoffMessages(kickoffConfig).map((m) => ({
      to: m.to,
      role: m.role.role,
      subject: m.subject,
    }));

    if (dryRun) {
      if (jsonMode) {
        stdoutLine(
          JSON.stringify(
            {
              ok: true,
              dryRun: true,
              threadId,
              projectKey,
              sender,
              to,
              roster: recipientRoles,
              memory: memoryAudit,
              ntm: {
                spawn: skipNtm ? null : { argv: ntmSpawnArgv },
                broadcast: skipBroadcast ? null : { argv: ntmSendArgv },
              },
              kickoff: kickoffPreview,
            },
            null,
            2
          )
        );
      } else {
        const lines: string[] = [];
        lines.push("cockpit start (dry-run)");
        lines.push(`thread: ${threadId}`);
        lines.push(`project: ${projectKey}`);
        lines.push("");
        if (!skipNtm) {
          lines.push("ntm spawn:");
          lines.push(`  ${ntmSpawnArgv.join(" ")}`);
          lines.push("");
        }
        lines.push("kickoff messages:");
        for (const msg of kickoffPreview) {
          lines.push(`  - ${msg.to}: ${msg.role} (${msg.subject})`);
        }
        lines.push("");
        if (!skipBroadcast) {
          lines.push("ntm broadcast:");
          lines.push(`  ${ntmSendArgv.join(" ")}`);
          lines.push("");
        }
        stdoutLine(lines.join("\n").trim());
      }
      process.exit(0);
    }

    const ntmResults: Json[] = [];

    if (!skipNtm) {
      const proc = Bun.spawnSync(ntmSpawnArgv, { stdout: "pipe", stderr: "pipe" });
      ntmResults.push({
        action: "spawn",
        argv: ntmSpawnArgv,
        exitCode: proc.exitCode ?? 1,
        stdout: proc.stdout.toString(),
        stderr: proc.stderr.toString(),
      });
      if ((proc.exitCode ?? 1) !== 0) {
        throw new Error(`ntm spawn failed: ${proc.stderr.toString().trim()}`);
      }
    }

    // Send kickoff via Agent Mail (role-specific, explicit roster)
    const client = new AgentMailClient(runtimeConfig.agentMail);
    await client.toolsCall("ensure_project", { human_key: projectKey });
    const registerResult = await client.toolsCall("register_agent", {
      project_key: projectKey,
      name: sender,
      program: "brenner-cli",
      model: "orchestrator",
      task_description: `Brenner Protocol session (cockpit): ${threadId}`,
    });
    const actualName = parseAgentNameFromToolResult(registerResult);
    if (actualName && actualName !== sender) {
      stderrLine(`Agent Mail assigned sender name "${actualName}" (requested "${sender}").`);
      sender = actualName;
    }

    const messages = composeKickoffMessages(kickoffConfig);
    const sendResults: Json[] = [];
    for (const msg of messages) {
      const result = await client.toolsCall("send_message", {
        project_key: projectKey,
        sender_name: sender,
        to: [msg.to],
        subject: msg.subject,
        body_md: msg.body,
        thread_id: threadId,
        ack_required: true,
      });
      sendResults.push(result);
    }

    if (!skipBroadcast) {
      const proc = Bun.spawnSync(ntmSendArgv, { stdout: "pipe", stderr: "pipe" });
      ntmResults.push({
        action: "broadcast",
        argv: ntmSendArgv,
        exitCode: proc.exitCode ?? 1,
        stdout: proc.stdout.toString(),
        stderr: proc.stderr.toString(),
      });
      if ((proc.exitCode ?? 1) !== 0) {
        throw new Error(`ntm send failed: ${proc.stderr.toString().trim()}`);
      }
    }

    stdoutLine(
      JSON.stringify(
        {
          ok: true,
          threadId,
          projectKey,
          sender,
          to,
          roster: recipientRoles,
          memory: memoryAudit,
          ntm: ntmResults,
          sent: messages.length,
          messages: sendResults,
        },
        null,
        2
      )
    );
    process.exit(0);
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

    const roleMapRaw = asStringFlag(flags, "role-map")?.trim();
    if (roleMapRaw && unified) {
      throw new Error("Use --role-map only in role-specific mode (omit --unified).");
    }

    const recipientRoles = roleMapRaw ? parseRoleMapFlag(roleMapRaw) : undefined;
    if (recipientRoles) {
      const normalizedMap = new Set(Object.keys(recipientRoles).map((k) => k.trim().toLowerCase()));
      const missing = to.filter((r) => !normalizedMap.has(r.trim().toLowerCase()));
      if (missing.length > 0) {
        throw new Error(`--role-map is missing entries for: ${missing.join(", ")}`);
      }
    }

    // Compose kickoff configuration
    const kickoffConfig: KickoffConfig = {
      threadId,
      researchQuestion: question,
      context,
      excerpt,
      recipients: to,
      recipientRoles,
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
        stderrLine(`Injected MEMORY CONTEXT (cass-memory) via ${memoryResult.provenance.mode}.`);
      } else {
        const details = memoryResult.provenance.errors.join("; ");
        stderrLine(
          `No MEMORY CONTEXT injected (cass-memory ${memoryResult.provenance.mode}${details ? `: ${details}` : ""}).`
        );
      }
    }

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
      stderrLine(`Agent Mail assigned sender name "${actualName}" (requested "${sender}").`);
      sender = actualName;
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
      stdoutLine(JSON.stringify(payload, null, 2));
    } else {
      // Role-specific mode: each agent gets their role prompt
      const messages = composeKickoffMessages(kickoffConfig);
      const results: Json[] = [];

      for (const msg of messages) {
        stderrLine(`Sending kickoff to ${msg.to} as ${msg.role.displayName}...`);
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

      stdoutLine(
        JSON.stringify(
          { memory: memoryAudit, roster: kickoffConfig.recipientRoles ?? null, sent: results.length, messages: results },
          null,
          2
        )
      );
    }

    process.exit(0);
  }

  if (normalizedTop === "session" && sub === "compile") {
    const client = new AgentMailClient(runtimeConfig.agentMail);
    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);
    const threadId = asStringFlag(flags, "thread-id");
    if (!threadId) throw new Error("Missing --thread-id.");

    const jsonMode = asBoolFlag(flags, "json");
    const outFileRaw = asStringFlag(flags, "out-file") ?? asStringFlag(flags, "out");
    const outFile = outFileRaw ? resolve(outFileRaw) : null;

    const result = await compileSessionArtifact({ client, projectKey, threadId });
    if (!result.ok) {
      if (jsonMode) {
        stdoutLine(JSON.stringify(result, null, 2));
      } else {
        stderrLine(`Failed to compile artifact for thread ${threadId}.`);
        if (result.deltas.total_blocks > 0) {
          stderrLine(
            `Delta blocks: ${result.deltas.valid} valid, ${result.deltas.invalid} invalid (total ${result.deltas.total_blocks}).`
          );
        }
        stderrLine(JSON.stringify({ errors: result.errors, warnings: result.warnings }, null, 2));
      }
      process.exit(1);
    }

    if (outFile) {
      mkdirSync(dirname(outFile), { recursive: true });
      writeFileSync(outFile, result.markdown, "utf8");
    }

    if (jsonMode) {
      const payload = outFile ? { ...result, out_file: outFile } : result;
      stdoutLine(JSON.stringify(payload, null, 2));
      process.exit(0);
    }

    process.stdout.write(result.markdown);

    if (outFile) {
      stderrLine(`Wrote artifact to ${outFile}.`);
    }

    if (result.deltas.total_blocks > 0) {
      stderrLine(
        `Delta blocks: ${result.deltas.valid} valid, ${result.deltas.invalid} invalid (total ${result.deltas.total_blocks}).`
      );
    }
    if (result.invalid_deltas.length > 0) {
      stderrLine(`Invalid delta blocks (sample):`);
      for (const item of result.invalid_deltas.slice(0, 5)) {
        stderrLine(`- message ${item.message_id}: ${item.subject} → ${item.error}`);
      }
    }

    stderrLine(formatLintReportHuman(result.lint, `artifact v${result.version}`));
    process.exit(0);
  }

  if (normalizedTop === "session" && sub === "write") {
    const client = new AgentMailClient(runtimeConfig.agentMail);
    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);
    const threadId = asStringFlag(flags, "thread-id");
    if (!threadId) throw new Error("Missing --thread-id.");

    const jsonMode = asBoolFlag(flags, "json");
    const outFileRaw = asStringFlag(flags, "out-file") ?? asStringFlag(flags, "out");
    const safeThreadId = sanitizeThreadIdForArtifactFilename(threadId);
    const outFile = resolve(outFileRaw ?? join(projectKey, "artifacts", `${safeThreadId}.md`));

    if (!outFileRaw && safeThreadId !== threadId) {
      stderrLine(`Warning: sanitized thread id for artifact filename: "${threadId}" -> "${safeThreadId}"`);
    }

    const result = await compileSessionArtifact({ client, projectKey, threadId });
    if (!result.ok) {
      stdoutLine(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, result.markdown, "utf8");

    if (jsonMode) {
      stdoutLine(JSON.stringify({ ...result, out_file: outFile }, null, 2));
    } else {
      stderrLine(`Wrote artifact to ${outFile}.`);
      stderrLine(formatLintReportHuman(result.lint, `artifact v${result.version}`));
    }

    process.exit(0);
  }

  if (normalizedTop === "session" && sub === "publish") {
    const client = new AgentMailClient(runtimeConfig.agentMail);
    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);
    const threadId = asStringFlag(flags, "thread-id");
    if (!threadId) throw new Error("Missing --thread-id.");

    let sender = asStringFlag(flags, "sender") ?? process.env.AGENT_NAME;
    if (!sender) throw new Error("Missing --sender (or set AGENT_NAME).");
    const to = splitCsv(asStringFlag(flags, "to"));
    if (to.length === 0) throw new Error("Missing --to <A,B>.");
    const ackRequired = asBoolFlag(flags, "ack-required");
    const jsonMode = asBoolFlag(flags, "json");

    await client.toolsCall("ensure_project", { human_key: projectKey });
    const registerResult = await client.toolsCall("register_agent", {
      project_key: projectKey,
      name: sender,
      program: "brenner-cli",
      model: "orchestrator",
      task_description: `Brenner Protocol publish: ${threadId}`,
    });
    const actualName = parseAgentNameFromToolResult(registerResult);
    if (actualName && actualName !== sender) {
      stderrLine(`Agent Mail assigned sender name "${actualName}" (requested "${sender}").`);
      sender = actualName;
    }

    const compiled = await compileSessionArtifact({ client, projectKey, threadId });
    if (!compiled.ok) {
      stdoutLine(JSON.stringify(compiled, null, 2));
      process.exit(1);
    }

    const subject = asStringFlag(flags, "subject") ?? `COMPILED: v${compiled.version} artifact`;

    const sendResult = await client.toolsCall("send_message", {
      project_key: projectKey,
      sender_name: sender,
      to,
      subject,
      body_md: compiled.markdown,
      thread_id: threadId,
      ack_required: ackRequired,
    });

    const payload = { compiled, send: sendResult };
    if (jsonMode) {
      stdoutLine(JSON.stringify(payload, null, 2));
    } else {
      stdoutLine(JSON.stringify(sendResult, null, 2));
      stderrLine(formatLintReportHuman(compiled.lint, `artifact v${compiled.version}`));
    }

    process.exit(isToolError(sendResult) ? 1 : 0);
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
        stderrLine(`Timed out after ${timeoutSeconds}s waiting for roles to complete in thread ${threadId}.`);
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
  stderrLine(message);
  process.exit(1);
});
