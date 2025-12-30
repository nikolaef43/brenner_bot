/**
 * Unit tests for operator-library.ts
 *
 * Uses the real operator library spec + quote bank to ensure the UI data source
 * stays schema-consistent and stays linked to tagged quotes.
 */

import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseOperatorLibrary, getOperatorPalette } from "./operator-library";

describe("operator-library", () => {
  it("parses core operators (canonical tag + quote-bank anchors)", async () => {
    const repoRoot = resolve(process.cwd(), "../..");
    const markdown = await readFile(resolve(repoRoot, "specs/operator_library_v0.1.md"), "utf8");

    const operators = parseOperatorLibrary(markdown);
    expect(operators.length).toBeGreaterThanOrEqual(10);

    const tags = operators.map((o) => o.canonicalTag);
    expect(tags).toContain("level-split");
    expect(tags).toContain("recode");
    expect(tags).toContain("materialize");
    expect(tags).toContain("invariant-extract");
    expect(tags).toContain("exclusion-test");
    expect(tags).toContain("scale-check");

    for (const operator of operators) {
      expect(operator.symbol.length).toBeGreaterThan(0);
      expect(operator.title.length).toBeGreaterThan(0);
      expect(operator.definition.length).toBeGreaterThan(0);
      expect(operator.quoteBankAnchors.length).toBeGreaterThan(0);
      expect(operator.whenToUseTriggers.length).toBeGreaterThan(0);
      expect(operator.failureModes.length).toBeGreaterThan(0);
      expect(operator.transcriptAnchors.length).toBeGreaterThan(0);
    }
  });

  it("links each operator to at least one supporting quote", async () => {
    const palette = await getOperatorPalette();
    expect(palette.length).toBeGreaterThanOrEqual(10);

    for (const operator of palette) {
      expect(operator.supportingQuotes.length).toBeGreaterThan(0);
      for (const quote of operator.supportingQuotes) {
        expect(quote.tags).toContain(operator.canonicalTag);
        expect(operator.quoteBankAnchors).toContain(quote.sectionId);
      }
    }
  });
});

