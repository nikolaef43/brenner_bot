/**
 * Unit tests for tribunal objection extraction
 *
 * @see @/lib/brenner-loop/agents/objections
 */

import { describe, expect, it } from "vitest";
import { extractKeyObjectionBlocks, extractTribunalObjections } from "./objections";

describe("extractKeyObjectionBlocks", () => {
  it("extracts a single Key Objection block", () => {
    const md = [
      "## Critical Assessment",
      "",
      "### Key Objection",
      "The core issue is reverse causation: Y could cause X.",
      "",
      "### Alternative Explanations",
      "- Z drives both.",
    ].join("\n");

    expect(extractKeyObjectionBlocks(md)).toEqual([
      "The core issue is reverse causation: Y could cause X.",
    ]);
  });

  it("extracts multiple Key Objection blocks from one message", () => {
    const md = [
      "### Key Objection",
      "First objection.",
      "",
      "### Key Objection",
      "Second objection.",
      "",
      "### Falsification Criteria",
      "- Do X.",
    ].join("\n");

    expect(extractKeyObjectionBlocks(md)).toEqual(["First objection.", "Second objection."]);
  });

  it("ignores headings inside fenced code blocks", () => {
    const md = [
      "### Key Objection",
      "Here is a fenced example:",
      "",
      "```md",
      "### Not A Real Heading",
      "```",
      "",
      "Still part of the objection.",
      "",
      "### Next Section",
      "ignored",
    ].join("\n");

    expect(extractKeyObjectionBlocks(md)).toEqual([
      ["Here is a fenced example:", "", "```md", "### Not A Real Heading", "```", "", "Still part of the objection."].join(
        "\n"
      ),
    ]);
  });
});

describe("extractTribunalObjections", () => {
  it("builds extracted objections with stable ids and role inference", () => {
    const messages = [
      {
        id: 123,
        thread_id: "TRIBUNAL-SESSION-abc",
        subject: "TRIBUNAL[devils_advocate]: HYP-1",
        created_ts: "2026-01-01T00:00:00.000Z",
        from: "DevilBot",
        body_md: [
          "## Critical Assessment",
          "",
          "### Key Objection",
          "This looks like reverse causation (fatal).",
          "",
          "### Alternative Explanations",
          "- Z explains both.",
        ].join("\n"),
      },
    ];

    const objections = extractTribunalObjections(messages);
    expect(objections).toHaveLength(1);

    const obj = objections[0]!;
    expect(obj.id).toBe("123:0");
    expect(obj.type).toBe("reverse_causation");
    expect(obj.severity).toBe("fatal");
    expect(obj.summary).toMatch(/reverse causation/i);
    expect(obj.fullArgument).toMatch(/fatal/i);
    expect(obj.source.role).toBe("devils_advocate");
    expect(obj.source.messageId).toBe(123);
    expect(obj.source.agentName).toBe("DevilBot");
  });

  it("returns empty when no Key Objection blocks exist", () => {
    const messages = [
      {
        id: 1,
        thread_id: "TRIBUNAL-SESSION-abc",
        subject: "TRIBUNAL[experiment_designer]: HYP-1",
        created_ts: "2026-01-01T00:00:00.000Z",
        body_md: "## Methods\nNo objections here.",
      },
    ];

    expect(extractTribunalObjections(messages)).toEqual([]);
  });
});

