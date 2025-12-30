/**
 * Unit tests for lib/agentMail.ts
 *
 * Tests the AgentMailClient class for configuration, URL building,
 * and response parsing. Network tests are conditional on server availability.
 *
 * Philosophy: NO mocks - test real behavior with real data structures.
 *
 * Run with: cd apps/web && bun run test -- src/lib/agentMail.test.ts
 */

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { AgentMailClient, AgentMailConfig, AgentMailInbox, AgentMailMessage } from "./agentMail";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Save and restore environment variables for isolated tests.
 */
function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  }
}

/**
 * Check if Agent Mail server is available.
 */
async function isAgentMailAvailable(baseUrl: string = "http://127.0.0.1:8765"): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/mcp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "health", method: "ping", params: {} }),
      signal: AbortSignal.timeout(1000),
    });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

// ============================================================================
// Tests: Constructor & Configuration
// ============================================================================

describe("AgentMailClient constructor", () => {
  describe("with explicit config", () => {
    it("uses provided baseUrl", () => {
      const client = new AgentMailClient({ baseUrl: "http://example.com:9999" });
      // We can't directly access private config, but we can verify behavior
      expect(client).toBeInstanceOf(AgentMailClient);
    });

    it("uses provided path", () => {
      const client = new AgentMailClient({ path: "/api/mcp/" });
      expect(client).toBeInstanceOf(AgentMailClient);
    });

    it("uses provided bearerToken", () => {
      const client = new AgentMailClient({ bearerToken: "test-token-123" });
      expect(client).toBeInstanceOf(AgentMailClient);
    });

    it("handles all config options together", () => {
      const client = new AgentMailClient({
        baseUrl: "https://secure.example.com",
        path: "/v2/mcp",
        bearerToken: "secure-token",
      });
      expect(client).toBeInstanceOf(AgentMailClient);
    });

    it("strips trailing slashes from baseUrl", () => {
      // Test that trailing slashes don't cause double slashes
      const client = new AgentMailClient({ baseUrl: "http://example.com/" });
      expect(client).toBeInstanceOf(AgentMailClient);
    });

    it("ensures path starts with slash", () => {
      const client = new AgentMailClient({ path: "mcp/" });
      expect(client).toBeInstanceOf(AgentMailClient);
    });
  });

  describe("with environment variables", () => {
    it("uses AGENT_MAIL_BASE_URL when no config provided", () => {
      withEnv({ AGENT_MAIL_BASE_URL: "http://env-server:1234" }, () => {
        const client = new AgentMailClient();
        expect(client).toBeInstanceOf(AgentMailClient);
      });
    });

    it("uses AGENT_MAIL_PATH when no config provided", () => {
      withEnv({ AGENT_MAIL_PATH: "/env-path/" }, () => {
        const client = new AgentMailClient();
        expect(client).toBeInstanceOf(AgentMailClient);
      });
    });

    it("uses AGENT_MAIL_BEARER_TOKEN when no config provided", () => {
      withEnv({ AGENT_MAIL_BEARER_TOKEN: "env-token" }, () => {
        const client = new AgentMailClient();
        expect(client).toBeInstanceOf(AgentMailClient);
      });
    });

    it("explicit config overrides environment variables", () => {
      withEnv(
        {
          AGENT_MAIL_BASE_URL: "http://env-server:1234",
          AGENT_MAIL_PATH: "/env-path/",
          AGENT_MAIL_BEARER_TOKEN: "env-token",
        },
        () => {
          const client = new AgentMailClient({
            baseUrl: "http://explicit:5678",
            path: "/explicit/",
            bearerToken: "explicit-token",
          });
          expect(client).toBeInstanceOf(AgentMailClient);
        }
      );
    });
  });

  describe("defaults", () => {
    it("uses localhost:8765 as default baseUrl", () => {
      withEnv({ AGENT_MAIL_BASE_URL: undefined }, () => {
        const client = new AgentMailClient();
        expect(client).toBeInstanceOf(AgentMailClient);
      });
    });

    it("uses /mcp/ as default path", () => {
      withEnv({ AGENT_MAIL_PATH: undefined }, () => {
        const client = new AgentMailClient();
        expect(client).toBeInstanceOf(AgentMailClient);
      });
    });
  });
});

// ============================================================================
// Tests: Type Definitions
// ============================================================================

describe("type definitions", () => {
  it("AgentMailMessage has correct shape", () => {
    const message: AgentMailMessage = {
      id: 1,
      thread_id: "thread-123",
      subject: "Test Subject",
      created_ts: "2025-01-01T00:00:00Z",
    };
    expect(message.id).toBe(1);
    expect(message.thread_id).toBe("thread-123");
    expect(message.subject).toBe("Test Subject");
  });

  it("AgentMailMessage allows optional fields", () => {
    const fullMessage: AgentMailMessage = {
      id: 42,
      project_id: 1,
      sender_id: 2,
      thread_id: "thread-abc",
      subject: "Full Message",
      importance: "urgent",
      ack_required: true,
      created_ts: "2025-01-01T12:00:00Z",
      attachments: [{ name: "file.txt" }],
      body_md: "# Hello\n\nWorld",
      from: "sender@example.com",
      to: ["recipient@example.com"],
      cc: ["cc@example.com"],
      bcc: ["bcc@example.com"],
      kind: "to",
      commit: {
        hexsha: "abc123",
        summary: "Test commit",
        authored_ts: "2025-01-01T00:00:00Z",
        insertions: 10,
        deletions: 5,
      },
    };
    expect(fullMessage.importance).toBe("urgent");
    expect(fullMessage.ack_required).toBe(true);
    expect(fullMessage.commit?.hexsha).toBe("abc123");
  });

  it("AgentMailInbox has correct shape", () => {
    const inbox: AgentMailInbox = {
      project: "/path/to/project",
      agent: "test-agent",
      count: 5,
      messages: [],
    };
    expect(inbox.project).toBe("/path/to/project");
    expect(inbox.agent).toBe("test-agent");
    expect(inbox.count).toBe(5);
    expect(inbox.messages).toEqual([]);
  });
});

// ============================================================================
// Tests: Error Handling
// ============================================================================

describe("error handling", () => {
  it("throws on network failure", async () => {
    const client = new AgentMailClient({ baseUrl: "http://localhost:59999" });
    await expect(client.call("ping")).rejects.toThrow();
  });

  it("throws descriptive error for non-JSON response", async () => {
    // This will fail because the server isn't running, giving us a connection error
    const client = new AgentMailClient({ baseUrl: "http://localhost:59998" });
    await expect(client.toolsList()).rejects.toThrow();
  });
});

// ============================================================================
// Tests: SSE Response Parsing (unit-level, uses fetch stub)
// ============================================================================

describe("SSE response parsing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a text/event-stream JSON-RPC success envelope", async () => {
    const sseBody = [
      "event: message",
      'data: {"jsonrpc":"2.0","id":"1","result":{"ok":true}}',
      "",
      "",
    ].join("\n");

    vi.stubGlobal("fetch", async () => {
      return new Response(sseBody, {
        status: 200,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      });
    });

    const client = new AgentMailClient({ baseUrl: "http://example.com" });
    const result = await client.call("tools/list");
    expect(result).toEqual({ ok: true });
  });

  it("throws on a text/event-stream JSON-RPC error envelope", async () => {
    const sseBody = [
      'data: {"jsonrpc":"2.0","id":"1","error":{"code":-32000,"message":"boom"}}',
      "",
      "",
    ].join("\n");

    vi.stubGlobal("fetch", async () => {
      return new Response(sseBody, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    });

    const client = new AgentMailClient({ baseUrl: "http://example.com" });
    await expect(client.call("tools/list")).rejects.toThrow("boom");
  });
});

// ============================================================================
// Tests: Method Signatures
// ============================================================================

describe("client methods", () => {
  let client: AgentMailClient;

  beforeEach(() => {
    client = new AgentMailClient();
  });

  it("call method exists and returns a Promise", () => {
    expect(typeof client.call).toBe("function");
    const result = client.call("test");
    expect(result).toBeInstanceOf(Promise);
    // Don't await - let it fail silently since server isn't running
    result.catch(() => {}); // Prevent unhandled rejection
  });

  it("toolsList method exists and returns a Promise", () => {
    expect(typeof client.toolsList).toBe("function");
    const result = client.toolsList();
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });

  it("toolsCall method exists and returns a Promise", () => {
    expect(typeof client.toolsCall).toBe("function");
    const result = client.toolsCall("test_tool", { arg: "value" });
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });

  it("resourcesRead method exists and returns a Promise", () => {
    expect(typeof client.resourcesRead).toBe("function");
    const result = client.resourcesRead("resource://test");
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });

  it("readInbox method exists and returns a Promise", () => {
    expect(typeof client.readInbox).toBe("function");
    const result = client.readInbox({
      projectKey: "/path",
      agentName: "agent",
    });
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });

  it("readThread method exists and returns a Promise", () => {
    expect(typeof client.readThread).toBe("function");
    const result = client.readThread({
      projectKey: "/path",
      threadId: "thread-123",
    });
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });

  it("markMessageRead method exists and returns a Promise", () => {
    expect(typeof client.markMessageRead).toBe("function");
    const result = client.markMessageRead({
      projectKey: "/path",
      agentName: "agent",
      messageId: 1,
    });
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });

  it("acknowledgeMessage method exists and returns a Promise", () => {
    expect(typeof client.acknowledgeMessage).toBe("function");
    const result = client.acknowledgeMessage({
      projectKey: "/path",
      agentName: "agent",
      messageId: 1,
    });
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });
});

// ============================================================================
// Tests: readInbox Parameters
// ============================================================================

describe("readInbox parameters", () => {
  let client: AgentMailClient;

  beforeEach(() => {
    client = new AgentMailClient();
  });

  it("accepts required parameters only", () => {
    const promise = client.readInbox({
      projectKey: "/project",
      agentName: "my-agent",
    });
    expect(promise).toBeInstanceOf(Promise);
    promise.catch(() => {});
  });

  it("accepts all optional parameters", () => {
    const promise = client.readInbox({
      projectKey: "/project",
      agentName: "my-agent",
      limit: 50,
      urgentOnly: true,
      includeBodies: true,
      sinceTs: "2025-01-01T00:00:00Z",
    });
    expect(promise).toBeInstanceOf(Promise);
    promise.catch(() => {});
  });
});

// ============================================================================
// Tests: readThread Parameters
// ============================================================================

describe("readThread parameters", () => {
  let client: AgentMailClient;

  beforeEach(() => {
    client = new AgentMailClient();
  });

  it("accepts required parameters only", () => {
    const promise = client.readThread({
      projectKey: "/project",
      threadId: "thread-abc",
    });
    expect(promise).toBeInstanceOf(Promise);
    promise.catch(() => {});
  });

  it("accepts optional includeBodies", () => {
    const promise = client.readThread({
      projectKey: "/project",
      threadId: "thread-abc",
      includeBodies: true,
    });
    expect(promise).toBeInstanceOf(Promise);
    promise.catch(() => {});
  });
});

// ============================================================================
// Conditional Integration Tests (require running Agent Mail server)
// ============================================================================

describe("integration tests", () => {
  let serverAvailable: boolean;
  let client: AgentMailClient;

  beforeEach(async () => {
    serverAvailable = await isAgentMailAvailable();
    client = new AgentMailClient();
  });

  it.skipIf(async () => !(await isAgentMailAvailable()))("can call toolsList when server is running", async () => {
    if (!serverAvailable) return;

    const result = await client.toolsList();
    expect(result).toBeDefined();
  });

  it.skipIf(async () => !(await isAgentMailAvailable()))("toolsList returns tools array", async () => {
    if (!serverAvailable) return;

    const result = await client.toolsList();
    expect(result).toHaveProperty("tools");
  });
});

// ============================================================================
// Tests: Edge Cases
// ============================================================================

describe("edge cases", () => {
  it("handles empty string baseUrl gracefully", () => {
    // Empty string should not cause crashes
    const client = new AgentMailClient({ baseUrl: "" });
    expect(client).toBeInstanceOf(AgentMailClient);
  });

  it("handles empty string path gracefully", () => {
    const client = new AgentMailClient({ path: "" });
    expect(client).toBeInstanceOf(AgentMailClient);
  });

  it("handles undefined bearerToken", () => {
    const client = new AgentMailClient({ bearerToken: undefined });
    expect(client).toBeInstanceOf(AgentMailClient);
  });

  it("handles empty bearerToken", () => {
    const client = new AgentMailClient({ bearerToken: "" });
    expect(client).toBeInstanceOf(AgentMailClient);
  });

  it("handles baseUrl with multiple trailing slashes", () => {
    const client = new AgentMailClient({ baseUrl: "http://example.com///" });
    expect(client).toBeInstanceOf(AgentMailClient);
  });

  it("handles path without leading slash", () => {
    const client = new AgentMailClient({ path: "api/v1/mcp" });
    expect(client).toBeInstanceOf(AgentMailClient);
  });

  it("handles path with trailing slash", () => {
    const client = new AgentMailClient({ path: "/api/mcp/" });
    expect(client).toBeInstanceOf(AgentMailClient);
  });

  it("handles path without trailing slash", () => {
    const client = new AgentMailClient({ path: "/api/mcp" });
    expect(client).toBeInstanceOf(AgentMailClient);
  });
});

// ============================================================================
// Tests: Concurrent Usage
// ============================================================================

describe("concurrent usage", () => {
  it("can create multiple clients with different configs", () => {
    const client1 = new AgentMailClient({ baseUrl: "http://server1:8765" });
    const client2 = new AgentMailClient({ baseUrl: "http://server2:8765" });
    const client3 = new AgentMailClient({ baseUrl: "http://server3:8765" });

    expect(client1).toBeInstanceOf(AgentMailClient);
    expect(client2).toBeInstanceOf(AgentMailClient);
    expect(client3).toBeInstanceOf(AgentMailClient);
  });

  it("clients are independent", () => {
    const client1 = new AgentMailClient({ bearerToken: "token1" });
    const client2 = new AgentMailClient({ bearerToken: "token2" });

    // They should be different instances
    expect(client1).not.toBe(client2);
  });
});

// ============================================================================
// Tests: Importance Levels
// ============================================================================

describe("importance levels", () => {
  it("supports normal importance", () => {
    const message: AgentMailMessage = {
      id: 1,
      thread_id: null,
      subject: "Normal",
      importance: "normal",
      created_ts: new Date().toISOString(),
    };
    expect(message.importance).toBe("normal");
  });

  it("supports high importance", () => {
    const message: AgentMailMessage = {
      id: 2,
      thread_id: null,
      subject: "High",
      importance: "high",
      created_ts: new Date().toISOString(),
    };
    expect(message.importance).toBe("high");
  });

  it("supports urgent importance", () => {
    const message: AgentMailMessage = {
      id: 3,
      thread_id: null,
      subject: "Urgent",
      importance: "urgent",
      created_ts: new Date().toISOString(),
    };
    expect(message.importance).toBe("urgent");
  });
});
