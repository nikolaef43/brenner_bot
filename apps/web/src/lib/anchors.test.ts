import { describe, expect, it } from "vitest";
import {
  makeDistillationSectionDomId,
  makeTranscriptSectionDomId,
  quoteBankDomIdFromSectionId,
  quoteBankSectionIdFromDomId,
  slugifyHeadingForAnchor,
} from "./anchors";

describe("anchors", () => {
  it("slugifies headings for stable anchors", () => {
    expect(slugifyHeadingForAnchor("The DIY/Bricolage Approach")).toBe("the-diy-bricolage-approach");
    expect(slugifyHeadingForAnchor("  Two Axioms → operator algebra → loop  ")).toBe(
      "two-axioms-operator-algebra-loop",
    );
  });

  it("generates transcript DOM ids", () => {
    expect(makeTranscriptSectionDomId(42)).toBe("section-42");
  });

  it("converts quote-bank section ids to DOM ids and back", () => {
    expect(quoteBankDomIdFromSectionId("§57")).toBe("section-57");
    expect(quoteBankDomIdFromSectionId("§57-1")).toBe("section-57-1");
    expect(quoteBankSectionIdFromDomId("section-57")).toBe("§57");
    expect(quoteBankSectionIdFromDomId("section-57-1")).toBe("§57-1");
  });

  it("generates distillation DOM ids with part prefix", () => {
    expect(makeDistillationSectionDomId({ title: "The DIY/Bricolage Approach", partNumber: 2 })).toBe(
      "part-2-the-diy-bricolage-approach",
    );
  });

  it("falls back for empty slugs", () => {
    expect(makeDistillationSectionDomId({ title: "→", partNumber: 1, index: 7 })).toBe("part-1-section-7");
  });
});

