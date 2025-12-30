import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    toolsCall = toolsCallMock;
  },
}));

vi.mock("@/lib/prompts", () => ({
  composePrompt: async () => "COMPOSED",
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

describe("POST /api/sessions", () => {
  const originalProjectKey = process.env.BRENNER_PROJECT_KEY;

  beforeEach(() => {
    toolsCallMock.mockClear();
  });

  afterEach(() => {
    if (originalProjectKey === undefined) {
      delete process.env.BRENNER_PROJECT_KEY;
    } else {
      process.env.BRENNER_PROJECT_KEY = originalProjectKey;
    }
  });

  it("rejects recipients that become empty after trimming", async () => {
    const response = await POST(
      makeRequest({
        sender: "Operator",
        recipients: [" "],
        threadId: "TEST-1",
        excerpt: "### Excerpt\n\n> **§1**: \"Hello\"\n",
      })
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toMatchObject({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Missing recipients",
    });
  });

  it.each([
    ["/abs/path/to/repo"],
    ["C:\\repo\\brenner_bot"],
    ["\\\\server\\share\\brenner_bot"],
  ])("calls ensure_project for absolute projectKey: %s", async (projectKey) => {
    const response = await POST(
      makeRequest({
        projectKey,
        sender: "Operator",
        recipients: ["Claude"],
        threadId: "TEST-ABS",
        excerpt: "### Excerpt\n\n> **§1**: \"Hello\"\n",
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ success: true, threadId: "TEST-ABS" });

    expect(toolsCallMock).toHaveBeenCalledWith("ensure_project", { human_key: projectKey });
  });

  it("does not call ensure_project for relative projectKey", async () => {
    const response = await POST(
      makeRequest({
        projectKey: "relative/repo",
        sender: "Operator",
        recipients: ["Claude"],
        threadId: "TEST-REL",
        excerpt: "### Excerpt\n\n> **§1**: \"Hello\"\n",
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ success: true, threadId: "TEST-REL" });

    expect(toolsCallMock.mock.calls.some(([tool]) => tool === "ensure_project")).toBe(false);
  });

  it("defaults to BRENNER_PROJECT_KEY when body.projectKey is omitted", async () => {
    process.env.BRENNER_PROJECT_KEY = "/abs/from/env";

    const response = await POST(
      makeRequest({
        sender: "Operator",
        recipients: ["Claude"],
        threadId: "TEST-ENV",
        excerpt: "### Excerpt\n\n> **§1**: \"Hello\"\n",
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ success: true, threadId: "TEST-ENV" });

    expect(toolsCallMock).toHaveBeenCalledWith("ensure_project", { human_key: "/abs/from/env" });
  });
});
