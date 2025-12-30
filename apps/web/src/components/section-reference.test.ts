import { describe, expect, it } from "vitest";

import { SECTION_REF_REGEX, hasSectionReferences, parseSectionReferences } from "./section-reference";

describe("section-reference utilities", () => {
  it("hasSectionReferences() is stable across repeated calls", () => {
    const text = "See §42 and §106 for more details.";

    for (let i = 0; i < 5; i++) {
      expect(hasSectionReferences(text)).toBe(true);
      expect(SECTION_REF_REGEX.lastIndex).toBe(0);
    }

    const noRefs = "See section 42 and 106 for more details.";
    for (let i = 0; i < 5; i++) {
      expect(hasSectionReferences(noRefs)).toBe(false);
      expect(SECTION_REF_REGEX.lastIndex).toBe(0);
    }
  });

  it("parseSectionReferences() expands ranges and is stable", () => {
    const text = "See §1-3 and §10.";
    expect(parseSectionReferences(text)).toEqual([1, 2, 3, 10]);
    expect(SECTION_REF_REGEX.lastIndex).toBe(0);
    expect(parseSectionReferences(text)).toEqual([1, 2, 3, 10]);
    expect(SECTION_REF_REGEX.lastIndex).toBe(0);
  });
});

