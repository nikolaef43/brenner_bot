import { isAbsolute, resolve, win32 } from "node:path";
import { headers, cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { AgentMailClient } from "@/lib/agentMail";
import { checkOrchestrationAuth } from "@/lib/auth";
import { composePrompt } from "@/lib/prompts";

export const runtime = "nodejs";

// ============================================================================
// Types
// ============================================================================

interface OperatorSelection {
  hypothesis_generator: string[];
  test_designer: string[];
  adversarial_critic: string[];
}

interface SessionKickoffRequest {
  projectKey?: string;
  sender: string;
  recipients: string[];
  threadId: string;
  subject?: string;
  excerpt: string;
  theme?: string;
  domain?: string;
  question?: string;
  ackRequired?: boolean;
  /** Custom operator selection per role (from prompt builder UI) */
  operatorSelection?: OperatorSelection;
}

interface SessionKickoffResponse {
  success: true;
  threadId: string;
  messageId?: number;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: "VALIDATION_ERROR" | "AUTH_ERROR" | "NETWORK_ERROR" | "SERVER_ERROR";
}

// ============================================================================
// Helpers
// ============================================================================

function repoRootFromWebCwd(): string {
  return resolve(process.cwd(), "../..");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEnsureProjectSlug(result: unknown): string | null {
  if (!isRecord(result)) return null;

  const structuredContent = result.structuredContent;
  if (isRecord(structuredContent) && typeof structuredContent.slug === "string") {
    return structuredContent.slug;
  }

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

function extractMessageId(result: unknown): number | undefined {
  if (!isRecord(result)) return undefined;

  // Check structuredContent first
  const sc = result.structuredContent;
  if (isRecord(sc)) {
    const deliveries = sc.deliveries;
    if (Array.isArray(deliveries) && deliveries.length > 0) {
      const first = deliveries[0];
      if (isRecord(first)) {
        const payload = first.payload;
        if (isRecord(payload) && typeof payload.id === "number") {
          return payload.id;
        }
      }
    }
  }

  return undefined;
}

function normalizeKickoffSubject(threadId: string, rawSubject?: string): string {
  const subject = rawSubject?.trim();

  if (!subject) {
    return `KICKOFF: [${threadId}] Brenner Loop kickoff`;
  }

  return /^KICKOFF:/i.test(subject) ? subject : `KICKOFF: ${subject}`;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<SessionKickoffResponse | ErrorResponse>> {
  // Auth check
  const reqHeaders = await headers();
  const reqCookies = await cookies();
  const authResult = checkOrchestrationAuth(reqHeaders, reqCookies);

  if (!authResult.authorized) {
    return NextResponse.json(
      { success: false, error: authResult.reason, code: "AUTH_ERROR" },
      { status: 401 }
    );
  }

  // Parse body
  let body: SessionKickoffRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // Validate required fields
  const { sender, recipients, threadId, excerpt } = body;

  if (!sender?.trim()) {
    return NextResponse.json(
      { success: false, error: "Missing sender", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const cleanSender = sender.trim();

  if (!threadId?.trim()) {
    return NextResponse.json(
      { success: false, error: "Missing thread ID", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const cleanThreadId = threadId.trim();

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json(
      { success: false, error: "Missing recipients", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const normalizedRecipients = Array.from(
    new Set(
      recipients
        .map((r) => (typeof r === "string" ? r.trim() : ""))
        .filter((r) => r.length > 0)
    )
  );

  if (normalizedRecipients.length === 0) {
    return NextResponse.json(
      { success: false, error: "Missing recipients", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (!excerpt?.trim()) {
    return NextResponse.json(
      { success: false, error: "Missing transcript excerpt", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // Compose and send
  try {
    const projectKey = body.projectKey || process.env.BRENNER_PROJECT_KEY || repoRootFromWebCwd();
    const client = new AgentMailClient();
    const subject = normalizeKickoffSubject(cleanThreadId, body.subject);

    const composedBody = await composePrompt({
      templatePathFromRepoRoot: "metaprompt_by_gpt_52.md",
      excerpt,
      theme: body.theme?.trim(),
      domain: body.domain?.trim(),
      question: body.question?.trim(),
      operatorSelection: body.operatorSelection,
    });

    // Ensure project exists (tools expect project_key to be the human_key / absolute path).
    // NOTE: Treat Windows absolute paths as absolute even on non-Windows runtimes.
    const isAbsoluteProjectKey = isAbsolute(projectKey) || win32.isAbsolute(projectKey);
    if (isAbsoluteProjectKey) {
      const ensured = await client.toolsCall("ensure_project", { human_key: projectKey });
      const ensuredSlug = parseEnsureProjectSlug(ensured);
      if (!ensuredSlug) {
        return NextResponse.json(
          { success: false, error: "Agent Mail: could not resolve project slug", code: "NETWORK_ERROR" },
          { status: 502 }
        );
      }
    }

    // Register sender agent
    await client.toolsCall("register_agent", {
      project_key: projectKey,
      name: cleanSender,
      program: "brenner-web",
      model: "nextjs",
      task_description: `Brenner Bot session: ${cleanThreadId}`,
    });

    // Send message
    const sendResult = await client.toolsCall("send_message", {
      project_key: projectKey,
      sender_name: cleanSender,
      to: normalizedRecipients,
      subject,
      body_md: composedBody,
      thread_id: cleanThreadId,
      ack_required: Boolean(body.ackRequired),
    });

    const messageId = extractMessageId(sendResult);

    return NextResponse.json({
      success: true,
      threadId: cleanThreadId,
      messageId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Distinguish between network errors and server errors
    if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
      return NextResponse.json(
        { success: false, error: `Agent Mail unreachable: ${message}`, code: "NETWORK_ERROR" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { success: false, error: message, code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
