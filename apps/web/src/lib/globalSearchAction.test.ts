import { describe, expect, it } from "vitest";
import { searchAction, warmSearchIndex } from "./globalSearchAction";

describe("globalSearchAction", () => {
  it("warmSearchIndex completes without throwing", async () => {
    await warmSearchIndex();
  });

  it("searchAction returns structured hits", async () => {
    const result = await searchAction("Brenner", { limit: 5 });
    expect(Array.isArray(result.hits)).toBe(true);
    expect(result.totalMatches).toBeGreaterThanOrEqual(result.hits.length);
  });
});

