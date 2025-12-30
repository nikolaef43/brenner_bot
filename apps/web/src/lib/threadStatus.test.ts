/**
 * Tests for Thread Status Computation
 *
 * Tests the computeThreadStatus function and related helpers.
 */

import { describe, it, expect } from "vitest";
import {
  computeThreadStatus,
  parseSubjectType,
  extractVersion,
  formatThreadStatusSummary,
  threadNeedsAttention,
  getPendingRoles,
  type ThreadStatus,
} from "./threadStatus";
import type { AgentMailMessage } from "./agentMail";

// ============================================================================
// Test Fixtures
// ============================================================================

function createMessage(overrides: Partial<AgentMailMessage> & { subject: string }): AgentMailMessage {
  const { subject, created_ts, from, to, importance, ack_required, ...rest } = overrides;
  return {
    id: Math.floor(Math.random() * 10000),
    thread_id: "RS-20251230-test",
    subject,
    created_ts: created_ts ?? new Date().toISOString(),
    from: from ?? "TestAgent",
    to: to ?? [],
    importance: importance ?? "normal",
    ack_required: ack_required ?? false,
    ...rest,
  };
}

// ============================================================================
// parseSubjectType Tests
// ============================================================================

describe("parseSubjectType", () => {
  it("parses KICKOFF subjects", () => {
    const result = parseSubjectType("KICKOFF: Cell fate investigation");
    expect(result.type).toBe("kickoff");
    expect(result.role).toBeUndefined();
  });

  it("parses DELTA[opus] as test_designer", () => {
    const result = parseSubjectType("DELTA[opus]: Added H3 third alternative");
    expect(result.type).toBe("delta");
    expect(result.role).toBe("test_designer");
    expect(result.shorthand).toBe("opus");
  });

  it("parses DELTA[gpt] as hypothesis_generator", () => {
    const result = parseSubjectType("DELTA[gpt]: Revised likelihood ratios");
    expect(result.type).toBe("delta");
    expect(result.role).toBe("hypothesis_generator");
    expect(result.shorthand).toBe("gpt");
  });

  it("parses DELTA[gemini] as adversarial_critic", () => {
    const result = parseSubjectType("DELTA[gemini]: Scale check failed");
    expect(result.type).toBe("delta");
    expect(result.role).toBe("adversarial_critic");
    expect(result.shorthand).toBe("gemini");
  });

  it("parses DELTA[claude] as test_designer", () => {
    const result = parseSubjectType("DELTA[claude]: Potency check added");
    expect(result.type).toBe("delta");
    expect(result.role).toBe("test_designer");
  });

  it("parses DELTA[codex] as hypothesis_generator", () => {
    const result = parseSubjectType("DELTA[codex]: Cross-domain insight");
    expect(result.type).toBe("delta");
    expect(result.role).toBe("hypothesis_generator");
  });

  it("parses COMPILED subjects", () => {
    const result = parseSubjectType("COMPILED: v3 artifact with contributions");
    expect(result.type).toBe("compiled");
  });

  it("parses CRITIQUE subjects", () => {
    const result = parseSubjectType("CRITIQUE: Challenging A2 assumption");
    expect(result.type).toBe("critique");
  });

  it("parses ACK subjects", () => {
    const result = parseSubjectType("ACK: Received and understood");
    expect(result.type).toBe("ack");
  });

  it("parses CLAIM subjects", () => {
    const result = parseSubjectType("CLAIM: Taking brenner_bot-5so.3.4.2");
    expect(result.type).toBe("claim");
  });

  it("handles unknown subjects", () => {
    const result = parseSubjectType("Random subject line");
    expect(result.type).toBe("unknown");
  });

  it("is case-insensitive for prefixes", () => {
    expect(parseSubjectType("kickoff: test").type).toBe("kickoff");
    expect(parseSubjectType("DELTA[OPUS]: test").type).toBe("delta");
    expect(parseSubjectType("Compiled: test").type).toBe("compiled");
  });
});

// ============================================================================
// extractVersion Tests
// ============================================================================

describe("extractVersion", () => {
  it("extracts version from COMPILED subject", () => {
    expect(extractVersion("COMPILED: v3 artifact")).toBe(3);
    expect(extractVersion("COMPILED: v12 with contributions")).toBe(12);
  });

  it("returns null when no version found", () => {
    expect(extractVersion("COMPILED: Final version")).toBeNull();
    expect(extractVersion("COMPILED: Updated artifact")).toBeNull();
  });

  it("extracts first version number", () => {
    expect(extractVersion("COMPILED: v2 (prev v1)")).toBe(2);
  });
});

// ============================================================================
// computeThreadStatus Tests
// ============================================================================

describe("computeThreadStatus", () => {
  it("returns not_started for empty messages", () => {
    const status = computeThreadStatus([]);
    expect(status.phase).toBe("not_started");
    expect(status.isComplete).toBe(false);
    expect(status.messageCount).toBe(0);
  });

  it("detects awaiting_responses after KICKOFF", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Cell fate investigation",
        from: "Operator",
        to: ["Codex", "Opus", "Gemini"],
        ack_required: true,
        created_ts: "2025-12-30T10:00:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.phase).toBe("awaiting_responses");
    expect(status.kickoff).toBeTruthy();
    expect(status.acks.awaitingFrom).toContain("Codex");
    expect(status.acks.awaitingFrom).toContain("Opus");
    expect(status.acks.awaitingFrom).toContain("Gemini");
  });

  it("tracks role completion from DELTA messages", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Added hypotheses",
        from: "CodexAgent",
        created_ts: "2025-12-30T10:05:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.phase).toBe("partially_complete");
    expect(status.roles.hypothesis_generator.completed).toBe(true);
    expect(status.roles.hypothesis_generator.contributors).toContain("CodexAgent");
    expect(status.roles.test_designer.completed).toBe(false);
    expect(status.roles.adversarial_critic.completed).toBe(false);
  });

  it("detects awaiting_compilation when all roles responded", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "CodexAgent",
        created_ts: "2025-12-30T10:05:00Z",
      }),
      createMessage({
        subject: "DELTA[opus]: Tests",
        from: "ClaudeAgent",
        created_ts: "2025-12-30T10:10:00Z",
      }),
      createMessage({
        subject: "DELTA[gemini]: Critiques",
        from: "GeminiAgent",
        created_ts: "2025-12-30T10:15:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.phase).toBe("awaiting_compilation");
    expect(status.isComplete).toBe(true);
    expect(status.stats.totalDeltas).toBe(3);
  });

  it("detects compiled phase with artifact", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "CodexAgent",
        created_ts: "2025-12-30T10:05:00Z",
      }),
      createMessage({
        subject: "COMPILED: v1 artifact",
        from: "Compiler",
        created_ts: "2025-12-30T10:20:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.phase).toBe("compiled");
    expect(status.latestArtifact).toBeTruthy();
    expect(status.latestArtifact?.version).toBe(1);
    expect(status.latestArtifact?.contributors).toContain("CodexAgent");
  });

  it("detects in_critique phase after compiled", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "COMPILED: v1 artifact",
        from: "Compiler",
        created_ts: "2025-12-30T10:20:00Z",
      }),
      createMessage({
        subject: "CRITIQUE: Challenge to A2",
        from: "Critic",
        created_ts: "2025-12-30T10:25:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.phase).toBe("in_critique");
    expect(status.stats.totalCritiques).toBe(1);
  });

  it("tracks ACK messages and clears pending", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        to: ["AgentA", "AgentB"],
        ack_required: true,
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "ACK: Received",
        from: "AgentA",
        created_ts: "2025-12-30T10:02:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.acks.awaitingFrom).not.toContain("AgentA");
    expect(status.acks.awaitingFrom).toContain("AgentB");
    expect(status.acks.pendingCount).toBe(1);
    expect(status.stats.totalAcks).toBe(1);
  });

  it("tracks multiple contributors per role", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "DELTA[opus]: First test design",
        from: "ClaudeA",
        created_ts: "2025-12-30T10:05:00Z",
      }),
      createMessage({
        subject: "DELTA[opus]: Second test design",
        from: "ClaudeB",
        created_ts: "2025-12-30T10:10:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.roles.test_designer.contributors).toContain("ClaudeA");
    expect(status.roles.test_designer.contributors).toContain("ClaudeB");
    expect(status.roles.test_designer.latestDelta?.from).toBe("ClaudeB");
  });

  it("collects unique participants", () => {
    const messages: AgentMailMessage[] = [
      createMessage({ subject: "KICKOFF: Test", from: "Operator" }),
      createMessage({ subject: "DELTA[gpt]: A", from: "AgentA" }),
      createMessage({ subject: "DELTA[opus]: B", from: "AgentB" }),
      createMessage({ subject: "DELTA[gpt]: C", from: "AgentA" }), // Duplicate
    ];

    const status = computeThreadStatus(messages);
    expect(status.stats.participants).toContain("Operator");
    expect(status.stats.participants).toContain("AgentA");
    expect(status.stats.participants).toContain("AgentB");
    expect(status.stats.participants.length).toBe(3);
  });

  it("respects custom expected roles", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "Agent",
        created_ts: "2025-12-30T10:05:00Z",
      }),
    ];

    // With default roles (all 3), not complete
    const statusDefault = computeThreadStatus(messages);
    expect(statusDefault.isComplete).toBe(false);

    // With only hypothesis_generator expected, complete
    const statusCustom = computeThreadStatus(messages, {
      expectedRoles: ["hypothesis_generator"],
    });
    expect(statusCustom.isComplete).toBe(true);
  });
});

// ============================================================================
// Convenience Function Tests
// ============================================================================

describe("formatThreadStatusSummary", () => {
  it("formats a complete status summary", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        thread_id: "RS-20251230-test",
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "CodexAgent",
        thread_id: "RS-20251230-test",
        created_ts: "2025-12-30T10:05:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    const summary = formatThreadStatusSummary(status);

    expect(summary).toContain("RS-20251230-test");
    expect(summary).toContain("partially complete");
    expect(summary).toContain("hypothesis_generator");
    expect(summary).toContain("CodexAgent");
  });
});

describe("threadNeedsAttention", () => {
  it("returns true for pending acks", () => {
    const status: ThreadStatus = {
      threadId: "test",
      phase: "awaiting_responses",
      isComplete: false,
      roles: {
        hypothesis_generator: { completed: false, contributors: [], latestDelta: null, lastUpdated: null },
        test_designer: { completed: false, contributors: [], latestDelta: null, lastUpdated: null },
        adversarial_critic: { completed: false, contributors: [], latestDelta: null, lastUpdated: null },
      },
      acks: { pendingAcks: [], pendingCount: 2, awaitingFrom: ["A", "B"] },
      latestArtifact: null,
      kickoff: null,
      messageCount: 1,
      stats: { totalDeltas: 0, totalCritiques: 0, totalAcks: 0, participants: [] },
    };

    expect(threadNeedsAttention(status)).toBe(true);
  });

  it("returns false for compiled threads", () => {
    const status: ThreadStatus = {
      threadId: "test",
      phase: "compiled",
      isComplete: true,
      roles: {
        hypothesis_generator: { completed: true, contributors: ["A"], latestDelta: null, lastUpdated: null },
        test_designer: { completed: true, contributors: ["B"], latestDelta: null, lastUpdated: null },
        adversarial_critic: { completed: true, contributors: ["C"], latestDelta: null, lastUpdated: null },
      },
      acks: { pendingAcks: [], pendingCount: 0, awaitingFrom: [] },
      latestArtifact: null,
      kickoff: null,
      messageCount: 5,
      stats: { totalDeltas: 3, totalCritiques: 0, totalAcks: 0, participants: [] },
    };

    expect(threadNeedsAttention(status)).toBe(false);
  });
});

describe("getPendingRoles", () => {
  it("returns roles that have not completed", () => {
    const status: ThreadStatus = {
      threadId: "test",
      phase: "partially_complete",
      isComplete: false,
      roles: {
        hypothesis_generator: { completed: true, contributors: ["A"], latestDelta: null, lastUpdated: null },
        test_designer: { completed: false, contributors: [], latestDelta: null, lastUpdated: null },
        adversarial_critic: { completed: false, contributors: [], latestDelta: null, lastUpdated: null },
      },
      acks: { pendingAcks: [], pendingCount: 0, awaitingFrom: [] },
      latestArtifact: null,
      kickoff: null,
      messageCount: 2,
      stats: { totalDeltas: 1, totalCritiques: 0, totalAcks: 0, participants: [] },
    };

    const pending = getPendingRoles(status);
    expect(pending).toContain("test_designer");
    expect(pending).toContain("adversarial_critic");
    expect(pending).not.toContain("hypothesis_generator");
  });
});
