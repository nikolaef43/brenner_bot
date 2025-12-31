import { describe, expect, it } from "vitest";
import {
  findJargonInText,
  getCategoryCounts,
  getJargon,
  getMatchableTerms,
  getTermCount,
  getTermsByCategory,
  searchJargon,
} from "./jargon";

describe("searchJargon", () => {
  it("searches across term, short, long, analogy, and why", () => {
    // "plumbing" appears in the Level-split analogy.
    const plumbingMatches = searchJargon("plumbing").map(([key]) => key);
    expect(plumbingMatches).toContain("level-split");

    // "Von Neumann" appears in the Level-split why field.
    const vonMatches = searchJargon("Von Neumann").map(([key]) => key);
    expect(vonMatches).toContain("level-split");
  });

  it("treats multi-word queries as AND", () => {
    const matches = searchJargon("plumbing von").map(([key]) => key);
    expect(matches).toContain("level-split");
  });

  it("returns empty array when nothing matches", () => {
    expect(searchJargon("definitely-not-a-real-term")).toEqual([]);
  });
});

describe("jargon helpers", () => {
  it("getJargon returns a term for a known key", () => {
    const term = getJargon("level-split");
    expect(term?.term).toBe("Level-split");
  });

  it("getTermsByCategory returns only items for that category", () => {
    const operators = getTermsByCategory("operators");
    expect(operators.length).toBeGreaterThan(0);
    expect(operators.every(([, term]) => term.category === "operators")).toBe(true);
  });

  it("getCategoryCounts returns counts for all categories", () => {
    const counts = new Map(getCategoryCounts());
    expect(counts.size).toBeGreaterThan(0);
    expect((counts.get("operators") ?? 0) > 0).toBe(true);
  });

  it("getTermCount is consistent with category counts", () => {
    const total = getTermCount();
    const byCategory = getCategoryCounts().reduce((sum, [, n]) => sum + n, 0);
    expect(total).toBe(byCategory);
    expect(total).toBeGreaterThan(0);
  });

  it("findJargonInText finds match positions for known terms", () => {
    const matches = findJargonInText("A level-split helps avoid confusion.");
    expect(matches.some((m) => m.termKey === "level-split")).toBe(true);
    expect(matches.every((m) => m.start >= 0 && m.end > m.start)).toBe(true);
  });

  it("getMatchableTerms returns a stable non-empty list of normalized keys", () => {
    const terms = getMatchableTerms();
    expect(terms.length).toBeGreaterThan(0);
    expect(terms.every((t) => t === t.toLowerCase())).toBe(true);
  });
});
