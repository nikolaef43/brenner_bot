import { describe, expect, it, vi } from "vitest";

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
});

