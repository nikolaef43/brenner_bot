import { describe, it, expect } from "vitest";
import {
  composeExcerpt,
  parseExcerpt,
  extractAnchorsFromExcerpt,
  type ExcerptSection,
} from "./excerpt-builder";

describe("composeExcerpt", () => {
  const testSections: ExcerptSection[] = [
    {
      anchor: "§42",
      quote: "The question is not whether you can do the experiment, but whether it will tell you anything.",
      title: "On Discriminative Tests",
    },
    {
      anchor: "§45",
      quote: "You need a chastity control.",
      title: "Potency Checks",
    },
  ];

  it("composes a valid excerpt block", () => {
    const result = composeExcerpt({ sections: testSections });

    expect(result.markdown).toContain("### Excerpt");
    expect(result.markdown).toContain("**§42**");
    expect(result.markdown).toContain("**§45**");
    expect(result.markdown).toContain("On Discriminative Tests");
    expect(result.markdown).toContain("**Sections included**: §42, §45");
    expect(result.anchors).toEqual(["§42", "§45"]);
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("includes theme in heading when provided", () => {
    const result = composeExcerpt({
      theme: "Experimental Design",
      sections: testSections,
    });

    expect(result.markdown).toContain("### Excerpt: Experimental Design");
  });

  it("orders chronologically when specified", () => {
    const unorderedSections: ExcerptSection[] = [
      { anchor: "§100", quote: "Later quote." },
      { anchor: "§42", quote: "Earlier quote." },
    ];

    const result = composeExcerpt({
      sections: unorderedSections,
      ordering: "chronological",
    });

    expect(result.anchors).toEqual(["§42", "§100"]);
    expect(result.markdown.indexOf("§42")).toBeLessThan(
      result.markdown.indexOf("§100")
    );
  });

  it("warns when fewer than 2 sections", () => {
    const result = composeExcerpt({
      sections: [{ anchor: "§42", quote: "Single quote." }],
    });

    expect(result.warnings).toContain(
      "Excerpt has fewer than 2 sections (has 1)"
    );
  });

  it("warns when more than 7 sections", () => {
    const manySections: ExcerptSection[] = Array.from({ length: 8 }, (_, i) => ({
      anchor: `§${i + 1}`,
      quote: `Quote ${i + 1}.`,
    }));

    const result = composeExcerpt({ sections: manySections });

    expect(result.warnings).toContain(
      "Excerpt has more than 7 sections (has 8)"
    );
  });

  it("warns on invalid anchor format", () => {
    const result = composeExcerpt({
      sections: [
        { anchor: "42", quote: "Missing § prefix." },
        { anchor: "§45", quote: "Valid anchor." },
      ],
    });

    expect(result.warnings).toContain('Invalid anchor format: "42" (expected §n)');
  });

  it("warns on duplicate anchors", () => {
    const result = composeExcerpt({
      sections: [
        { anchor: "§42", quote: "First quote." },
        { anchor: "§42", quote: "Duplicate anchor." },
      ],
    });

    expect(result.warnings).toContain("Excerpt contains duplicate anchors");
  });

  it("warns when exceeding word limit", () => {
    const longQuote = "word ".repeat(500);
    const result = composeExcerpt({
      sections: [
        { anchor: "§1", quote: longQuote },
        { anchor: "§2", quote: longQuote },
      ],
      maxTotalWords: 800,
    });

    expect(result.warnings.some((w) => w.includes("exceeds"))).toBe(true);
    expect(result.wordCount).toBeGreaterThan(800);
  });

  it("calculates word count correctly", () => {
    const result = composeExcerpt({
      sections: [
        { anchor: "§1", quote: "One two three." },
        { anchor: "§2", quote: "Four five." },
      ],
    });

    expect(result.wordCount).toBe(5);
  });
});

describe("parseExcerpt", () => {
  it("parses a valid excerpt block", () => {
    const markdown = `### Excerpt: Test Theme

> **§42**: "First quote here."
> — *Section Title One*

> **§45**: "Second quote here."
> — *Section Title Two*

**Sections included**: §42, §45
**Total words**: ~10 words`;

    const sections = parseExcerpt(markdown);

    expect(sections).toHaveLength(2);
    expect(sections![0]).toEqual({
      anchor: "§42",
      quote: "First quote here.",
      title: "Section Title One",
    });
    expect(sections![1]).toEqual({
      anchor: "§45",
      quote: "Second quote here.",
      title: "Section Title Two",
    });
  });

  it("handles excerpts without attributions", () => {
    const markdown = `### Excerpt

> **§42**: "Quote without attribution."

> **§45**: "Another quote."

**Sections included**: §42, §45`;

    const sections = parseExcerpt(markdown);

    expect(sections).toHaveLength(2);
    expect(sections![0].title).toBeUndefined();
    expect(sections![1].title).toBeUndefined();
  });

  it("returns null for invalid format", () => {
    const markdown = "This is not an excerpt block.";
    const sections = parseExcerpt(markdown);
    expect(sections).toBeNull();
  });
});

describe("extractAnchorsFromExcerpt", () => {
  it("extracts all anchors from excerpt", () => {
    const markdown = `### Excerpt

> **§42**: "First quote."
> **§45**: "Second quote."
> **§100**: "Third quote."

**Sections included**: §42, §45, §100`;

    const anchors = extractAnchorsFromExcerpt(markdown);

    expect(anchors).toContain("§42");
    expect(anchors).toContain("§45");
    expect(anchors).toContain("§100");
    expect(anchors).toHaveLength(3);
  });

  it("deduplicates anchors", () => {
    const markdown = `### Excerpt

> **§42**: "First occurrence."
> **§42**: "Duplicate anchor."`;

    const anchors = extractAnchorsFromExcerpt(markdown);

    expect(anchors).toEqual(["§42"]);
  });

  it("returns empty array for no matches", () => {
    const anchors = extractAnchorsFromExcerpt("No anchors here.");
    expect(anchors).toEqual([]);
  });
});

describe("round-trip", () => {
  it("compose then parse returns equivalent sections", () => {
    const original: ExcerptSection[] = [
      {
        anchor: "§42",
        quote: "The question is not whether you can do the experiment.",
        title: "On Discriminative Tests",
      },
      {
        anchor: "§45",
        quote: "You need a chastity control.",
        title: "Potency Checks",
      },
    ];

    const composed = composeExcerpt({ sections: original });
    const parsed = parseExcerpt(composed.markdown);

    expect(parsed).toHaveLength(2);
    expect(parsed![0].anchor).toBe(original[0].anchor);
    expect(parsed![0].quote).toBe(original[0].quote);
    expect(parsed![0].title).toBe(original[0].title);
    expect(parsed![1].anchor).toBe(original[1].anchor);
    expect(parsed![1].quote).toBe(original[1].quote);
    expect(parsed![1].title).toBe(original[1].title);
  });
});
