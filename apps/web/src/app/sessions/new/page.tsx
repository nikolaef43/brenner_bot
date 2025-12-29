import { resolve } from "node:path";
import { redirect } from "next/navigation";
import { AgentMailClient } from "@/lib/agentMail";
import { composePrompt } from "@/lib/prompts";

export const runtime = "nodejs";

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

  await client.toolsCall("ensure_project", { human_key: projectKey });
  await client.toolsCall("register_agent", {
    project_key: projectKey,
    name: sender,
    program: "brenner-web",
    model: "nextjs",
    task_description: `Brenner Bot session: ${threadId}`,
  });
  await client.toolsCall("send_message", {
    project_key: projectKey,
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
  const repoRoot = repoRootFromWebCwd();
  const { sent, thread } = await searchParams;

  const senderDefault = process.env.AGENT_NAME ?? "";
  const projectKeyDefault = process.env.BRENNER_PROJECT_KEY ?? repoRoot;
  const agentMailBaseUrl = process.env.AGENT_MAIL_BASE_URL ?? "http://127.0.0.1:8765";

  let agentMailError: string | null = null;
  let agentNames: string[] = [];
  try {
    const client = new AgentMailClient();
    const result = await client.resourcesRead(`resource://agents/${projectKeyDefault}`);
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
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">New Session</h1>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Composes a Brenner Loop kickoff prompt and sends it via Agent Mail.
        </p>
      </header>

      {sent === "1" ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-100">
          Sent kickoff for thread <span className="font-mono">{thread}</span>.
        </div>
      ) : null}

      <div className="rounded-xl border border-black/10 bg-white p-4 text-sm text-zinc-700 shadow-sm dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
        <div className="font-medium text-zinc-900 dark:text-zinc-50">Agent Mail</div>
        <div className="mt-1">
          Base URL: <span className="font-mono">{agentMailBaseUrl}</span>
        </div>
        {agentMailError ? (
          <div className="mt-2 text-amber-700 dark:text-amber-300">
            Not reachable from this server: <span className="font-mono">{agentMailError}</span>
          </div>
        ) : (
          <div className="mt-2 text-emerald-700 dark:text-emerald-300">Connected.</div>
        )}
        {agentNames.length ? (
          <div className="mt-3">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Known agents</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {agentNames.slice(0, 24).map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-black/10 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700 dark:border-white/10 dark:bg-black dark:text-zinc-300"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <form action={sendKickoff} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Thread ID</span>
            <input
              name="threadId"
              placeholder="FEAT-123"
              className="rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-black"
              required
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">Sender (Agent Name)</span>
            <input
              name="sender"
              defaultValue={senderDefault}
              placeholder="GreenCastle"
              className="rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-black"
              required
            />
          </label>

          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Recipients (comma-separated agent names)</span>
            <input
              name="to"
              placeholder="BlueMountain,RedForest"
              className="rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-black"
              required
            />
          </label>

          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Subject (optional)</span>
            <input
              name="subject"
              placeholder="[FEAT-123] Brenner Loop kickoff"
              className="rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-black"
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Transcript excerpt</span>
          <textarea
            name="excerpt"
            className="min-h-48 rounded-lg border border-black/10 bg-white px-3 py-2 font-mono text-xs leading-5 dark:border-white/10 dark:bg-black"
            placeholder="Paste transcript chunks here (with section headings if you have them)."
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Theme (optional)</span>
            <input
              name="theme"
              placeholder="decision experiments"
              className="rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-black"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Domain (optional)</span>
            <input
              name="domain"
              placeholder="biology"
              className="rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-black"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Question (optional)</span>
            <input
              name="question"
              placeholder="What’s the most discriminative next experiment?"
              className="rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-black"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ackRequired" className="h-4 w-4" />
          <span>Require ack</span>
        </label>

        <input type="hidden" name="projectKey" value={projectKeyDefault} />

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Send kickoff
        </button>
      </form>
    </div>
  );
}
