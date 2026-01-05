import { resolve } from "node:path";
import { headers, cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { AgentMailClient } from "@/lib/agentMail";
import { checkOrchestrationAuth } from "@/lib/auth";
import { parseSubjectType } from "@/lib/threadStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function repoRootFromWebCwd(): string {
  return resolve(process.cwd(), "../..");
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseNonNegativeInt(value: string | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type ThreadUpdatePayload = {
  threadId: string;
  latestMessageId: number;
  newCount: number;
  newMessages: Array<{
    id: number;
    created_ts: string;
    subject: string;
    from?: string;
    subjectType: ReturnType<typeof parseSubjectType>["type"];
    role?: string;
  }>;
};

function formatSseEvent(params: {
  id?: number;
  event: string;
  data?: unknown;
  retryMs?: number;
  comment?: string;
}): string {
  const lines: string[] = [];

  if (params.comment) lines.push(`: ${params.comment}`);
  if (typeof params.retryMs === "number") lines.push(`retry: ${params.retryMs}`);
  if (typeof params.id === "number") lines.push(`id: ${params.id}`);
  lines.push(`event: ${params.event}`);

  if (params.data !== undefined) {
    const json = JSON.stringify(params.data);
    for (const line of json.split(/\r?\n/)) {
      lines.push(`data: ${line}`);
    }
  }

  lines.push("", "");
  return lines.join("\n");
}

export async function GET(request: NextRequest): Promise<Response> {
  const reqHeaders = await headers();
  const reqCookies = await cookies();
  const auth = checkOrchestrationAuth(reqHeaders, reqCookies);

  if (!auth.authorized) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const threadId = url.searchParams.get("threadId")?.trim();

  if (!threadId) {
    return new Response("Missing threadId query param", { status: 400 });
  }

  const projectKey =
    url.searchParams.get("projectKey")?.trim() ||
    process.env.BRENNER_PROJECT_KEY ||
    repoRootFromWebCwd();

  const pollIntervalMs = clamp(parsePositiveInt(url.searchParams.get("pollIntervalMs")) ?? 2000, 500, 10_000);

  const lastEventIdHeader = request.headers.get("last-event-id");
  const cursor =
    parseNonNegativeInt(url.searchParams.get("cursor")) ?? parseNonNegativeInt(lastEventIdHeader);

  const encoder = new TextEncoder();

  let lastSeenMessageId: number | null = cursor;
  let started = false;
  let inFlight = false;

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let abortHandler: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const client = new AgentMailClient();

      const send = (data: string) => {
        controller.enqueue(encoder.encode(data));
      };

      send(
        formatSseEvent({
          event: "connected",
          retryMs: 3000,
          comment: "brennerbot realtime",
        }),
      );

      const pollOnce = async () => {
        if (request.signal.aborted) return;
        if (inFlight) return;
        inFlight = true;

        try {
          const thread = await client.readThread({
            projectKey,
            threadId,
            includeBodies: false,
          });

          const messages = thread.messages ?? [];
          const latestMessageId = messages.reduce((max, msg) => Math.max(max, msg.id ?? 0), 0);

          if (!started) {
            started = true;
            if (lastSeenMessageId === null) lastSeenMessageId = latestMessageId;

            send(
              formatSseEvent({
                id: lastSeenMessageId ?? latestMessageId,
                event: "ready",
                data: { threadId, latestMessageId },
              }),
            );
            return;
          }

          if (lastSeenMessageId !== null && latestMessageId <= lastSeenMessageId) {
            send(formatSseEvent({ event: "ping", comment: "idle" }));
            return;
          }

          const baseline = lastSeenMessageId ?? 0;
          const newMessages = messages
            .filter((msg) => msg.id > baseline)
            .sort((a, b) => a.id - b.id)
            .slice(-25)
            .map((msg) => {
              const parsed = parseSubjectType(msg.subject ?? "");
              return {
                id: msg.id,
                created_ts: msg.created_ts,
                subject: msg.subject,
                from: msg.from,
                subjectType: parsed.type,
                role: parsed.role,
              };
            });

          const payload: ThreadUpdatePayload = {
            threadId,
            latestMessageId,
            newCount: messages.filter((msg) => msg.id > baseline).length,
            newMessages,
          };

          lastSeenMessageId = latestMessageId;

          send(
            formatSseEvent({
              id: latestMessageId,
              event: "thread_update",
              data: payload,
            }),
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          send(
            formatSseEvent({
              event: "error",
              data: { threadId, error: message },
            }),
          );
        } finally {
          inFlight = false;
        }
      };

      intervalId = setInterval(() => {
        void pollOnce();
      }, pollIntervalMs);

      abortHandler = () => {
        if (intervalId) clearInterval(intervalId);
        try {
          controller.close();
        } catch {}
        if (abortHandler) {
          request.signal.removeEventListener("abort", abortHandler);
        }
      };

      request.signal.addEventListener("abort", abortHandler, { once: true });

      void pollOnce();
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
      if (abortHandler) {
        request.signal.removeEventListener("abort", abortHandler);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
