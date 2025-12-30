/**
 * Tests for Thread Status Computation
 *
 * Uses real message fixtures to test status computation logic.
 */

import { describe, it, expect } from "vitest";
import type { AgentMailThread, AgentMailMessage } from "./agentMail";
import {
  computeThreadStatus,
  computeThreadStatusSummary,
  isWaitingForRole,
  getPendingAgents,
  getAgentsWithPendingAcks,
  parseSubjectType,
  extractVersion,
  formatThreadStatusSummary,
  type ThreadStatus,
  type SessionPhase,
} from "./thread-status";

// ============================================================================
// Test Fixtures
// ============================================================================

function makeMessage(overrides: Partial<AgentMailMessage> = {}): AgentMailMessage {
  return {
    id: 1,
    thread_id: "test-thread",
    subject: "Test message",
    created_ts: new Date().toISOString(),
    ...overrides,
  };
}

function makeThread(messages: AgentMailMessage[]): AgentMailThread {
  return {
    project: "/test/project",
    thread_id: "test-thread",
    messages,
  };
}

// ============================================================================
// Subject Parsing Tests
// ============================================================================

describe("parseSubjectType", () => {
  it("should parse KICKOFF messages", () => {
    const parsed = parseSubjectType("KICKOFF: Research question");
    expect(parsed.type).toBe("kickoff");
  });

  it("should parse DELTA messages with role shorthand", () => {
    const parsed = parseSubjectType("DELTA[opus]: Test design");
    expect(parsed.type).toBe("delta");
    expect(parsed.shorthand).toBe("opus");
    expect(parsed.role).toBe("test_designer");
  });

  it("should parse COMPILED messages", () => {
    const parsed = parseSubjectType("COMPILED: Final artifact");
    expect(parsed.type).toBe("compiled");
  });

  it("should parse legacy ARTIFACT messages", () => {
    const parsed = parseSubjectType("ARTIFACT: v1");
    expect(parsed.type).toBe("compiled");
  });

  it("should parse ACK messages", () => {
    const parsed = parseSubjectType("ACK: Acknowledged");
    expect(parsed.type).toBe("ack");
  });

  it("should parse CRITIQUE messages", () => {
    const parsed = parseSubjectType("CRITIQUE: Problems found");
    expect(parsed.type).toBe("critique");
  });

  it("should return unknown for unrecognized messages", () => {
    const parsed = parseSubjectType("Random subject line");
    expect(parsed.type).toBe("unknown");
  });
});

describe("extractVersion", () => {
  it("should extract version number", () => {
    expect(extractVersion("COMPILED: v3 artifact")).toBe(3);
    expect(extractVersion("ARTIFACT: v12")).toBe(12);
  });

  it("should return null when no version", () => {
    expect(extractVersion("COMPILED: Final version")).toBeNull();
  });
});

// ============================================================================
// computeThreadStatus Tests
// ============================================================================

describe("computeThreadStatus", () => {
  describe("empty thread", () => {
    it("should handle thread with no messages", () => {
      const thread = makeThread([]);
      const status = computeThreadStatus(thread);

      expect(status.threadId).toBe("test-thread");
      expect(status.messageCount).toBe(0);
      expect(status.participants).toHaveLength(0);
      expect(status.roleList).toHaveLength(3); // All roles initialized
      expect(status.latestArtifact).toBeNull();
      expect(status.phase).toBe("not_started");
    });
  });

  describe("kickoff phase", () => {
    it("should detect kickoff message", () => {
      const thread = makeThread([
        makeMessage({
          id: 1,
          from: "Orchestrator",
          subject: "KICKOFF: [RS-001] Research question",
          to: ["Codex", "Opus", "Gemini"],
          ack_required: true,
        }),
      ]);

      const status = computeThreadStatus(thread);
      expect(status.phase).toBe("awaiting_responses");
      expect(status.isComplete).toBe(false);
      expect(status.kickoff).not.toBeNull();
    });
  });

  describe("gathering phase", () => {
    it("should detect responses from participants", () => {
      const thread = makeThread([
        makeMessage({
          id: 1,
          from: "Orchestrator",
          subject: "KICKOFF: [RS-001] Research question",
          to: ["Codex", "Opus", "Gemini"],
          created_ts: "2025-01-01T00:00:00Z",
        }),
        makeMessage({
          id: 2,
          from: "Codex",
          subject: "DELTA[gpt]: Initial hypotheses",
          created_ts: "2025-01-01T01:00:00Z",
        }),
      ]);

      const status = computeThreadStatus(thread);
      // Only hypothesis_generator has responded, so phase is partially_complete
      expect(status.phase).toBe("partially_complete");

      // Find Codex participant
      const codex = status.participants.find((p) => p.agentName === "Codex");
      expect(codex).toBeDefined();
      expect(codex?.hasResponded).toBe(true);
      expect(codex?.role.role).toBe("hypothesis_generator");
    });

    it("should track role completion", () => {
      const thread = makeThread([
        makeMessage({
          id: 1,
          from: "Orchestrator",
          subject: "KICKOFF: [RS-001] Research question",
          to: ["Codex", "Opus", "Gemini"],
          created_ts: "2025-01-01T00:00:00Z",
        }),
        makeMessage({
          id: 2,
          from: "Codex",
          subject: "DELTA[gpt]: Hypotheses",
          created_ts: "2025-01-01T01:00:00Z",
        }),
        makeMessage({
          id: 3,
          from: "Opus",
          subject: "DELTA[opus]: Tests",
          created_ts: "2025-01-01T02:00:00Z",
        }),
        makeMessage({
          id: 4,
          from: "Gemini",
          subject: "DELTA[gemini]: Critiques",
          created_ts: "2025-01-01T03:00:00Z",
        }),
      ]);

      const status = computeThreadStatus(thread);
      expect(status.isComplete).toBe(true);
      expect(status.phase).toBe("awaiting_compilation");
    });
  });

  describe("compiled phase", () => {
    it("should detect compiled message", () => {
      const thread = makeThread([
        makeMessage({
          id: 1,
          from: "Orchestrator",
          subject: "KICKOFF: [RS-001] Research question",
          to: ["Codex"],
          created_ts: "2025-01-01T00:00:00Z",
        }),
        makeMessage({
          id: 2,
          from: "Codex",
          subject: "DELTA[gpt]: Hypotheses",
          created_ts: "2025-01-01T01:00:00Z",
        }),
        makeMessage({
          id: 3,
          from: "Compiler",
          subject: "COMPILED: RS-001 v1",
          created_ts: "2025-01-01T04:00:00Z",
        }),
      ]);

      const status = computeThreadStatus(thread);
      expect(status.phase).toBe("compiled");
      expect(status.latestArtifact).not.toBeNull();
      expect(status.latestArtifact?.subject).toBe("COMPILED: RS-001 v1");
      expect(status.latestArtifact?.from).toBe("Compiler");
      expect(status.latestArtifact?.version).toBe(1);
    });

    it("should find latest artifact when multiple exist", () => {
      const thread = makeThread([
        makeMessage({
          id: 1,
          from: "Compiler",
          subject: "ARTIFACT: v1",
          created_ts: "2025-01-01T01:00:00Z",
        }),
        makeMessage({
          id: 2,
          from: "Compiler",
          subject: "ARTIFACT: v2",
          created_ts: "2025-01-01T02:00:00Z",
        }),
        makeMessage({
          id: 3,
          from: "Compiler",
          subject: "ARTIFACT: v3",
          created_ts: "2025-01-01T03:00:00Z",
        }),
      ]);

      const status = computeThreadStatus(thread);
      expect(status.latestArtifact?.subject).toBe("ARTIFACT: v3");
      expect(status.latestArtifact?.messageId).toBe(3);
      expect(status.latestArtifact?.version).toBe(3);
    });
  });

  describe("pending acknowledgements", () => {
    it("should track pending acks from kickoff", () => {
      const thread = makeThread([
        makeMessage({
          id: 1,
          from: "Operator",
          subject: "KICKOFF: Research",
          to: ["Agent1", "Agent2"],
          ack_required: true,
        }),
        makeMessage({
          id: 2,
          from: "Agent1",
          subject: "ACK: Received",
        }),
      ]);

      const status = computeThreadStatus(thread);
      // Agent2 hasn't acked
      expect(status.acks.pendingCount).toBe(1);
      expect(status.acks.awaitingFrom).toContain("Agent2");
      expect(status.acks.awaitingFrom).not.toContain("Agent1");
    });

    it("should track message counts requiring ack per agent", () => {
      const thread = makeThread([
        makeMessage({
          id: 1,
          from: "Agent1",
          subject: "Message requiring ack",
          ack_required: true,
        }),
        makeMessage({
          id: 2,
          from: "Agent1",
          subject: "Another message requiring ack",
          ack_required: true,
        }),
        makeMessage({
          id: 3,
          from: "Agent2",
          subject: "No ack needed",
          ack_required: false,
        }),
      ]);

      const status = computeThreadStatus(thread);
      const agent1 = status.participants.find((p) => p.agentName === "Agent1");
      expect(agent1?.pendingAcksFromAgent).toBe(2);

      const agent2 = status.participants.find((p) => p.agentName === "Agent2");
      expect(agent2?.pendingAcksFromAgent).toBe(0);
    });
  });

  describe("role assignment", () => {
    it("should assign roles based on agent name patterns", () => {
      const thread = makeThread([
        makeMessage({ id: 1, from: "codex-cli", subject: "DELTA[gpt]: Test" }),
        makeMessage({ id: 2, from: "claude-code", subject: "DELTA[opus]: Test" }),
        makeMessage({ id: 3, from: "gemini-cli", subject: "DELTA[gemini]: Test" }),
      ]);

      const status = computeThreadStatus(thread);

      const codex = status.participants.find((p) => p.agentName === "codex-cli");
      expect(codex?.role.role).toBe("hypothesis_generator");

      const claude = status.participants.find((p) => p.agentName === "claude-code");
      expect(claude?.role.role).toBe("test_designer");

      const gemini = status.participants.find((p) => p.agentName === "gemini-cli");
      expect(gemini?.role.role).toBe("adversarial_critic");
    });
  });

  describe("phase transitions", () => {
    it("should transition to in_critique when critiques follow compiled", () => {
      const thread = makeThread([
        makeMessage({
          id: 1,
          from: "Orchestrator",
          subject: "KICKOFF: Test session",
          created_ts: "2025-01-01T00:00:00Z",
        }),
        makeMessage({
          id: 2,
          from: "Compiler",
          subject: "COMPILED: v1",
          created_ts: "2025-01-01T01:00:00Z",
        }),
        makeMessage({
          id: 3,
          from: "Critic",
          subject: "CRITIQUE: Issues found",
          created_ts: "2025-01-01T02:00:00Z",
        }),
      ]);

      const status = computeThreadStatus(thread);
      expect(status.phase).toBe("in_critique");
    });
  });
});

describe("computeThreadStatusSummary", () => {
  it("should return minimal summary", () => {
    const thread = makeThread([
      makeMessage({
        id: 1,
        from: "Codex",
        subject: "DELTA[gpt]: Hypotheses",
      }),
    ]);

    const summary = computeThreadStatusSummary(thread);
    expect(summary.threadId).toBe("test-thread");
    expect(typeof summary.phase).toBe("string");
    expect(typeof summary.summary).toBe("string");
    expect(typeof summary.isComplete).toBe("boolean");
  });
});

describe("isWaitingForRole", () => {
  it("should return true when role hasn't responded", () => {
    const thread = makeThread([
      makeMessage({
        id: 1,
        from: "Codex",
        subject: "DELTA[gpt]: Hypotheses",
      }),
    ]);

    // hypothesis_generator has responded via DELTA[gpt]
    expect(isWaitingForRole(thread, "hypothesis_generator")).toBe(false);
    // adversarial_critic hasn't
    expect(isWaitingForRole(thread, "adversarial_critic")).toBe(true);
  });
});

describe("getPendingAgents", () => {
  it("should return agents who haven't responded", () => {
    const thread = makeThread([
      makeMessage({
        id: 1,
        from: "Orchestrator",
        subject: "KICKOFF: [RS-001] Question",
        to: ["Agent1", "Agent2"],
      }),
      makeMessage({
        id: 2,
        from: "Agent1",
        subject: "DELTA[gpt]: Response",
      }),
    ]);

    const pending = getPendingAgents(thread);
    // Agent1 has responded, Orchestrator hasn't sent a DELTA
    expect(pending).not.toContain("Agent1");
    expect(pending).toContain("Orchestrator"); // Only sent KICKOFF, not a response
  });
});

describe("getAgentsWithPendingAcks", () => {
  it("should return agents awaiting ack from kickoff", () => {
    const thread = makeThread([
      makeMessage({
        id: 1,
        from: "Operator",
        subject: "KICKOFF: Test",
        to: ["Agent1", "Agent2"],
        ack_required: true,
      }),
      makeMessage({
        id: 2,
        from: "Agent1",
        subject: "ACK: Received",
      }),
    ]);

    const agentsWithAcks = getAgentsWithPendingAcks(thread);
    expect(agentsWithAcks).toContain("Agent2");
    expect(agentsWithAcks).not.toContain("Agent1");
  });
});

describe("formatThreadStatusSummary", () => {
  it("should format status as multi-line string", () => {
    const thread = makeThread([
      makeMessage({
        id: 1,
        from: "Orchestrator",
        subject: "KICKOFF: Test",
      }),
      makeMessage({
        id: 2,
        from: "Agent1",
        subject: "DELTA[gpt]: Response",
      }),
    ]);

    const status = computeThreadStatus(thread);
    const formatted = formatThreadStatusSummary(status);
    expect(formatted).toContain("Thread:");
    expect(formatted).toContain("Phase:");
    expect(formatted).toContain("Roles:");
  });
});
