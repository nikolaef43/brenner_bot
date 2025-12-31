import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentMailThread } from "@/lib/agentMail";

const readThreadMock = vi.hoisted(() =>
  vi.fn(async (args: { projectKey: string; threadId: string; includeBodies?: boolean }): Promise<AgentMailThread> => ({
    project: args.projectKey,
    thread_id: args.threadId,
    messages: [],
  }))
);

const toolsCallMock = vi.hoisted(() =>
  vi.fn(async (tool: string) => {
    if (tool === "ensure_project") return { structuredContent: { slug: "test-project" } };
    if (tool === "send_message") {
      return { structuredContent: { deliveries: [{ payload: { id: 123 } }] } };
    }
    return { structuredContent: {} };
  })
);

vi.mock("@/lib/agentMail", () => ({
  AgentMailClient: class AgentMailClientMock {
    readThread = readThreadMock;
    toolsCall = toolsCallMock;
  },
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({}),
}));

vi.mock("@/lib/auth", () => ({
  checkOrchestrationAuth: () => ({ authorized: true, reason: "ok" }),
}));

import type { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

describe("POST /api/sessions/actions", () => {
  const originalProjectKey = process.env.BRENNER_PROJECT_KEY;

  beforeEach(() => {
    toolsCallMock.mockClear();
    readThreadMock.mockClear();
  });

  afterEach(() => {
    if (originalProjectKey === undefined) {
      delete process.env.BRENNER_PROJECT_KEY;
    } else {
      process.env.BRENNER_PROJECT_KEY = originalProjectKey;
    }
  });

  it("returns a compile preview when DELTA messages exist", async () => {
    readThreadMock.mockResolvedValueOnce({
      project: "/data/projects/brenner_bot",
      thread_id: "TEST-1",
      messages: [
        {
          id: 1,
          thread_id: "TEST-1",
          subject: "DELTA[gpt]: Research thread seed",
          created_ts: "2025-01-01T00:00:00Z",
          body_md: [
            "```delta",
            JSON.stringify({
              operation: "EDIT",
              section: "research_thread",
              target_id: null,
              payload: {
                statement: "Test statement",
                context: "Test context",
                why_it_matters: "Test why",
                anchors: ["§1"],
              },
            }),
            "```",
          ].join("\n"),
          from: "Codex",
        },
      ],
    });

    const response = await POST(makeRequest({ action: "compile", threadId: "TEST-1" }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({
      success: true,
      action: "compile",
      threadId: "TEST-1",
      version: 1,
    });
    const artifactMarkdown = (json as { artifactMarkdown?: unknown }).artifactMarkdown;
    expect(String(artifactMarkdown)).toContain("# Brenner Protocol Artifact: TEST-1");
  });

  it("publishes a COMPILED message with the compiled artifact body", async () => {
    readThreadMock.mockResolvedValueOnce({
      project: "/data/projects/brenner_bot",
      thread_id: "TEST-2",
      messages: [
        {
          id: 1,
          thread_id: "TEST-2",
          subject: "DELTA[gpt]: Research thread seed",
          created_ts: "2025-01-01T00:00:00Z",
          body_md: [
            "```delta",
            JSON.stringify({
              operation: "EDIT",
              section: "research_thread",
              target_id: null,
              payload: {
                statement: "Test statement",
                context: "Test context",
                why_it_matters: "Test why",
              },
            }),
            "```",
          ].join("\n"),
          from: "Codex",
        },
      ],
    });

    const response = await POST(
      makeRequest({
        action: "publish",
        threadId: "TEST-2",
        sender: "Operator",
        recipients: ["Claude"],
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({
      success: true,
      action: "publish",
      threadId: "TEST-2",
      version: 1,
      messageId: 123,
    });

    expect(toolsCallMock).toHaveBeenCalledWith("send_message", expect.objectContaining({
      thread_id: "TEST-2",
    }));
  });

  it("posts a DELTA message when bodyMd contains a delta block", async () => {
    const deltaBody = [
      "Here are experiment deltas.",
      "",
      "```delta",
      JSON.stringify({
        operation: "EDIT",
        section: "research_thread",
        target_id: null,
        payload: { context: "Observed X" },
        rationale: "Record experiment outcome",
      }),
      "```",
      "",
    ].join("\n");

    const response = await POST(
      makeRequest({
        action: "post_delta",
        threadId: "TEST-DELTA",
        sender: "Operator",
        recipients: ["Claude"],
        subject: "Experiment T1 result",
        bodyMd: deltaBody,
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({
      success: true,
      action: "post_delta",
      threadId: "TEST-DELTA",
      messageId: 123,
    });

    expect(toolsCallMock).toHaveBeenCalledWith("send_message", expect.objectContaining({
      subject: expect.stringMatching(/^DELTA\[/),
      body_md: deltaBody.trim(),
      thread_id: "TEST-DELTA",
    }));
  });

  it("rejects post_delta when bodyMd does not include a delta block", async () => {
    const response = await POST(
      makeRequest({
        action: "post_delta",
        threadId: "TEST-NO-DELTA",
        sender: "Operator",
        recipients: ["Claude"],
        subject: "DELTA[human]: no blocks",
        bodyMd: "no delta blocks here",
      })
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toMatchObject({
      success: false,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects critique requests when no compiled artifact exists", async () => {
    readThreadMock.mockResolvedValueOnce({
      project: "/data/projects/brenner_bot",
      thread_id: "TEST-3",
      messages: [],
    });

    const response = await POST(
      makeRequest({
        action: "request_critique",
        threadId: "TEST-3",
        sender: "Operator",
        recipients: ["Codex"],
      })
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toMatchObject({
      success: false,
      code: "VALIDATION_ERROR",
    });
  });

  it("sends a QUESTION critique request when a compiled artifact exists", async () => {
    readThreadMock.mockResolvedValueOnce({
      project: "/data/projects/brenner_bot",
      thread_id: "TEST-4",
      messages: [
        {
          id: 10,
          thread_id: "TEST-4",
          subject: "COMPILED: v2 artifact",
          created_ts: "2025-01-01T00:02:00Z",
          body_md: "# Brenner Protocol Artifact: TEST-4\n",
          from: "Operator",
        },
      ],
    });

    const response = await POST(
      makeRequest({
        action: "request_critique",
        threadId: "TEST-4",
        sender: "Operator",
        recipients: ["Codex", "Gemini"],
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({
      success: true,
      action: "request_critique",
      threadId: "TEST-4",
      version: 2,
      messageId: 123,
    });

    expect(toolsCallMock).toHaveBeenCalledWith("send_message", expect.objectContaining({
      subject: expect.stringMatching(/^QUESTION:/),
      thread_id: "TEST-4",
    }));
  });

  it("defaults to BRENNER_PROJECT_KEY when body.projectKey is omitted", async () => {
    process.env.BRENNER_PROJECT_KEY = "/abs/from/env";

    readThreadMock.mockResolvedValueOnce({
      project: "/abs/from/env",
      thread_id: "TEST-ENV",
      messages: [
        {
          id: 1,
          thread_id: "TEST-ENV",
          subject: "DELTA[gpt]: Research thread seed",
          created_ts: "2025-01-01T00:00:00Z",
          body_md: [
            "```delta",
            JSON.stringify({
              operation: "EDIT",
              section: "research_thread",
              target_id: null,
              payload: {
                statement: "Test statement",
                context: "Test context",
                why_it_matters: "Test why",
              },
            }),
            "```",
          ].join("\n"),
          from: "Codex",
        },
      ],
    });

    const response = await POST(
      makeRequest({
        action: "publish",
        threadId: "TEST-ENV",
        sender: "Operator",
        recipients: ["Claude"],
      })
    );

    expect(response.status).toBe(200);
    await response.json();

    expect(toolsCallMock).toHaveBeenCalledWith("ensure_project", { human_key: "/abs/from/env" });
  });
});
