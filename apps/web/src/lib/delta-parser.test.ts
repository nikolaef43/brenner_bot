/**
 * Delta Parser Tests
 *
 * Verifies the delta parsing and validation logic.
 * Philosophy: NO mocks - test real parsing with real fixtures.
 */

import { describe, expect, it } from "vitest";
import {
  extractValidDeltas,
  generateNextId,
  parseDeltaMessage,
  validateTargetIdPrefix,
  type DeltaSection,
} from "./delta-parser";

describe("parseDeltaMessage", () => {
  it("parses a valid ADD delta", () => {
    const body = `
Some prose explanation here.

## Deltas

\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "Test Hypothesis",
    "claim": "X causes Y",
    "mechanism": "Via pathway Z"
  },
  "rationale": "Testing the parser"
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.totalBlocks).toBe(1);
    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(0);
    expect(result.deltas[0]).toMatchObject({
      valid: true,
      operation: "ADD",
      section: "hypothesis_slate",
      target_id: null,
    });
  });

  it("parses a valid EDIT delta with target_id", () => {
    const body = `
\`\`\`delta
{
  "operation": "EDIT",
  "section": "hypothesis_slate",
  "target_id": "H1",
  "payload": {
    "name": "Updated Hypothesis",
    "claim": "X causes Y via W"
  }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.validCount).toBe(1);
    expect(result.deltas[0]).toMatchObject({
      valid: true,
      operation: "EDIT",
      section: "hypothesis_slate",
      target_id: "H1",
    });
  });

  it("parses a valid KILL delta", () => {
    const body = `
\`\`\`delta
{
  "operation": "KILL",
  "section": "hypothesis_slate",
  "target_id": "H2",
  "payload": {
    "reason": "Evidence X contradicts core mechanism"
  }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.validCount).toBe(1);
    expect(result.deltas[0]).toMatchObject({
      valid: true,
      operation: "KILL",
      section: "hypothesis_slate",
      target_id: "H2",
    });
  });

  it("rejects ADD with non-null target_id", () => {
    const body = `
\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": "H1",
  "payload": { "name": "Test" }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.invalidCount).toBe(1);
    expect(result.deltas[0]).toMatchObject({
      valid: false,
    });
    if (!result.deltas[0]?.valid) {
      expect(result.deltas[0].error).toContain("ADD operation must have target_id as null");
    }
  });

  it("rejects EDIT without target_id", () => {
    const body = `
\`\`\`delta
{
  "operation": "EDIT",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": { "name": "Test" }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.invalidCount).toBe(1);
    if (!result.deltas[0]?.valid) {
      expect(result.deltas[0].error).toContain("EDIT operation requires target_id");
    }
  });

  it("rejects invalid operation", () => {
    const body = `
\`\`\`delta
{
  "operation": "DELETE",
  "section": "hypothesis_slate",
  "target_id": "H1",
  "payload": {}
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.invalidCount).toBe(1);
    if (!result.deltas[0]?.valid) {
      expect(result.deltas[0].error).toContain("Invalid operation");
    }
  });

  it("rejects invalid section", () => {
    const body = `
\`\`\`delta
{
  "operation": "ADD",
  "section": "unknown_section",
  "target_id": null,
  "payload": {}
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.invalidCount).toBe(1);
    if (!result.deltas[0]?.valid) {
      expect(result.deltas[0].error).toContain("Invalid section");
    }
  });

  it("rejects KILL without reason", () => {
    const body = `
\`\`\`delta
{
  "operation": "KILL",
  "section": "hypothesis_slate",
  "target_id": "H1",
  "payload": {}
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.invalidCount).toBe(1);
    if (!result.deltas[0]?.valid) {
      expect(result.deltas[0].error).toContain("KILL operation requires payload with 'reason'");
    }
  });

  it("rejects research_thread with non-EDIT operation", () => {
    const body = `
\`\`\`delta
{
  "operation": "ADD",
  "section": "research_thread",
  "target_id": null,
  "payload": { "context": "Test" }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.invalidCount).toBe(1);
    if (!result.deltas[0]?.valid) {
      expect(result.deltas[0].error).toContain("research_thread section only supports EDIT");
    }
  });

  it("accepts research_thread EDIT with null target_id", () => {
    const body = `
\`\`\`delta
{
  "operation": "EDIT",
  "section": "research_thread",
  "target_id": null,
  "payload": {
    "statement": "How do cells determine fate?",
    "context": "Based on Brenner transcript"
  }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(0);
    expect(result.deltas[0]).toMatchObject({
      valid: true,
      operation: "EDIT",
      section: "research_thread",
      target_id: null,
    });
  });

  it("handles multiple delta blocks", () => {
    const body = `
\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": { "name": "H1" }
}
\`\`\`

Some text.

\`\`\`delta
{
  "operation": "ADD",
  "section": "discriminative_tests",
  "target_id": null,
  "payload": { "name": "T1" }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.totalBlocks).toBe(2);
    expect(result.validCount).toBe(2);
  });

  it("handles malformed JSON gracefully", () => {
    const body = `
\`\`\`delta
{ not valid json }
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.invalidCount).toBe(1);
    if (!result.deltas[0]?.valid) {
      expect(result.deltas[0].error).toContain("Invalid JSON");
    }
  });

  it("returns empty results for body with no delta blocks", () => {
    const body = `
Just regular markdown with no delta blocks.

\`\`\`typescript
const x = 1;
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.totalBlocks).toBe(0);
    expect(result.validCount).toBe(0);
    expect(result.deltas).toHaveLength(0);
  });
});

describe("extractValidDeltas", () => {
  it("filters to only valid deltas", () => {
    const body = `
\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": { "name": "Valid" }
}
\`\`\`

\`\`\`delta
{ "invalid": true }
\`\`\`

\`\`\`delta
{
  "operation": "ADD",
  "section": "discriminative_tests",
  "target_id": null,
  "payload": { "name": "Also Valid" }
}
\`\`\`
`;

    const deltas = extractValidDeltas(body);

    expect(deltas).toHaveLength(2);
    expect(deltas[0]?.section).toBe("hypothesis_slate");
    expect(deltas[1]?.section).toBe("discriminative_tests");
  });
});

describe("validateTargetIdPrefix", () => {
  it("validates correct prefixes", () => {
    const cases: Array<{ id: string; section: DeltaSection; expected: boolean }> = [
      { id: "H1", section: "hypothesis_slate", expected: true },
      { id: "H42", section: "hypothesis_slate", expected: true },
      { id: "T1", section: "discriminative_tests", expected: true },
      { id: "P5", section: "predictions_table", expected: true },
      { id: "A3", section: "assumption_ledger", expected: true },
      { id: "X2", section: "anomaly_register", expected: true },
      { id: "C1", section: "adversarial_critique", expected: true },
      { id: "RT", section: "research_thread", expected: true },
      // Wrong prefixes
      { id: "T1", section: "hypothesis_slate", expected: false },
      { id: "H1", section: "discriminative_tests", expected: false },
    ];

    for (const { id, section, expected } of cases) {
      expect(validateTargetIdPrefix(id, section)).toBe(expected);
    }
  });
});

describe("generateNextId", () => {
  it("generates sequential IDs", () => {
    expect(generateNextId("hypothesis_slate", [])).toBe("H1");
    expect(generateNextId("hypothesis_slate", ["H1"])).toBe("H2");
    expect(generateNextId("hypothesis_slate", ["H1", "H2", "H3"])).toBe("H4");
    expect(generateNextId("discriminative_tests", ["T1", "T5"])).toBe("T6");
  });

  it("handles non-matching IDs", () => {
    // IDs from other sections should be ignored
    expect(generateNextId("hypothesis_slate", ["T1", "A2", "X3"])).toBe("H1");
  });

  it("handles empty existing IDs", () => {
    expect(generateNextId("anomaly_register", [])).toBe("X1");
    expect(generateNextId("adversarial_critique", [])).toBe("C1");
  });
});
