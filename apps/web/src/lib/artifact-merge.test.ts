/**
 * Tests for artifact merge algorithm.
 *
 * Verifies deterministic merging per artifact_delta_spec_v0.1.md
 *
 * Run with: bun test apps/web/src/lib/artifact-merge.test.ts
 * (Uses bun's vitest-compatible test runner)
 */

import { describe, expect, test } from "vitest";
import {
  createEmptyArtifact,
  mergeArtifact,
  mergeArtifactWithTimestamps,
  validateArtifact,
  type Artifact,
} from "./artifact-merge";
import { type ValidDelta, type DeltaSection } from "./delta-parser";

// ============================================================================
// Test Helpers
// ============================================================================

function makeValidDelta(
  operation: "ADD" | "EDIT" | "KILL",
  section: DeltaSection,
  target_id: string | null,
  payload: Record<string, unknown>,
  rationale = "test",
): ValidDelta {
  return {
    valid: true,
    operation,
    section,
    target_id,
    payload,
    rationale,
    raw: JSON.stringify({ operation, section, target_id, payload }),
  };
}

function makeTimestampedDelta(
  operation: "ADD" | "EDIT" | "KILL",
  section: DeltaSection,
  target_id: string | null,
  payload: Record<string, unknown>,
  timestamp: string,
  agent: string,
): ValidDelta & { timestamp: string; agent: string } {
  return {
    ...makeValidDelta(operation, section, target_id, payload),
    timestamp,
    agent,
  };
}

// ============================================================================
// Tests: createEmptyArtifact
// ============================================================================

describe("createEmptyArtifact", () => {
  test("creates artifact with correct structure", () => {
    const artifact = createEmptyArtifact("TEST-001");

    expect(artifact.metadata.session_id).toBe("TEST-001");
    expect(artifact.metadata.version).toBe(0);
    expect(artifact.metadata.status).toBe("draft");
    expect(artifact.metadata.contributors).toEqual([]);

    expect(artifact.sections.research_thread).toBeNull();
    expect(artifact.sections.hypothesis_slate).toEqual([]);
    expect(artifact.sections.predictions_table).toEqual([]);
    expect(artifact.sections.discriminative_tests).toEqual([]);
    expect(artifact.sections.assumption_ledger).toEqual([]);
    expect(artifact.sections.anomaly_register).toEqual([]);
    expect(artifact.sections.adversarial_critique).toEqual([]);
  });
});

// ============================================================================
// Tests: ADD operations
// ============================================================================

describe("ADD operations", () => {
  test("adds hypothesis with auto-generated ID", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "Test Hypothesis",
      claim: "Something is true",
      mechanism: "Via some process",
    });

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.sections.hypothesis_slate).toHaveLength(1);
    expect(result.artifact.sections.hypothesis_slate[0].id).toBe("H1");
    expect(result.artifact.sections.hypothesis_slate[0].name).toBe("Test Hypothesis");
  });

  test("assigns sequential IDs for multiple ADDs", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const deltas = [
      makeValidDelta("ADD", "hypothesis_slate", null, { name: "H1", claim: "A", mechanism: "M" }),
      makeValidDelta("ADD", "hypothesis_slate", null, { name: "H2", claim: "B", mechanism: "M" }),
      makeValidDelta("ADD", "hypothesis_slate", null, { name: "H3", claim: "C", mechanism: "M" }),
    ];

    const result = mergeArtifact(artifact, deltas, "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const hypotheses = result.artifact.sections.hypothesis_slate;
    expect(hypotheses).toHaveLength(3);
    expect(hypotheses[0].id).toBe("H1");
    expect(hypotheses[1].id).toBe("H2");
    expect(hypotheses[2].id).toBe("H3");
  });

  test("rejects ADD on research_thread", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta = makeValidDelta("ADD", "research_thread", null, {
      statement: "What is X?",
      context: "Background",
      why_it_matters: "Important",
    });

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors[0].code).toBe("RT_ADD_NOT_ALLOWED");
  });

  test("enforces section limits", () => {
    const artifact = createEmptyArtifact("TEST-001");

    // Add 6 hypotheses (the limit)
    const deltas: ValidDelta[] = [];
    for (let i = 0; i < 7; i++) {
      deltas.push(
        makeValidDelta("ADD", "hypothesis_slate", null, {
          name: `H${i + 1}`,
          claim: `Claim ${i + 1}`,
          mechanism: "M",
        }),
      );
    }

    const result = mergeArtifact(artifact, deltas, "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors.some((e) => e.code === "SECTION_LIMIT_EXCEEDED")).toBe(true);
    expect(result.applied_count).toBe(6);
  });
});

// ============================================================================
// Tests: EDIT operations
// ============================================================================

describe("EDIT operations", () => {
  test("edits existing item", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "Original",
      claim: "Original claim",
      mechanism: "Original mechanism",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const editDelta = makeValidDelta("EDIT", "hypothesis_slate", "H1", {
      claim: "Updated claim",
    });

    const result = mergeArtifact(afterAdd.artifact, [editDelta], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.sections.hypothesis_slate[0].name).toBe("Original");
    expect(result.artifact.sections.hypothesis_slate[0].claim).toBe("Updated claim");
    expect(result.artifact.sections.hypothesis_slate[0].mechanism).toBe("Original mechanism");
  });

  test("creates research_thread on first EDIT", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta = makeValidDelta("EDIT", "research_thread", null, {
      statement: "What is X?",
      context: "Background",
      why_it_matters: "Important",
    });

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.sections.research_thread).not.toBeNull();
    expect(result.artifact.sections.research_thread?.statement).toBe("What is X?");
  });

  test("merges array fields by default", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "Claim",
      mechanism: "M",
      anchors: ["§1", "§2"],
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const editDelta = makeValidDelta("EDIT", "hypothesis_slate", "H1", {
      anchors: ["§3", "§4"],
    });

    const result = mergeArtifact(afterAdd.artifact, [editDelta], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const anchors = result.artifact.sections.hypothesis_slate[0].anchors;
    expect(anchors).toContain("§1");
    expect(anchors).toContain("§2");
    expect(anchors).toContain("§3");
    expect(anchors).toContain("§4");
  });

  test("replaces array fields when replace=true", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "Claim",
      mechanism: "M",
      anchors: ["§1", "§2"],
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const editDelta = makeValidDelta("EDIT", "hypothesis_slate", "H1", {
      anchors: ["§3"],
      replace: true,
    });

    const result = mergeArtifact(afterAdd.artifact, [editDelta], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.sections.hypothesis_slate[0].anchors).toEqual(["§3"]);
  });

  test("rejects EDIT on non-existent item", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta = makeValidDelta("EDIT", "hypothesis_slate", "H999", {
      claim: "Updated",
    });

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors[0].code).toBe("INVALID_TARGET");
  });
});

// ============================================================================
// Tests: KILL operations
// ============================================================================

describe("KILL operations", () => {
  test("marks item as killed", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "Claim",
      mechanism: "M",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const killDelta = makeValidDelta("KILL", "hypothesis_slate", "H1", {
      reason: "Superseded",
    });

    const result = mergeArtifact(afterAdd.artifact, [killDelta], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const h1 = result.artifact.sections.hypothesis_slate[0];
    expect(h1.killed).toBe(true);
    expect(h1.killed_by).toBe("Agent2");
    expect(h1.kill_reason).toBe("Superseded");
  });

  test("KILL is idempotent", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "Claim",
      mechanism: "M",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const killDelta1 = makeValidDelta("KILL", "hypothesis_slate", "H1", { reason: "First" });
    const killDelta2 = makeValidDelta("KILL", "hypothesis_slate", "H1", { reason: "Second" });

    const result = mergeArtifact(afterAdd.artifact, [killDelta1, killDelta2], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // First kill should stick
    expect(result.artifact.sections.hypothesis_slate[0].kill_reason).toBe("First");
  });

  test("EDIT on killed item is skipped with warning", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "Original",
      mechanism: "M",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const killDelta = makeValidDelta("KILL", "hypothesis_slate", "H1", { reason: "Done" });
    const editDelta = makeValidDelta("EDIT", "hypothesis_slate", "H1", { claim: "Updated" });

    const result = mergeArtifact(afterAdd.artifact, [killDelta, editDelta], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Edit should be skipped, claim should remain original
    expect(result.artifact.sections.hypothesis_slate[0].claim).toBe("Original");
    expect(result.warnings.some((w) => w.code === "TARGET_KILLED")).toBe(true);
  });
});

// ============================================================================
// Tests: Determinism
// ============================================================================

describe("Deterministic merging", () => {
  test("same deltas produce same result regardless of input order", () => {
    const base = createEmptyArtifact("TEST-001");

    const delta1 = makeTimestampedDelta(
      "ADD",
      "hypothesis_slate",
      null,
      { name: "From Agent1", claim: "C1", mechanism: "M" },
      "2025-01-01T00:00:00Z",
      "Agent1",
    );

    const delta2 = makeTimestampedDelta(
      "ADD",
      "hypothesis_slate",
      null,
      { name: "From Agent2", claim: "C2", mechanism: "M" },
      "2025-01-01T00:01:00Z",
      "Agent2",
    );

    // Merge in order [delta1, delta2]
    const result1 = mergeArtifactWithTimestamps(base, [delta1, delta2]);

    // Merge in order [delta2, delta1] (should produce same result due to timestamp sorting)
    const result2 = mergeArtifactWithTimestamps(base, [delta2, delta1]);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    if (!result1.ok || !result2.ok) return;

    // Both should have same hypothesis order (sorted by timestamp)
    expect(result1.artifact.sections.hypothesis_slate[0].name).toBe("From Agent1");
    expect(result1.artifact.sections.hypothesis_slate[1].name).toBe("From Agent2");

    expect(result2.artifact.sections.hypothesis_slate[0].name).toBe("From Agent1");
    expect(result2.artifact.sections.hypothesis_slate[1].name).toBe("From Agent2");

    // IDs should be identical
    expect(result1.artifact.sections.hypothesis_slate[0].id).toBe(result2.artifact.sections.hypothesis_slate[0].id);
    expect(result1.artifact.sections.hypothesis_slate[1].id).toBe(result2.artifact.sections.hypothesis_slate[1].id);
  });

  test("concurrent edits resolved by timestamp (last-write-wins)", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "Original",
      mechanism: "M",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent0", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const edit1 = makeTimestampedDelta(
      "EDIT",
      "hypothesis_slate",
      "H1",
      { claim: "Edit from Agent1" },
      "2025-01-01T00:01:00Z",
      "Agent1",
    );

    const edit2 = makeTimestampedDelta(
      "EDIT",
      "hypothesis_slate",
      "H1",
      { claim: "Edit from Agent2" },
      "2025-01-01T00:02:00Z",
      "Agent2",
    );

    // Last timestamp wins
    const result = mergeArtifactWithTimestamps(afterAdd.artifact, [edit1, edit2]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.sections.hypothesis_slate[0].claim).toBe("Edit from Agent2");
  });

  test("KILL takes precedence over concurrent EDIT", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "Original",
      mechanism: "M",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent0", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const kill = makeTimestampedDelta(
      "KILL",
      "hypothesis_slate",
      "H1",
      { reason: "Killed" },
      "2025-01-01T00:01:00Z",
      "Agent1",
    );

    const edit = makeTimestampedDelta(
      "EDIT",
      "hypothesis_slate",
      "H1",
      { claim: "Updated" },
      "2025-01-01T00:02:00Z",
      "Agent2",
    );

    const result = mergeArtifactWithTimestamps(afterAdd.artifact, [kill, edit]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Item should be killed, edit should be skipped
    expect(result.artifact.sections.hypothesis_slate[0].killed).toBe(true);
    expect(result.artifact.sections.hypothesis_slate[0].claim).toBe("Original");
  });
});

// ============================================================================
// Tests: Test ranking
// ============================================================================

describe("Test ranking by score", () => {
  test("tests are sorted by score (highest first)", () => {
    const artifact = createEmptyArtifact("TEST-001");

    const lowScore = makeValidDelta("ADD", "discriminative_tests", null, {
      name: "Low Score Test",
      procedure: "P",
      discriminates: "H1 vs H2",
      expected_outcomes: {},
      potency_check: "Check",
      score: { likelihood_ratio: 1, cost: 1, speed: 1, ambiguity: 1 },
    });

    const highScore = makeValidDelta("ADD", "discriminative_tests", null, {
      name: "High Score Test",
      procedure: "P",
      discriminates: "H1 vs H2",
      expected_outcomes: {},
      potency_check: "Check",
      score: { likelihood_ratio: 3, cost: 3, speed: 3, ambiguity: 3 },
    });

    // Add low score first, then high score
    const result = mergeArtifact(artifact, [lowScore, highScore], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // High score should be first after sorting
    expect(result.artifact.sections.discriminative_tests[0].name).toBe("High Score Test");
    expect(result.artifact.sections.discriminative_tests[1].name).toBe("Low Score Test");
  });
});

// ============================================================================
// Tests: Metadata
// ============================================================================

describe("Metadata updates", () => {
  test("increments version on merge", () => {
    const artifact = createEmptyArtifact("TEST-001");
    expect(artifact.metadata.version).toBe(0);

    const delta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "C",
      mechanism: "M",
    });

    const result = mergeArtifact(artifact, [delta], "Agent1", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.metadata.version).toBe(1);
  });

  test("adds contributor on merge", () => {
    const artifact = createEmptyArtifact("TEST-001");
    expect(artifact.metadata.contributors).toHaveLength(0);

    const delta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "C",
      mechanism: "M",
    });

    const result = mergeArtifact(artifact, [delta], "NewAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.metadata.contributors).toHaveLength(1);
    expect(result.artifact.metadata.contributors[0].agent).toBe("NewAgent");
  });

  test("updates existing contributor timestamp", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta1 = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "C",
      mechanism: "M",
    });

    const after1 = mergeArtifact(artifact, [delta1], "Agent1", "2025-01-01T00:00:00Z");
    expect(after1.ok).toBe(true);
    if (!after1.ok) return;

    const delta2 = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H2",
      claim: "C2",
      mechanism: "M",
    });

    const result = mergeArtifact(after1.artifact, [delta2], "Agent1", "2025-01-01T01:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Still one contributor, but timestamp updated
    expect(result.artifact.metadata.contributors).toHaveLength(1);
    expect(result.artifact.metadata.contributors[0].contributed_at).toBe("2025-01-01T01:00:00Z");
  });
});

// ============================================================================
// Tests: Validation
// ============================================================================

describe("validateArtifact", () => {
  test("warns on incomplete artifact", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const warnings = validateArtifact(artifact);

    // Should warn about missing minimums
    expect(warnings.some((w) => w.code === "BELOW_MINIMUM")).toBe(true);
    expect(warnings.some((w) => w.code === "NO_THIRD_ALTERNATIVE")).toBe(true);
    expect(warnings.some((w) => w.code === "NO_SCALE_CHECK")).toBe(true);
  });
});
