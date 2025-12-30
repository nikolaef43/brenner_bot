import { describe, expect, it } from "vitest";
import { searchJargon } from "./jargon";

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

