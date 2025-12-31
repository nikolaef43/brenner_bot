/**
 * Tests for artifact merge algorithm.
 *
 * Verifies deterministic merging per artifact_delta_spec_v0.1.md
 *
 * Run with: cd apps/web && bun run test -- src/lib/artifact-merge.test.ts
 */

import { describe, expect, test } from "vitest";
import {
  createEmptyArtifact,
  formatLintReportHuman,
  formatLintReportJson,
  lintArtifact,
  mergeArtifact,
  mergeArtifactWithTimestamps,
  renderArtifactMarkdown,
  validateArtifact,
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

  test("ignores system-owned fields in ADD payload", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta = makeValidDelta("ADD", "hypothesis_slate", null, {
      id: "H999",
      killed: true,
      killed_by: "EvilAgent",
      killed_at: "2025-01-01T00:00:00Z",
      kill_reason: "override",
      name: "Test Hypothesis",
      claim: "Something is true",
      mechanism: "Via some process",
    });

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const h1 = result.artifact.sections.hypothesis_slate[0];
    expect(h1.id).toBe("H1");
    expect(h1.killed).not.toBe(true);
    expect(h1.killed_by).toBeUndefined();
    expect(h1.killed_at).toBeUndefined();
    expect(h1.kill_reason).toBeUndefined();
  });

  test("warns and ignores forbidden payload keys in ADD payload (prototype pollution)", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const payload = JSON.parse(
      '{"__proto__":{"polluted":true},"name":"Test Hypothesis","claim":"Something is true","mechanism":"Via some process"}',
    ) as Record<string, unknown>;
    const delta = makeValidDelta("ADD", "hypothesis_slate", null, payload);

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.code === "FORBIDDEN_PAYLOAD_KEY")).toBe(true);

    const h1 = result.artifact.sections.hypothesis_slate[0] as unknown as Record<string, unknown>;
    expect(h1.name).toBe("Test Hypothesis");
    expect(h1.polluted).toBeUndefined();
    expect(Object.getPrototypeOf(h1)).toBe(Object.prototype);
  });

  test("sorts discriminative tests by score even when some score fields are missing", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const deltas: ValidDelta[] = [
      makeValidDelta("ADD", "discriminative_tests", null, {
        name: "Partial score",
        procedure: "Procedure",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
        score: { likelihood_ratio: 2 },
      }),
      makeValidDelta("ADD", "discriminative_tests", null, {
        name: "Missing LR score",
        procedure: "Procedure",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
        score: { cost: 1, speed: 1, ambiguity: 1 },
      }),
      makeValidDelta("ADD", "discriminative_tests", null, {
        name: "Full score",
        procedure: "Procedure",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
        score: { likelihood_ratio: 1, cost: 1, speed: 1, ambiguity: 1 },
      }),
      makeValidDelta("ADD", "discriminative_tests", null, {
        name: "No score",
        procedure: "Procedure",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
      }),
    ];

    const result = mergeArtifact(artifact, deltas, "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const names = result.artifact.sections.discriminative_tests.map((t) => t.name);
    expect(names).toEqual(["Full score", "Missing LR score", "Partial score", "No score"]);
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

  test("ignores system-owned fields in EDIT payload", () => {
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
      id: "H999",
      killed: true,
      killed_by: "EvilAgent",
      killed_at: "2025-01-01T00:01:00Z",
      kill_reason: "override",
      claim: "Updated claim",
    });

    const result = mergeArtifact(afterAdd.artifact, [editDelta], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const h1 = result.artifact.sections.hypothesis_slate[0];
    expect(h1.id).toBe("H1");
    expect(h1.killed).not.toBe(true);
    expect(h1.killed_by).toBeUndefined();
    expect(h1.killed_at).toBeUndefined();
    expect(h1.kill_reason).toBeUndefined();
    expect(h1.claim).toBe("Updated claim");
  });

  test("ignores forbidden payload keys (prototype pollution)", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "Original",
      claim: "Original claim",
      mechanism: "Original mechanism",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const payload = JSON.parse('{"__proto__":{"polluted":true},"claim":"Updated claim"}') as Record<string, unknown>;
    const editDelta = makeValidDelta("EDIT", "hypothesis_slate", "H1", payload);

    const result = mergeArtifact(afterAdd.artifact, [editDelta], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.code === "FORBIDDEN_PAYLOAD_KEY")).toBe(true);

    const h1 = result.artifact.sections.hypothesis_slate[0] as unknown as Record<string, unknown>;
    expect(h1.claim).toBe("Updated claim");
    expect(h1.polluted).toBeUndefined();
    expect(Object.getPrototypeOf(h1)).toBe(Object.prototype);
  });

  test("creates research_thread on first EDIT", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta = makeValidDelta("EDIT", "research_thread", null, {
      id: "RT999",
      statement: "What is X?",
      context: "Background",
      why_it_matters: "Important",
    });

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.sections.research_thread).not.toBeNull();
    expect(result.artifact.sections.research_thread?.id).toBe("RT");
    expect(result.artifact.sections.research_thread?.statement).toBe("What is X?");
  });

  test("ignores forbidden payload keys on research_thread (prototype pollution)", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const payload = JSON.parse('{"__proto__":{"polluted":true},"statement":"What is X?","context":"Background","why_it_matters":"Important"}') as Record<string, unknown>;
    const delta = makeValidDelta("EDIT", "research_thread", null, payload);

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.code === "FORBIDDEN_PAYLOAD_KEY")).toBe(true);

    const rt = result.artifact.sections.research_thread as unknown as Record<string, unknown> | null;
    expect(rt).not.toBeNull();
    if (!rt) return;

    expect(rt.polluted).toBeUndefined();
    expect(Object.getPrototypeOf(rt)).toBe(Object.prototype);
  });

  test("research_thread EDIT requires a payload object", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta: ValidDelta = {
      valid: true,
      operation: "EDIT",
      section: "research_thread",
      target_id: null,
      payload: "not-an-object",
      rationale: "test",
      raw: JSON.stringify({
        operation: "EDIT",
        section: "research_thread",
        target_id: null,
        payload: "not-an-object",
      }),
    };

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.code).toBe("MISSING_REQUIRED_FIELD");
  });

  test("research_thread merges anchors by default and replaces when requested", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const create = makeValidDelta("EDIT", "research_thread", null, {
      statement: "What is X?",
      context: "Background",
      why_it_matters: "Important",
      anchors: "§1",
    });

    const afterCreate = mergeArtifact(artifact, [create], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterCreate.ok).toBe(true);
    if (!afterCreate.ok) return;

    const mergeAnchors = makeValidDelta("EDIT", "research_thread", null, {
      anchors: ["§2", "§3"],
    });

    const afterMerge = mergeArtifact(afterCreate.artifact, [mergeAnchors], "Agent2", "2025-01-01T00:01:00Z");
    expect(afterMerge.ok).toBe(true);
    if (!afterMerge.ok) return;

    expect(afterMerge.artifact.sections.research_thread?.anchors).toEqual(["§2", "§3"]);

    const replaceAnchors = makeValidDelta("EDIT", "research_thread", null, {
      anchors: ["§9"],
      replace: true,
    });

    const afterReplace = mergeArtifact(afterMerge.artifact, [replaceAnchors], "Agent3", "2025-01-01T00:02:00Z");
    expect(afterReplace.ok).toBe(true);
    if (!afterReplace.ok) return;

    expect(afterReplace.artifact.sections.research_thread?.anchors).toEqual(["§9"]);

    const badAnchors: ValidDelta = {
      valid: true,
      operation: "EDIT",
      section: "research_thread",
      target_id: null,
      payload: { anchors: "§10" },
      rationale: "test",
      raw: JSON.stringify({
        operation: "EDIT",
        section: "research_thread",
        target_id: null,
        payload: { anchors: "§10" },
      }),
    };

    const afterBad = mergeArtifact(afterReplace.artifact, [badAnchors], "Agent4", "2025-01-01T00:03:00Z");
    expect(afterBad.ok).toBe(true);
    if (!afterBad.ok) return;

    expect(afterBad.artifact.sections.research_thread?.anchors).toEqual(["§9"]);
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

  test("warns when killing the last third alternative hypothesis", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const deltas: ValidDelta[] = [
      makeValidDelta("ADD", "hypothesis_slate", null, { name: "H1", claim: "A", mechanism: "M" }),
      makeValidDelta("ADD", "hypothesis_slate", null, { name: "H2", claim: "B", mechanism: "M" }),
      makeValidDelta("ADD", "hypothesis_slate", null, {
        name: "Third alternative",
        claim: "Both could be wrong",
        mechanism: "Misspecification",
        third_alternative: true,
      }),
    ];

    const afterAdd = mergeArtifact(artifact, deltas, "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const killThird = makeValidDelta("KILL", "hypothesis_slate", "H3", { reason: "Removed" });
    const result = mergeArtifact(afterAdd.artifact, [killThird], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.code === "NO_THIRD_ALTERNATIVE")).toBe(true);
  });

  test("warns when killing the last scale check assumption", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const deltas: ValidDelta[] = [
      makeValidDelta("ADD", "assumption_ledger", null, {
        name: "A1",
        statement: "S1",
        load: "L1",
        test: "T1",
        scale_check: true,
      }),
      makeValidDelta("ADD", "assumption_ledger", null, { name: "A2", statement: "S2", load: "L2", test: "T2" }),
      makeValidDelta("ADD", "assumption_ledger", null, { name: "A3", statement: "S3", load: "L3", test: "T3" }),
    ];

    const afterAdd = mergeArtifact(artifact, deltas, "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const killScale = makeValidDelta("KILL", "assumption_ledger", "A1", { reason: "Removed" });
    const result = mergeArtifact(afterAdd.artifact, [killScale], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.code === "NO_SCALE_CHECK")).toBe(true);
  });

  test("rejects KILL on research_thread", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta: ValidDelta = {
      valid: true,
      operation: "KILL",
      section: "research_thread",
      target_id: "RT",
      payload: { reason: "Nope" },
      rationale: "test",
      raw: JSON.stringify({ operation: "KILL", section: "research_thread", target_id: "RT", payload: { reason: "Nope" } }),
    };

    const result = mergeArtifact(artifact, [delta], "Agent1", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.code).toBe("INVALID_TARGET");
  });

  test("rejects KILL when target_id is missing", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta: ValidDelta = {
      valid: true,
      operation: "KILL",
      section: "hypothesis_slate",
      target_id: null,
      payload: { reason: "No target" },
      rationale: "test",
      raw: JSON.stringify({ operation: "KILL", section: "hypothesis_slate", target_id: null, payload: { reason: "No target" } }),
    };

    const result = mergeArtifact(artifact, [delta], "Agent1", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.code).toBe("INVALID_TARGET");
  });

  test("rejects KILL when target does not exist", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta = makeValidDelta("KILL", "hypothesis_slate", "H1", { reason: "Missing" });

    const result = mergeArtifact(artifact, [delta], "Agent1", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.code).toBe("INVALID_TARGET");
  });

  test("does not warn when a third alternative remains after KILL", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const deltas: ValidDelta[] = [
      makeValidDelta("ADD", "hypothesis_slate", null, { name: "H1", claim: "A", mechanism: "M" }),
      makeValidDelta("ADD", "hypothesis_slate", null, { name: "H2", claim: "B", mechanism: "M" }),
      makeValidDelta("ADD", "hypothesis_slate", null, {
        name: "Third alternative",
        claim: "Both could be wrong",
        mechanism: "Misspecification",
        third_alternative: true,
      }),
    ];

    const afterAdd = mergeArtifact(artifact, deltas, "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const killH1 = makeValidDelta("KILL", "hypothesis_slate", "H1", { reason: 123 as unknown as string });
    const result = mergeArtifact(afterAdd.artifact, [killH1], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.code === "NO_THIRD_ALTERNATIVE")).toBe(false);
    expect(result.artifact.sections.hypothesis_slate[0].kill_reason).toBe("");
  });

  test("does not warn when a scale check remains after KILL", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const deltas: ValidDelta[] = [
      makeValidDelta("ADD", "assumption_ledger", null, {
        name: "A1",
        statement: "S1",
        load: "L1",
        test: "T1",
        scale_check: true,
      }),
      makeValidDelta("ADD", "assumption_ledger", null, { name: "A2", statement: "S2", load: "L2", test: "T2" }),
      makeValidDelta("ADD", "assumption_ledger", null, { name: "A3", statement: "S3", load: "L3", test: "T3" }),
    ];

    const afterAdd = mergeArtifact(artifact, deltas, "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const killA2 = makeValidDelta("KILL", "assumption_ledger", "A2", { reason: "Removed" });
    const result = mergeArtifact(afterAdd.artifact, [killA2], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.code === "NO_SCALE_CHECK")).toBe(false);
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
// Tests: mergeArtifactWithTimestamps metadata
// ============================================================================

describe("mergeArtifactWithTimestamps metadata", () => {
  test("backfills missing contributor contributed_at", () => {
    const base = createEmptyArtifact("TEST-001");
    base.metadata.contributors.push({ agent: "Agent1" });

    const delta = makeTimestampedDelta(
      "ADD",
      "hypothesis_slate",
      null,
      { name: "H1", claim: "C", mechanism: "M" },
      "2025-01-01T00:00:00Z",
      "Agent1",
    );

    const result = mergeArtifactWithTimestamps(base, [delta]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.metadata.contributors).toHaveLength(1);
    expect(result.artifact.metadata.contributors[0].agent).toBe("Agent1");
    expect(result.artifact.metadata.contributors[0].contributed_at).toBe("2025-01-01T00:00:00Z");
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

  test("executes third-alternative / scale-check callbacks on non-empty sections", () => {
    const artifact = createEmptyArtifact("TEST-002");

    artifact.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "A", mechanism: "M" },
      { id: "H2", name: "H2", claim: "B", mechanism: "M" },
      { id: "H3", name: "H3", claim: "C", mechanism: "M", killed: true },
    ];

    artifact.sections.predictions_table = [
      { id: "P1", condition: "C1", predictions: { H1: "A", H2: "B" } },
      { id: "P2", condition: "C2", predictions: { H1: "A", H2: "B" }, killed: true },
    ];

    artifact.sections.discriminative_tests = [
      {
        id: "T1",
        name: "T1",
        procedure: "P",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
      },
      {
        id: "T2",
        name: "T2",
        procedure: "P",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
        killed: true,
      },
    ];

    artifact.sections.assumption_ledger = [
      { id: "A1", name: "A1", statement: "S1", load: "L1", test: "T1" },
      { id: "A2", name: "A2", statement: "S2", load: "L2", test: "T2" },
      { id: "A3", name: "A3", statement: "S3", load: "L3", test: "T3", killed: true },
    ];

    artifact.sections.adversarial_critique = [
      { id: "C1", name: "C1", attack: "A", evidence: "E", current_status: "S" },
      { id: "C2", name: "C2", attack: "A", evidence: "E", current_status: "S", killed: true },
    ];

    const warnings = validateArtifact(artifact);

    expect(warnings.some((w) => w.code === "NO_THIRD_ALTERNATIVE")).toBe(true);
    expect(warnings.some((w) => w.code === "NO_SCALE_CHECK")).toBe(true);
    expect(warnings.some((w) => w.code === "NO_REAL_THIRD_ALTERNATIVE")).toBe(true);
  });

  test("returns no warnings for a minimally complete artifact", () => {
    const artifact = createEmptyArtifact("TEST-003");

    artifact.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "A", mechanism: "M" },
      { id: "H2", name: "H2", claim: "B", mechanism: "M" },
      { id: "H3", name: "Third alternative", claim: "Both could be wrong", mechanism: "Misspecification", third_alternative: true },
    ];

    artifact.sections.predictions_table = [
      { id: "P1", condition: "C1", predictions: { H1: "A", H2: "B", H3: "?" } },
      { id: "P2", condition: "C2", predictions: { H1: "A", H2: "B", H3: "?" } },
      { id: "P3", condition: "C3", predictions: { H1: "A", H2: "B", H3: "?" } },
    ];

    artifact.sections.discriminative_tests = [
      {
        id: "T1",
        name: "T1",
        procedure: "P",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
      },
      {
        id: "T2",
        name: "T2",
        procedure: "P",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
      },
    ];

    artifact.sections.assumption_ledger = [
      { id: "A1", name: "A1", statement: "S1", load: "L1", test: "T1", scale_check: true },
      { id: "A2", name: "A2", statement: "S2", load: "L2", test: "T2" },
      { id: "A3", name: "A3", statement: "S3", load: "L3", test: "T3" },
    ];

    artifact.sections.adversarial_critique = [
      { id: "C1", name: "C1", attack: "A", evidence: "E", current_status: "S", real_third_alternative: true },
      { id: "C2", name: "C2", attack: "A", evidence: "E", current_status: "S" },
    ];

    const warnings = validateArtifact(artifact);
    expect(warnings).toEqual([]);
  });
});

// ============================================================================
// Tests: Rendering + Linting
// ============================================================================

describe("renderArtifactMarkdown", () => {
  test("renders canonical markdown with required section headers", () => {
    const artifact = createEmptyArtifact("TEST-RENDER");

    const deltas: ValidDelta[] = [
      makeValidDelta("EDIT", "research_thread", null, {
        statement: "What is X?",
        context: "Background context.",
        why_it_matters: "It matters because Y.",
        anchors: ["§1"],
      }),
      makeValidDelta("ADD", "hypothesis_slate", null, {
        name: "H1",
        claim: "A",
        mechanism: "M",
        anchors: ["§2"],
      }),
      makeValidDelta("ADD", "hypothesis_slate", null, {
        name: "H2",
        claim: "B",
        mechanism: "M",
        anchors: ["§3"],
      }),
      makeValidDelta("ADD", "hypothesis_slate", null, {
        name: "Third Alternative",
        claim: "Both could be wrong",
        mechanism: "Misspecification",
        anchors: ["inference"],
        third_alternative: true,
      }),
      makeValidDelta("ADD", "predictions_table", null, {
        condition: "Condition 1",
        predictions: { H1: "X", H2: "Y", H3: "indeterminate" },
      }),
      makeValidDelta("ADD", "predictions_table", null, {
        condition: "Condition 2",
        predictions: { H1: "X", H2: "X", H3: "indeterminate" },
      }),
      makeValidDelta("ADD", "predictions_table", null, {
        condition: "Condition 3",
        predictions: { H1: "Y", H2: "X", H3: "indeterminate" },
      }),
      makeValidDelta("ADD", "discriminative_tests", null, {
        name: "Test 1",
        procedure: "Do thing",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
        score: { likelihood_ratio: 3, cost: 2, speed: 2, ambiguity: 3 },
      }),
      makeValidDelta("ADD", "discriminative_tests", null, {
        name: "Test 2",
        procedure: "Do other thing",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A2", H2: "B2" },
        potency_check: "Control 2",
        score: { likelihood_ratio: 2, cost: 2, speed: 2, ambiguity: 2 },
      }),
      makeValidDelta("ADD", "assumption_ledger", null, {
        name: "Assumption 1",
        statement: "S1",
        load: "L1",
        test: "T1",
        scale_check: true,
        calculation: "1e3 > 1e2",
      }),
      makeValidDelta("ADD", "assumption_ledger", null, {
        name: "Assumption 2",
        statement: "S2",
        load: "L2",
        test: "T2",
      }),
      makeValidDelta("ADD", "assumption_ledger", null, {
        name: "Assumption 3",
        statement: "S3",
        load: "L3",
        test: "T3",
      }),
      makeValidDelta("ADD", "adversarial_critique", null, {
        name: "Critique 1",
        attack: "Attack",
        evidence: "Evidence",
        current_status: "Status",
        real_third_alternative: true,
      }),
      makeValidDelta("ADD", "adversarial_critique", null, {
        name: "Critique 2",
        attack: "Attack 2",
        evidence: "Evidence 2",
        current_status: "Status 2",
      }),
    ];

    const merged = mergeArtifact(artifact, deltas, "Agent1", "2025-01-01T00:00:00Z");
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;

    const md = renderArtifactMarkdown(merged.artifact);
    expect(md).toContain('session_id: "TEST-RENDER"');
    expect(md).toContain("# Brenner Protocol Artifact: TEST-RENDER");

    expect(md).toContain("## 1. Research Thread");
    expect(md).toContain("## 2. Hypothesis Slate");
    expect(md).toContain("## 3. Predictions Table");
    expect(md).toContain("## 4. Discriminative Tests");
    expect(md).toContain("## 5. Assumption Ledger");
    expect(md).toContain("## 6. Anomaly Register");
    expect(md).toContain("## 7. Adversarial Critique");

    // Predictions table should include hypothesis ID columns
    expect(md).toContain("| ID | Observation/Condition | H1 | H2 | H3 |");

    // Empty anomaly register should be explicit
    expect(md).toContain("None registered.");
  });
});

describe("lintArtifact", () => {
  test("flags missing required content as errors", () => {
    const artifact = createEmptyArtifact("TEST-LINT");
    const report = lintArtifact(artifact);

    expect(report.valid).toBe(false);
    expect(report.summary.errors).toBeGreaterThan(0);
    expect(report.violations.some((v) => v.id === "ER-001")).toBe(true);
    expect(report.violations.some((v) => v.id === "EH-003")).toBe(true);
  });

  test("returns valid when minimum guardrails are satisfied", () => {
    const base = createEmptyArtifact("TEST-LINT-OK");
    const deltas: ValidDelta[] = [
      makeValidDelta("EDIT", "research_thread", null, {
        statement: "What is X?",
        context: "Background context.",
        why_it_matters: "It matters because Y.",
        anchors: ["§1"],
      }),
      makeValidDelta("ADD", "hypothesis_slate", null, {
        name: "H1",
        claim: "A",
        mechanism: "M",
        anchors: ["§2"],
      }),
      makeValidDelta("ADD", "hypothesis_slate", null, {
        name: "H2",
        claim: "B",
        mechanism: "M",
        anchors: ["§3"],
      }),
      makeValidDelta("ADD", "hypothesis_slate", null, {
        name: "Third Alternative",
        claim: "Both could be wrong",
        mechanism: "Misspecification",
        anchors: ["inference"],
        third_alternative: true,
      }),
      makeValidDelta("ADD", "predictions_table", null, {
        condition: "Condition 1",
        predictions: { H1: "X", H2: "Y", H3: "indeterminate" },
      }),
      makeValidDelta("ADD", "predictions_table", null, {
        condition: "Condition 2",
        predictions: { H1: "X", H2: "X", H3: "indeterminate" },
      }),
      makeValidDelta("ADD", "predictions_table", null, {
        condition: "Condition 3",
        predictions: { H1: "Y", H2: "X", H3: "indeterminate" },
      }),
      makeValidDelta("ADD", "discriminative_tests", null, {
        name: "Test 1",
        procedure: "Do thing",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
        score: { likelihood_ratio: 3, cost: 2, speed: 2, ambiguity: 3 },
      }),
      makeValidDelta("ADD", "discriminative_tests", null, {
        name: "Test 2",
        procedure: "Do other thing",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A2", H2: "B2" },
        potency_check: "Control 2",
        score: { likelihood_ratio: 2, cost: 2, speed: 2, ambiguity: 2 },
      }),
      makeValidDelta("ADD", "assumption_ledger", null, {
        name: "Assumption 1",
        statement: "S1",
        load: "L1",
        test: "T1",
        scale_check: true,
        calculation: "1e3 > 1e2",
      }),
      makeValidDelta("ADD", "assumption_ledger", null, {
        name: "Assumption 2",
        statement: "S2",
        load: "L2",
        test: "T2",
      }),
      makeValidDelta("ADD", "assumption_ledger", null, {
        name: "Assumption 3",
        statement: "S3",
        load: "L3",
        test: "T3",
      }),
      makeValidDelta("ADD", "adversarial_critique", null, {
        name: "Critique 1",
        attack: "Attack",
        evidence: "Evidence",
        current_status: "Status",
        real_third_alternative: true,
      }),
      makeValidDelta("ADD", "adversarial_critique", null, {
        name: "Critique 2",
        attack: "Attack 2",
        evidence: "Evidence 2",
        current_status: "Status 2",
      }),
    ];

    const merged = mergeArtifact(base, deltas, "Agent1", "2025-01-01T00:00:00Z");
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;

    const report = lintArtifact(merged.artifact);
    expect(report.valid).toBe(true);
    expect(report.summary.errors).toBe(0);
  });
});

// ============================================================================
// Coverage-focused tests (exercise rarely-hit branches)
// ============================================================================

describe("artifact-merge additional coverage", () => {
  test("ADD rejects non-object payload (MISSING_REQUIRED_FIELD)", () => {
    const artifact = createEmptyArtifact("TEST-ADD-BAD-PAYLOAD");
    const delta = makeValidDelta("ADD", "hypothesis_slate", null, {});
    // Force payload to be non-object to hit the guardrail
    (delta as any).payload = ["not-an-object"];

    const result = mergeArtifact(artifact, [delta], "Agent", "2025-01-01T00:00:00Z");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "MISSING_REQUIRED_FIELD")).toBe(true);
  });

  test("EDIT rejects missing target_id for non-research_thread sections", () => {
    const artifact = createEmptyArtifact("TEST-EDIT-NO-TARGET");
    const delta = makeValidDelta("EDIT", "hypothesis_slate", null, { claim: "x" });
    const result = mergeArtifact(artifact, [delta], "Agent", "2025-01-01T00:00:00Z");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "INVALID_TARGET")).toBe(true);
  });

  test("research_thread anchors merge by default on EDIT when replace is not set", () => {
    const base = createEmptyArtifact("TEST-RT-ANCHORS");

    const first = mergeArtifact(
      base,
      [
        makeValidDelta("EDIT", "research_thread", null, {
          statement: "S",
          context: "C",
          why_it_matters: "W",
          anchors: ["§1"],
        }),
      ],
      "Agent",
      "2025-01-01T00:00:00Z",
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = mergeArtifact(
      first.artifact,
      [makeValidDelta("EDIT", "research_thread", null, { anchors: ["§2"] })],
      "Agent",
      "2025-01-01T00:01:00Z",
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const rtAnchors = second.artifact.sections.research_thread?.anchors ?? [];
    expect(rtAnchors).toEqual(expect.arrayContaining(["§1", "§2"]));
  });

  test("renderArtifactMarkdown renders empty contributors list and killed blocks + experiment result fields", () => {
    const artifact = createEmptyArtifact("TEST-RENDER-EXTRA");
    // Keep contributors empty to hit YAML 'contributors: []' branch.
    artifact.metadata.contributors = [];

    artifact.sections.research_thread = {
      id: "RT",
      statement: "Statement",
      context: "Context",
      why_it_matters: "Why",
      anchors: ["§1"],
    };

    artifact.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C", mechanism: "M", anchors: ["§2"], killed: true, killed_by: "Agent", killed_at: "t", kill_reason: "r" },
      { id: "HXYZ", name: "Third Alternative", claim: "Both wrong", mechanism: "?", anchors: ["inference"], third_alternative: true },
    ] as any;

    artifact.sections.predictions_table = [
      { id: "P1", condition: "Cond", predictions: { H1: "A", hxyz: "A" } },
    ] as any;

    artifact.sections.discriminative_tests = [
      {
        id: "T1",
        name: "Test 1",
        procedure: "P",
        discriminates: "H1 vs HXYZ",
        expected_outcomes: { H1: "A", HXYZ: "B" },
        potency_check: "Potency (no §50)",
        score: { likelihood_ratio: 1, cost: 1, speed: 1, ambiguity: 1 },
        status: "blocked",
        last_run: {
          result_id: "XR-001",
          run_at: "2025-01-01T00:00:00Z",
          exit_code: 1,
          timed_out: true,
          duration_ms: 1234,
          summary: "Boom",
          result_path: "results/XR-001.json",
        },
        actual_outcomes: { H1: "observed A" },
      },
    ] as any;

    artifact.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: ["H1"], status: "active", resolution_plan: "Plan" },
    ] as any;

    artifact.sections.assumption_ledger = [
      { id: "A1", name: "A1", statement: "S", load: "L", test: "T", scale_check: true, calculation: "1e3" },
    ] as any;

    artifact.sections.adversarial_critique = [
      { id: "C1", name: "C1", attack: "Attack", evidence: "Evidence", current_status: "active", real_third_alternative: true },
    ] as any;

    const md = renderArtifactMarkdown(artifact);
    expect(md).toContain("contributors:");
    expect(md).toContain("  []");
    expect(md).toContain("**Killed**: true");
    expect(md).toContain("**Last run**:");
    expect(md).toContain("**Actual outcomes**:");
    expect(md).toContain("## 6. Anomaly Register");
    expect(md).toContain("### X1: Anomaly");
    expect(md).toContain("**Observation**:");
  });

  test("lintArtifact flags a wide set of metadata + section violations and report formatters cover all sections", () => {
    const artifact = createEmptyArtifact(" ");
    artifact.metadata.status = "weird" as any;
    artifact.metadata.created_at = "not-a-date";
    artifact.metadata.updated_at = "2000-01-01T00:00:00Z";
    artifact.metadata.version = 1.5 as any;
    artifact.metadata.contributors = [];

    artifact.sections.research_thread = {
      id: "RT",
      statement: "",
      context: "",
      why_it_matters: "",
      anchors: [],
    };

    artifact.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "", mechanism: "M", anchors: ["§999"], unresolvedCritiqueCount: 0 },
      { id: "H2", name: "H2", claim: "C", mechanism: "M", anchors: ["[inference]"], unresolvedCritiqueCount: 0 },
      { id: "H3", name: "H3", claim: "C", mechanism: "M", anchors: [], unresolvedCritiqueCount: 0 },
      { id: "H4", name: "H4", claim: "C", mechanism: "M", anchors: ["§1"], unresolvedCritiqueCount: 0 },
      { id: "H5", name: "H5", claim: "C", mechanism: "M", anchors: ["§1"], unresolvedCritiqueCount: 0 },
      { id: "H6", name: "H6", claim: "C", mechanism: "M", anchors: ["§1"], unresolvedCritiqueCount: 0 },
      { id: "H7", name: "H7", claim: "C", mechanism: "M", anchors: ["§1"], unresolvedCritiqueCount: 0 },
    ] as any;

    artifact.sections.predictions_table = [
      { id: "P1", condition: "Cond", predictions: { H1: "X", H2: "X" } },
    ] as any;

    artifact.sections.discriminative_tests = [
      { id: "T1", name: "T1", procedure: "", discriminates: "", expected_outcomes: {}, potency_check: "", score: undefined },
      { id: "T2", name: "T2", procedure: "P", discriminates: "H1 vs H2", expected_outcomes: { H1: "X" }, potency_check: "Has potency but no §50", score: { likelihood_ratio: 3, cost: 3, speed: 3, ambiguity: 3 } },
      { id: "T3", name: "T3", procedure: "P", discriminates: "H1 vs H2", expected_outcomes: { H1: "X" }, potency_check: "Has potency but no §50", score: { likelihood_ratio: 1, cost: 1, speed: 1, ambiguity: 1 } },
    ] as any;

    artifact.sections.assumption_ledger = [
      { id: "A1", name: "A1", statement: "", load: "L", test: "T", scale_check: true, calculation: "" },
      { id: "A2", name: "A2", statement: "S", load: "L", test: "T" },
      { id: "A3", name: "A3", statement: "S", load: "L", test: "T" },
    ] as any;

    artifact.sections.adversarial_critique = [
      { id: "C1", name: "C1", attack: "", evidence: "", current_status: "" },
      { id: "C2", name: "C2", attack: "Attack", evidence: "", current_status: "" },
    ] as any;

    const report = lintArtifact(artifact);
    expect(report.valid).toBe(false);
    expect(report.violations.length).toBeGreaterThan(0);

    const human = formatLintReportHuman(report, "TEST");
    expect(human).toContain("Artifact Linter Report");

    const json = formatLintReportJson(report, "TEST");
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
