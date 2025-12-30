import { describe, it, expect } from "vitest";

import { clearIndex, globalSearch } from "./globalSearch";

describe("globalSearch", () => {
  it("returns empty results for 1-character queries", async () => {
    clearIndex();

    const result = await globalSearch("a");
    expect(result.hits).toHaveLength(0);
    expect(result.totalMatches).toBe(0);

    for (const count of Object.values(result.categories)) {
      expect(count).toBe(0);
    }
  });

  it("returns empty results when all query terms are 1 character", async () => {
    clearIndex();

    const result = await globalSearch("a b c");
    expect(result.hits).toHaveLength(0);
    expect(result.totalMatches).toBe(0);

    for (const count of Object.values(result.categories)) {
      expect(count).toBe(0);
    }
  });
});

