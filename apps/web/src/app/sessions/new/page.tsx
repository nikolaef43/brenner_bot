import { resolve } from "node:path";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AgentMailClient } from "@/lib/agentMail";
import { isLabModeEnabled, checkOrchestrationAuth } from "@/lib/auth";
import { composePrompt } from "@/lib/prompts";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Session",
  description: "Start a new Brenner Loop research session via Agent Mail.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Icons
const PlayIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ServerIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

type AgentDirectory = {
  project?: { slug?: string; human_key?: string };
  agents?: Array<{ name?: string; unread_count?: number }>;
};

function repoRootFromWebCwd(): string {
  return resolve(process.cwd(), "../..");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEnsureProjectSlug(result: unknown): string | null {
  if (!isRecord(result)) return null;

  const structuredContent = result.structuredContent;
  if (isRecord(structuredContent) && typeof structuredContent.slug === "string") return structuredContent.slug;

  const maybeContent = result.content;
  if (Array.isArray(maybeContent) && maybeContent.length > 0) {
    const first = maybeContent[0];
    const text = isRecord(first) && typeof first.text === "string" ? first.text : undefined;
    if (text) {
      try {
        const parsed = JSON.parse(text) as unknown;
        return isRecord(parsed) && typeof parsed.slug === "string" ? parsed.slug : null;
      } catch {
        return null;
      }
    }
  }

  return null;
}

function parseAgentsResult(result: unknown): AgentDirectory | null {
  if (!isRecord(result)) return null;
  const maybeContents = result.contents;
  if (Array.isArray(maybeContents) && maybeContents.length > 0) {
    const first = maybeContents[0];
    const text = isRecord(first) && typeof first.text === "string" ? first.text : undefined;
    if (text) {
      try {
        const parsed = JSON.parse(text) as unknown;
        return isRecord(parsed) ? (parsed as AgentDirectory) : null;
      } catch {
        return null;
      }
    }
  }
  if ("agents" in result) return result as AgentDirectory;
  return null;
}

function splitCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function sendKickoff(formData: FormData): Promise<void> {
  "use server";

  // Fail-closed: check both lab mode AND optional secret
  const reqHeaders = await headers();
  const reqCookies = await cookies();
  const authResult = checkOrchestrationAuth(reqHeaders, reqCookies);
  if (!authResult.authorized) {
    // Return 404 to avoid leaking that this route exists
    notFound();
  }

  const projectKey = String(formData.get("projectKey") || repoRootFromWebCwd());
  const sender = String(formData.get("sender") || "").trim();
  const recipients = splitCsv(String(formData.get("to") || ""));
  const threadId = String(formData.get("threadId") || "").trim();

  const excerpt = String(formData.get("excerpt") || "");
  const theme = String(formData.get("theme") || "").trim() || undefined;
  const domain = String(formData.get("domain") || "").trim() || undefined;
  const question = String(formData.get("question") || "").trim() || undefined;
  const ackRequired = formData.get("ackRequired") === "on";

  if (!sender) throw new Error("Missing sender");
  if (!threadId) throw new Error("Missing thread id");
  if (recipients.length === 0) throw new Error("Missing recipients");
  if (!excerpt.trim()) throw new Error("Missing transcript excerpt");

  const client = new AgentMailClient();
  const subjectRaw = String(formData.get("subject") || "").trim();
  const subject = subjectRaw || `[${threadId}] Brenner Loop kickoff`;

  const body = await composePrompt({
    templatePathFromRepoRoot: "metaprompt_by_gpt_52.md",
    excerpt,
    theme,
    domain,
    question,
  });

  let projectSlug = projectKey;
  if (projectKey.startsWith("/")) {
    const ensured = await client.toolsCall("ensure_project", { human_key: projectKey });
    const ensuredSlug = parseEnsureProjectSlug(ensured);
    if (!ensuredSlug) throw new Error("Agent Mail: ensure_project did not return a project slug.");
    projectSlug = ensuredSlug;
  }
  await client.toolsCall("register_agent", {
    project_key: projectSlug,
    name: sender,
    program: "brenner-web",
    model: "nextjs",
    task_description: `Brenner Bot session: ${threadId}`,
  });
  await client.toolsCall("send_message", {
    project_key: projectSlug,
    sender_name: sender,
    to: recipients,
    subject,
    body_md: body,
    thread_id: threadId,
    ack_required: ackRequired,
  });

  redirect(`/sessions/new?sent=1&thread=${encodeURIComponent(threadId)}`);
}

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; thread?: string }>;
}) {
  if (!isLabModeEnabled()) notFound();

  // Defense-in-depth: even with BRENNER_LAB_MODE enabled, require Cloudflare Access headers
  // or a valid shared secret before serving any orchestration UI or reading Agent Mail data.
  const reqHeaders = await headers();
  const reqCookies = await cookies();
  const pageAuth = checkOrchestrationAuth(reqHeaders, reqCookies);
  if (!pageAuth.authorized) notFound();

  const repoRoot = repoRootFromWebCwd();
  const { sent, thread } = await searchParams;

  const senderDefault = process.env.AGENT_NAME ?? "";
  const projectKeyDefault = process.env.BRENNER_PROJECT_KEY ?? repoRoot;
  const agentMailBaseUrl = process.env.AGENT_MAIL_BASE_URL ?? "http://127.0.0.1:8765";

  let agentMailError: string | null = null;
  let agentNames: string[] = [];
  try {
    const client = new AgentMailClient();
    const projectSlug = projectKeyDefault.startsWith("/")
      ? parseEnsureProjectSlug(await client.toolsCall("ensure_project", { human_key: projectKeyDefault }))
      : projectKeyDefault;
    if (!projectSlug) throw new Error("Agent Mail: could not resolve project slug.");

    const result = await client.resourcesRead(`resource://agents/${projectSlug}`);
    const directory = parseAgentsResult(result);
    if (directory?.agents?.length) {
      agentNames = directory.agents
        .map((a) => a.name)
        .filter((n): n is string => typeof n === "string" && n.length > 0);
    }
  } catch (err) {
    agentMailError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <header className="space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
            <PlayIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New Session</h1>
            <p className="text-muted-foreground">
              Start a Brenner Loop research session via Agent Mail
            </p>
          </div>
        </div>
      </header>

      {/* Success Message */}
      {sent === "1" && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3 animate-fade-in-up">
          <div className="text-success mt-0.5">
            <CheckCircleIcon />
          </div>
          <div>
            <div className="font-semibold text-success">Kickoff sent successfully!</div>
            <p className="text-sm text-muted-foreground mt-1">
              Thread <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{thread}</span> has been initiated.
            </p>
          </div>
        </div>
      )}

      {/* Agent Mail Status */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 animate-fade-in-up stagger-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-muted text-muted-foreground">
              <ServerIcon />
            </div>
            <div>
              <div className="font-semibold text-foreground">Agent Mail</div>
              <div className="text-sm text-muted-foreground font-mono">{agentMailBaseUrl}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {agentMailError ? (
              <>
                <span className="flex size-2.5 rounded-full bg-warning animate-pulse" />
                <span className="text-sm text-warning font-medium">Unreachable</span>
              </>
            ) : (
              <>
                <span className="flex size-2.5 rounded-full bg-success animate-pulse" />
                <span className="text-sm text-success font-medium">Connected</span>
              </>
            )}
          </div>
        </div>

        {agentMailError && (
          <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 text-sm text-warning">
            {agentMailError}
          </div>
        )}

        {agentNames.length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <UsersIcon />
              <span>Known agents ({agentNames.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {agentNames.slice(0, 24).map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground border border-border"
                >
                  {name}
                </span>
              ))}
              {agentNames.length > 24 && (
                <span className="text-xs text-muted-foreground self-center">
                  +{agentNames.length - 24} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      <form action={sendKickoff} className="space-y-6 animate-fade-in-up stagger-2">
        {/* Session Setup */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Session Setup</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="threadId"
              label="Thread ID"
              placeholder="FEAT-123"
              hint="Unique identifier for this research thread"
              required
            />
            <Input
              name="sender"
              label="Your Agent Name"
              defaultValue={senderDefault}
              placeholder="GreenCastle"
              hint="How you'll appear in Agent Mail"
              required
            />
          </div>

          <Input
            name="to"
            label="Recipients"
            placeholder="BlueMountain, RedForest"
            hint="Comma-separated list of agent names"
            required
          />

          <Input
            name="subject"
            label="Subject"
            placeholder="[FEAT-123] Brenner Loop kickoff"
            hint="Optional - will auto-generate from thread ID if left blank"
          />
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Content</h2>

          <Textarea
            name="excerpt"
            label="Transcript Excerpt"
            placeholder="Paste transcript chunks here (with section headings if you have them)."
            hint="The raw Brenner transcript material to analyze"
            className="min-h-[200px] font-mono text-sm"
            autoResize
            required
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              name="theme"
              label="Theme"
              placeholder="decision experiments"
              hint="Optional focus area"
            />
            <Input
              name="domain"
              label="Domain"
              placeholder="biology"
              hint="Optional field context"
            />
            <Input
              name="question"
              label="Question"
              placeholder="What's the most discriminative next experiment?"
              hint="Optional guiding question"
            />
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Options</h2>

          <label className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              name="ackRequired"
              className="size-5 rounded border-border text-primary focus:ring-primary focus:ring-offset-background"
            />
            <div>
              <div className="font-medium text-foreground">Require acknowledgment</div>
              <div className="text-sm text-muted-foreground">Recipients must explicitly confirm receipt</div>
            </div>
          </label>
        </div>

        {/* Hidden Fields */}
        <input type="hidden" name="projectKey" value={projectKeyDefault} />

        {/* Submit */}
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <Button type="submit" size="lg" className="gap-2">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Send Kickoff
          </Button>
          <p className="text-sm text-muted-foreground">
            This will compose and send a Brenner Loop prompt to the specified agents.
          </p>
        </div>
      </form>
    </div>
  );
}
