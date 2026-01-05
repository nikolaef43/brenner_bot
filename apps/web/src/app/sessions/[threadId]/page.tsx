import { resolve } from "node:path";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { RefreshControls, SessionActions } from "@/components/sessions";
import { AgentMailClient, type AgentMailMessage } from "@/lib/agentMail";
import { isLabModeEnabled, checkOrchestrationAuth } from "@/lib/auth";
import { Jargon } from "@/components/jargon";
import {
  createEmptyArtifact,
  formatLintReportHuman,
  formatLintReportJson,
  lintArtifact,
  mergeArtifactWithTimestamps,
} from "@/lib/artifact-merge";
import { computeThreadStatusFromThread, parseSubjectType } from "@/lib/threadStatus";
import { parseDeltaMessage, type ValidDelta } from "@/lib/delta-parser";
import type { Metadata } from "next";
import { LocalSessionHub } from "./LocalSessionHub";

export const metadata: Metadata = {
  title: "Session",
  description: "Monitor a Brenner Loop research session.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_SESSION_PREFIX = "SESSION-";

function repoRootFromWebCwd(): string {
  return resolve(process.cwd(), "../..");
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatRoleLabel(role: string): string {
  return role.replace(/_/g, " ");
}

type SubjectType = ReturnType<typeof parseSubjectType>["type"];

const SUBJECT_TYPE_LABEL: Record<SubjectType, string> = {
  kickoff: "KICKOFF",
  delta: "DELTA",
  compiled: "COMPILED",
  critique: "CRITIQUE",
  ack: "ACK",
  claim: "CLAIM",
  handoff: "HANDOFF",
  blocked: "BLOCKED",
  question: "QUESTION",
  info: "INFO",
  unknown: "UNKNOWN",
};

const SUBJECT_TYPE_BADGE_CLASSES: Record<SubjectType, string> = {
  kickoff: "bg-primary text-primary-foreground",
  delta: "bg-muted text-foreground border border-border",
  compiled: "bg-success text-success-foreground",
  critique: "bg-warning text-warning-foreground",
  ack: "bg-secondary text-secondary-foreground",
  claim: "bg-muted text-muted-foreground border border-border",
  handoff: "bg-muted text-muted-foreground border border-border",
  blocked: "bg-warning/15 text-warning border border-warning/20",
  question: "bg-info/15 text-info border border-info/20",
  info: "bg-muted text-muted-foreground border border-border",
  unknown: "bg-muted text-muted-foreground border border-border",
};

function typeLabel(type: SubjectType): string {
  return SUBJECT_TYPE_LABEL[type];
}

function typeBadgeClasses(type: SubjectType): string {
  return SUBJECT_TYPE_BADGE_CLASSES[type];
}

function LockedState({ reason }: { reason: string }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div className="rounded-2xl border border-border bg-card p-8">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center size-12 rounded-xl bg-warning/10 border border-warning/20 text-warning">
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Lab Mode Locked</h1>
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link href="/sessions/new" className="text-primary hover:underline">
          Go to New Session
        </Link>
      </div>
    </div>
  );
}

function MessageHeader({ message }: { message: AgentMailMessage }) {
  const parsed = parseSubjectType(message.subject);
  const role = parsed.type === "delta" ? parsed.role : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeClasses(parsed.type)}`}>
        {typeLabel(parsed.type)}
      </span>
      {role && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
          {formatRoleLabel(role)}
        </span>
      )}
      <span className="text-sm font-medium text-foreground">{message.subject}</span>
    </div>
  );
}

function MessageMeta({ message }: { message: AgentMailMessage }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>
        <span className="font-medium text-foreground/80">From:</span>{" "}
        <span className="font-mono">{message.from ?? "(unknown)"}</span>
      </span>
      <span>
        <span className="font-medium text-foreground/80">At:</span>{" "}
        <span className="font-mono">{formatTs(message.created_ts)}</span>
      </span>
      <span>
        <span className="font-medium text-foreground/80">Message ID:</span>{" "}
        <span className="font-mono">{message.id}</span>
      </span>
      {message.ack_required && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-warning/15 text-warning border border-warning/20">
          ack required
        </span>
      )}
    </div>
  );
}

function MarkdownBody({ body }: { body: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {body}
      </ReactMarkdown>
    </div>
  );
}

function MessageCard({ message, deltaSummary }: { message: AgentMailMessage; deltaSummary?: { valid: number; invalid: number; total: number } }) {
  return (
    <details className="group rounded-xl border border-border bg-card p-4 transition-all">
      <summary className="cursor-pointer list-none space-y-2 touch-manipulation rounded-lg -m-1 p-1 transition-colors active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="flex items-start justify-between gap-4">
          <MessageHeader message={message} />
          <span className="text-xs text-muted-foreground font-mono">{formatTs(message.created_ts)}</span>
        </div>
        <MessageMeta message={message} />
        {deltaSummary && (
          <div className="text-xs text-muted-foreground">
            Parsed deltas:{" "}
            <span className="font-mono text-foreground">{deltaSummary.valid}</span> valid,{" "}
            <span className="font-mono text-foreground">{deltaSummary.invalid}</span> invalid{" "}
            <span className="font-mono">({deltaSummary.total} blocks)</span>
          </div>
        )}
      </summary>

      <div className="pt-4 mt-4 border-t border-border space-y-4">
        {message.commit && (
          <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <span>
                <span className="font-medium text-foreground/80">Commit:</span>{" "}
                <span className="font-mono text-foreground">{message.commit.hexsha.slice(0, 8)}</span>
              </span>
              <span className="font-mono">{message.commit.authored_ts}</span>
              <span>
                +{message.commit.insertions} / -{message.commit.deletions}
              </span>
            </div>
            <div className="mt-1 text-foreground">{message.commit.summary}</div>
          </div>
        )}

        {message.body_md ? (
          <MarkdownBody body={message.body_md} />
        ) : (
          <div className="text-sm text-muted-foreground">No message body.</div>
        )}
      </div>
    </details>
  );
}

type CompiledLintState =
  | {
      ok: true;
      report: ReturnType<typeof lintArtifact>;
      reportHuman: string;
      reportJson: string;
      deltaMessagesAfterCompile: number;
      deltaStats: { deltaMessageCount: number; totalBlocks: number; validBlocks: number; invalidBlocks: number };
      merge: { applied: number; skipped: number; warningCount: number };
    }
  | {
      ok: false;
      error: string;
      deltaMessagesAfterCompile: number;
    };

function computeLintForLatestCompiled(params: {
  threadId: string;
  compiledAt: string;
  compiledVersion: number | null;
  kickoffCreatedAt: string | null;
  messages: AgentMailMessage[];
}): CompiledLintState {
  const compiledMs = Date.parse(params.compiledAt);
  const compiledCutoff = Number.isNaN(compiledMs) ? null : compiledMs;

  const deltaMessages = params.messages.filter((m) => parseSubjectType(m.subject).type === "delta");
  const deltaMessagesAfterCompile =
    compiledCutoff === null
      ? 0
      : deltaMessages.filter((m) => Date.parse(m.created_ts) > compiledCutoff).length;

  const base = createEmptyArtifact(params.threadId);
  const createdAt = params.kickoffCreatedAt ?? params.compiledAt;
  base.metadata.created_at = createdAt;
  base.metadata.updated_at = createdAt;

  const collected: Array<ValidDelta & { timestamp: string; agent: string }> = [];
  let totalBlocks = 0;
  let validBlocks = 0;
  let invalidBlocks = 0;

  for (const message of deltaMessages) {
    if (compiledCutoff !== null && Date.parse(message.created_ts) > compiledCutoff) continue;
    const body = message.body_md ?? "";
    const parsed = parseDeltaMessage(body);
    totalBlocks += parsed.totalBlocks;
    validBlocks += parsed.validCount;
    invalidBlocks += parsed.invalidCount;

    const agent = message.from?.trim() || "unknown";
    const timestamp = message.created_ts;
    for (const delta of parsed.deltas) {
      if (!delta.valid) continue;
      collected.push({ ...delta, timestamp, agent });
    }
  }

  const merge = mergeArtifactWithTimestamps(base, collected);
  if (!merge.ok) {
    return {
      ok: false,
      error: "Merge failed; cannot compute lint report for latest compiled artifact.",
      deltaMessagesAfterCompile,
    };
  }

  const artifact = merge.artifact;
  artifact.metadata.version = params.compiledVersion ?? Math.max(1, artifact.metadata.version);
  artifact.metadata.updated_at = params.compiledAt;
  artifact.metadata.status = "active";

  const report = lintArtifact(artifact);

  return {
    ok: true,
    report,
    reportHuman: formatLintReportHuman(report, params.threadId),
    reportJson: formatLintReportJson(report, params.threadId),
    deltaMessagesAfterCompile,
    deltaStats: {
      deltaMessageCount: deltaMessages.length,
      totalBlocks,
      validBlocks,
      invalidBlocks,
    },
    merge: {
      applied: merge.applied_count,
      skipped: merge.skipped_count,
      warningCount: merge.warnings.length,
    },
  };
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  if (threadId.startsWith(LOCAL_SESSION_PREFIX)) {
    return <LocalSessionHub sessionId={threadId} />;
  }

  if (!isLabModeEnabled()) {
    return <LockedState reason="Lab mode is disabled. Set BRENNER_LAB_MODE=1 to enable orchestration." />;
  }

  const reqHeaders = await headers();
  const reqCookies = await cookies();
  const pageAuth = checkOrchestrationAuth(reqHeaders, reqCookies);
  if (!pageAuth.authorized) {
    return <LockedState reason={pageAuth.reason} />;
  }

  const repoRoot = repoRootFromWebCwd();
  const projectKey = process.env.BRENNER_PROJECT_KEY ?? repoRoot;

  const now = new Date().toISOString();

  let threadMessages: AgentMailMessage[] = [];
  let loadError: string | null = null;

  try {
    const client = new AgentMailClient();
    const thread = await client.readThread({ projectKey, threadId, includeBodies: true });
    threadMessages = thread.messages ?? [];
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Session</h1>
            <div className="mt-1 text-sm text-muted-foreground font-mono">{threadId}</div>
          </div>
          <Link href="/sessions/new" className="text-sm text-primary hover:underline">
            New Session
          </Link>
        </div>

        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="font-semibold text-warning">Failed to load thread</div>
          <div className="mt-1 text-sm text-muted-foreground break-words">{loadError}</div>
        </div>
      </div>
    );
  }

  const messagesSorted = [...threadMessages].sort(
    (a, b) => new Date(a.created_ts).getTime() - new Date(b.created_ts).getTime()
  );

  const status = computeThreadStatusFromThread({
    project: projectKey,
    thread_id: threadId,
    messages: messagesSorted,
  });

  const deltaMessages = messagesSorted
    .filter((m) => parseSubjectType(m.subject).type === "delta")
    .map((m) => {
      const parse = m.body_md ? parseDeltaMessage(m.body_md) : null;
      return { message: m, parse };
    });

  const latestArtifactBody = status.latestArtifact?.message.body_md ?? null;
  const latestCompiledMeta = status.latestArtifact
    ? computeLintForLatestCompiled({
        threadId,
        compiledAt: status.latestArtifact.compiledAt,
        compiledVersion: status.latestArtifact.version,
        kickoffCreatedAt: status.kickoff?.created_ts ?? null,
        messages: messagesSorted,
      })
    : null;
  const kickoffMessage = messagesSorted.find((m) => parseSubjectType(m.subject).type === "kickoff");
  const kickoffSender = kickoffMessage?.from ?? "";
  const kickoffRecipients = kickoffMessage?.to ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <header className="space-y-3 animate-fade-in-up">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Session</h1>
            <div className="text-sm text-muted-foreground font-mono">{threadId}</div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <RefreshControls threadId={threadId} defaultAuto />
            <span className="text-xs text-muted-foreground font-mono">refreshed {now}</span>
            <Link href={`/sessions/${threadId}/evidence`} className="text-sm text-primary hover:underline">
              Evidence Pack
            </Link>
            <Link href={`/sessions/${threadId}/test-queue`} className="text-sm text-primary hover:underline">
              Test Queue
            </Link>
            <Link href="/sessions/new" className="text-sm text-primary hover:underline">
              New Session
            </Link>
          </div>
        </div>
      </header>

      {/* Round Indicator */}
      <section className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-5 space-y-4 animate-fade-in-up stagger-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center size-14 rounded-xl bg-primary/10 border border-primary/20">
              <span className="text-2xl font-bold text-primary">{status.round}</span>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Round</div>
              <div className="font-semibold text-foreground">
                {status.round === 0
                  ? "Initial Collection"
                  : status.round === 1
                    ? "First Compile"
                    : `Iteration ${status.round}`}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="text-center px-4 py-2 rounded-lg bg-muted/50 border border-border">
              <div className="text-lg font-bold text-foreground">{status.deltasInCurrentRound}</div>
              <div className="text-xs text-muted-foreground">deltas this round</div>
            </div>
            {status.round > 0 && (
              <div className="text-center px-4 py-2 rounded-lg bg-muted/50 border border-border">
                <div className="text-lg font-bold text-foreground">{status.critiquesInCurrentRound}</div>
                <div className="text-xs text-muted-foreground">critiques</div>
              </div>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {status.round === 0 ? (
            status.deltasInCurrentRound === 0 ? (
              <>Waiting for agents to submit <span className="font-mono text-foreground">DELTA[...]</span> responses.</>
            ) : (
              <>Collecting responses. When all roles have contributed, run <span className="font-semibold text-primary">Compile</span> to create the first artifact.</>
            )
          ) : status.critiquesInCurrentRound === 0 ? (
            <>Artifact v{status.round} compiled. Send for <span className="font-semibold text-warning">Critique</span> to identify gaps and iterate.</>
          ) : (
            <>Critiques received. Submit new <span className="font-mono text-foreground">DELTA[...]</span> responses addressing feedback, then <span className="font-semibold text-primary">Compile</span> again.</>
          )}
        </div>
      </section>

      {/* Status */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4 animate-fade-in-up stagger-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Phase</div>
            <div className="font-semibold text-foreground">{status.phase.replace(/_/g, " ")}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
              {status.messageCount} messages
            </span>
            {status.latestArtifact && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success border border-success/20">
                compiled{status.latestArtifact.version ? ` v${status.latestArtifact.version}` : ""}
              </span>
            )}
            {status.acks.pendingCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/20">
                {status.acks.pendingCount} pending acks
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(status.roles).map(([role, roleStatus]) => (
            <div key={role} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {formatRoleLabel(role)}
                </div>
                <span className={`text-xs font-medium ${roleStatus.completed ? "text-success" : "text-muted-foreground"}`}>
                  {roleStatus.completed ? "complete" : "pending"}
                </span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {roleStatus.contributors.length > 0 ? (
                  <span className="font-mono">{roleStatus.contributors.join(", ")}</span>
                ) : (
                  <span>(no contributors yet)</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {status.latestArtifact && (
          <div className="text-xs text-muted-foreground">
            Latest artifact compiled at{" "}
            <span className="font-mono text-foreground">{formatTs(status.latestArtifact.compiledAt)}</span>
            {status.latestArtifact.contributors.length > 0 && (
              <>
                {" "}by <span className="font-mono text-foreground">{status.latestArtifact.contributors.join(", ")}</span>
              </>
            )}
            .
          </div>
        )}

        {status.acks.pendingCount > 0 && (
          <div className="text-xs text-warning">
            Awaiting ACK from{" "}
            <span className="font-mono">{status.acks.awaitingFrom.join(", ")}</span>.
          </div>
        )}
      </section>

      <SessionActions
        threadId={threadId}
        projectKey={projectKey}
        defaultSender={kickoffSender}
        defaultRecipients={kickoffRecipients}
        hasCompiledArtifact={Boolean(status.latestArtifact)}
      />

      {/* Compiled Artifact */}
      <section className="space-y-3 animate-fade-in-up stagger-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Compiled <Jargon term="artifact">Artifact</Jargon></h2>
          <span className="text-xs text-muted-foreground">From latest <span className="font-mono">COMPILED:</span> message</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-xl border border-border bg-card p-5">
            {latestArtifactBody ? (
              <MarkdownBody body={latestArtifactBody} />
            ) : (
              <div className="text-sm text-muted-foreground">
                No compiled artifact found yet. Once a <span className="font-mono">COMPILED:</span> message is posted to the thread, it will appear here.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-tight">Lint Report</h3>
              {latestCompiledMeta?.ok && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${latestCompiledMeta.report.valid ? "bg-success/15 text-success border border-success/20" : "bg-destructive/15 text-destructive border border-destructive/20"}`}
                >
                  {latestCompiledMeta.report.valid ? "VALID" : "INVALID"}
                </span>
              )}
            </div>

            {!status.latestArtifact ? (
              <div className="text-sm text-muted-foreground">
                No compiled artifact yet. Run <span className="font-mono">Compile</span> to see lint results.
              </div>
            ) : latestCompiledMeta && !latestCompiledMeta.ok ? (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
                <div className="font-semibold text-warning">Lint unavailable</div>
                <div className="mt-1">{latestCompiledMeta.error}</div>
              </div>
            ) : latestCompiledMeta && latestCompiledMeta.ok ? (
              <>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                    {latestCompiledMeta.report.summary.errors} errors
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                    {latestCompiledMeta.report.summary.warnings} warnings
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                    {latestCompiledMeta.report.summary.info} info
                  </span>
                </div>

                {latestCompiledMeta.deltaMessagesAfterCompile > 0 && (
                  <div className="text-xs text-warning">
                    {latestCompiledMeta.deltaMessagesAfterCompile} DELTA message(s) arrived after this compile. Re-run Compile to refresh.
                  </div>
                )}

                <details className="rounded-lg border border-border bg-muted/30 p-3 transition-all">
                  <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground hover:text-foreground touch-manipulation rounded-md -mx-1 px-1 py-0.5 transition-colors active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Show full lint report
                  </summary>
                  <pre className="mt-2 text-xs font-mono whitespace-pre-wrap rounded-md border border-border bg-background p-3 overflow-auto max-h-[360px]">
                    {latestCompiledMeta.reportHuman}
                  </pre>
                </details>

                <details className="rounded-lg border border-border bg-muted/30 p-3 transition-all">
                  <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground hover:text-foreground touch-manipulation rounded-md -mx-1 px-1 py-0.5 transition-colors active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Show lint report JSON
                  </summary>
                  <pre className="mt-2 text-xs font-mono whitespace-pre-wrap rounded-md border border-border bg-background p-3 overflow-auto max-h-[360px]">
                    {latestCompiledMeta.reportJson}
                  </pre>
                </details>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* Parsed Deltas */}
      <section className="space-y-4 animate-fade-in-up stagger-4">
        <h2 className="text-lg font-semibold tracking-tight">Parsed <Jargon term="delta">Deltas</Jargon></h2>
        {deltaMessages.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No <span className="font-mono">DELTA[...]</span> messages yet.
          </div>
        ) : (
          <div className="space-y-3">
            {deltaMessages.map(({ message, parse }) => (
              <details key={message.id} className="group rounded-xl border border-border bg-card p-4 transition-all">
                <summary className="cursor-pointer list-none space-y-2 touch-manipulation rounded-lg -m-1 p-1 transition-colors active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <MessageHeader message={message} />
                  <MessageMeta message={message} />
                  {parse ? (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-mono text-foreground">{parse.validCount}</span> valid,{" "}
                      <span className="font-mono text-foreground">{parse.invalidCount}</span> invalid{" "}
                      <span className="font-mono">({parse.totalBlocks} blocks)</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No message body to parse.</div>
                  )}
                </summary>

                <div className="pt-4 mt-4 border-t border-border space-y-3">
                  {parse?.deltas?.length ? (
                    <div className="space-y-2">
                      {parse.deltas.map((d, idx) => (
                        <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3">
                          {d.valid ? (
                            <div className="space-y-1">
                              <div className="flex flex-wrap gap-2 items-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success border border-success/20">
                                  {d.operation}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
                                  {d.section}
                                </span>
                                {d.target_id && (
                                  <span className="text-xs text-muted-foreground">
                                    target <span className="font-mono text-foreground">{d.target_id}</span>
                                  </span>
                                )}
                              </div>
                              {d.rationale && (
                                <div className="text-xs text-muted-foreground">
                                  Rationale: <span className="text-foreground/90">{d.rationale}</span>
                                </div>
                              )}
                              <details className="mt-2 transition-all">
                                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground touch-manipulation rounded-md px-1 py-0.5 -mx-1 transition-colors active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                  Show raw JSON
                                </summary>
                                <pre className="mt-2 text-xs font-mono whitespace-pre-wrap rounded-md border border-border bg-background p-3 overflow-auto">
                                  {d.raw}
                                </pre>
                              </details>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/15 text-destructive border border-destructive/20">
                                invalid delta
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {d.error}
                              </div>
                              <details className="transition-all">
                                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground touch-manipulation rounded-md px-1 py-0.5 -mx-1 transition-colors active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                  Show raw JSON
                                </summary>
                                <pre className="mt-2 text-xs font-mono whitespace-pre-wrap rounded-md border border-border bg-background p-3 overflow-auto">
                                  {d.raw}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No delta blocks found.</div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      {/* Timeline */}
      <section className="space-y-4 animate-fade-in-up stagger-5">
        <h2 className="text-lg font-semibold tracking-tight">Thread Timeline</h2>
        {messagesSorted.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No messages found in this thread.
          </div>
        ) : (
          <div className="space-y-3">
            {messagesSorted.map((m) => {
              const parsed = parseSubjectType(m.subject);
              const deltaSummary =
                parsed.type === "delta" && m.body_md
                  ? (() => {
                      const r = parseDeltaMessage(m.body_md);
                      return { valid: r.validCount, invalid: r.invalidCount, total: r.totalBlocks };
                    })()
                  : undefined;
              return <MessageCard key={m.id} message={m} deltaSummary={deltaSummary} />;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
