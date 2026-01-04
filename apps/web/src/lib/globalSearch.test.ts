import { beforeEach, describe, expect, it } from "vitest";
import { clearIndex, getIndexStats, globalSearch, warmIndex } from "./globalSearch";

describe("globalSearch", () => {
  beforeEach(() => {
    clearIndex();
  });

  it("getIndexStats reports not indexed before warmIndex", () => {
    const stats = getIndexStats();
    expect(stats.indexed).toBe(false);
    expect(stats.chunkCount).toBe(0);
    expect(stats.timestamp).toBeNull();
  });

  it("warmIndex builds an index and getIndexStats reports category counts", async () => {
    await warmIndex();

    const stats = getIndexStats();
    expect(stats.indexed).toBe(true);
    expect(stats.chunkCount).toBeGreaterThan(0);

    const totalByCategory = Object.values(stats.categoryCounts).reduce((a, b) => a + b, 0);
    expect(totalByCategory).toBe(stats.chunkCount);
  });

  it("returns empty results for empty query", async () => {
    const result = await globalSearch("   ");
    expect(result.hits).toEqual([]);
    expect(result.totalMatches).toBe(0);
  });

  it("returns empty results for queries with no meaningful terms (1-char)", async () => {
    const result = await globalSearch("a");
    expect(result.hits).toEqual([]);
    expect(result.totalMatches).toBe(0);
  });

  it("finds matches and returns hits with snippets and highlights", async () => {
    const result = await globalSearch("Brenner", { limit: 5 });
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.totalMatches).toBeGreaterThanOrEqual(result.hits.length);

    const [first] = result.hits;
    if (!first) {
      throw new Error("Expected at least one search hit");
    }
    expect(first.title.length).toBeGreaterThan(0);
    expect(first.snippet.length).toBeGreaterThan(0);
    expect(first.url.startsWith("/")).toBe(true);
    expect(Array.isArray(first.highlights)).toBe(true);
  });

  it("supports category filtering", async () => {
    const result = await globalSearch("Brenner", { category: "transcript", limit: 10 });
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits.every((h) => h.category === "transcript")).toBe(true);
  });

  it("supports docIds filtering", async () => {
    const result = await globalSearch("Brenner", { docIds: ["transcript"], limit: 10 });
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits.every((h) => h.docId === "transcript")).toBe(true);
  });

  it("supports model filtering for distillation/raw-response documents", async () => {
    const result = await globalSearch("Brenner", { model: "gpt", limit: 10 });
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits.every((h) => h.model === "gpt")).toBe(true);
  });

  it("scores exact title matches higher (sanity check)", async () => {
    const broad = await globalSearch("Brenner", { limit: 3 });
    expect(broad.hits.length).toBeGreaterThan(0);

    const [first] = broad.hits;
    if (!first) {
      throw new Error("Expected at least one search hit");
    }
    const title = first.title;
    const exact = await globalSearch(title, { limit: 3 });
    expect(exact.hits.length).toBeGreaterThan(0);
    const [exactFirst] = exact.hits;
    if (!exactFirst) {
      throw new Error("Expected at least one exact search hit");
    }
    expect(exactFirst.score).toBeGreaterThanOrEqual(first.score);
  });
});
