import { describe, test, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  HypothesisStorage,
  type SessionHypothesisFile,
} from "./hypothesis-storage";
import { createHypothesis, type Hypothesis } from "../schemas/hypothesis";

/**
 * Tests for Hypothesis Storage Layer
 *
 * @see brenner_bot-8hv8 (bead)
 */

// ============================================================================
// Test Helpers
// ============================================================================

let testDir: string;
let storage: HypothesisStorage;

function createTestHypothesisData(
  overrides: Partial<{
    id: string;
    sessionId: string;
    statement: string;
    category: "mechanistic" | "phenomenological" | "boundary" | "auxiliary" | "third_alternative";
    confidence: "high" | "medium" | "low" | "speculative";
    state: "proposed" | "active" | "confirmed" | "refuted" | "superseded" | "deferred";
    mechanism: string;
    tags: string[];
    notes: string;
  }> = {}
): Hypothesis {
  const sessionId = overrides.sessionId ?? "TEST";
  const id = overrides.id ?? `H-${sessionId}-001`;

  const hypothesis = createHypothesis({
    id,
    sessionId,
    statement: overrides.statement ?? "A sufficiently specific hypothesis statement for testing",
    category: overrides.category ?? "mechanistic",
    confidence: overrides.confidence ?? "medium",
    mechanism: overrides.mechanism ?? "Some plausible mechanism",
  });

  return {
    ...hypothesis,
    ...(overrides.state ? { state: overrides.state } : {}),
    ...(overrides.tags ? { tags: overrides.tags } : {}),
    ...(overrides.notes ? { notes: overrides.notes } : {}),
  };
}

beforeEach(async () => {
  testDir = join(
    tmpdir(),
    `hypothesis-storage-test-${randomUUID()}`
  );
  await fs.mkdir(testDir, { recursive: true });
  storage = new HypothesisStorage({ baseDir: testDir, autoRebuildIndex: false });
});

// Note: No cleanup. Repo invariant: do not delete files/dirs without explicit approval.

// ============================================================================
// Session File Operations Tests
// ============================================================================

describe("Session File Operations", () => {
  test("saves and loads hypotheses for a session", async () => {
    const h1 = createTestHypothesisData({ id: "H-TEST-001" });
    const h2 = createTestHypothesisData({ id: "H-TEST-002" });

    await storage.saveSessionHypotheses("TEST", [h1, h2]);
    const loaded = await storage.loadSessionHypotheses("TEST");

    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe("H-TEST-001");
    expect(loaded[1].id).toBe("H-TEST-002");
  });

  test("returns empty array for non-existent session", async () => {
    const loaded = await storage.loadSessionHypotheses("NONEXISTENT");
    expect(loaded).toHaveLength(0);
  });

  test("throws on malformed session file (non-ENOENT error path)", async () => {
    await fs.mkdir(join(testDir, ".research", "hypotheses"), { recursive: true });
    const filePath = join(testDir, ".research", "hypotheses", "BAD-hypotheses.json");
    await fs.writeFile(filePath, "not-json");

    await expect(storage.loadSessionHypotheses("BAD")).rejects.toBeDefined();
  });

  test("preserves createdAt on update", async () => {
    const hypothesis = createTestHypothesisData();
    await storage.saveSessionHypotheses("TEST", [hypothesis]);

    const filePath = join(testDir, ".research", "hypotheses", "TEST-hypotheses.json");
    const content1 = JSON.parse(await fs.readFile(filePath, "utf-8")) as SessionHypothesisFile;
    const originalCreatedAt = content1.createdAt;

    await new Promise((r) => setTimeout(r, 10));
    const updated = { ...hypothesis, notes: "Updated notes" };
    await storage.saveSessionHypotheses("TEST", [updated]);

    const content2 = JSON.parse(await fs.readFile(filePath, "utf-8")) as SessionHypothesisFile;
    expect(content2.createdAt).toBe(originalCreatedAt);
    expect(content2.updatedAt).not.toBe(content2.createdAt);
  });

  test("autoRebuildIndex updates index when enabled", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    const autoStorage = new HypothesisStorage({ baseDir: testDir, autoRebuildIndex: true });

    await autoStorage.saveSessionHypotheses("TEST", [hypothesis]);

    const indexPath = join(testDir, ".research", "hypothesis-index.json");
    const content = await fs.readFile(indexPath, "utf-8");
    expect(content).toContain("\"version\"");
  });
});

// ============================================================================
// Individual Hypothesis Operations Tests
// ============================================================================

describe("Individual Hypothesis Operations", () => {
  test("getHypothesisById returns hypothesis when found", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveSessionHypotheses("TEST", [hypothesis]);

    const found = await storage.getHypothesisById("H-TEST-001");
    expect(found).not.toBeNull();
    expect(found?.id).toBe("H-TEST-001");
  });

  test("getHypothesisById returns null for invalid ID format", async () => {
    const found = await storage.getHypothesisById("invalid-id");
    expect(found).toBeNull();
  });

  test("getHypothesisById returns null when not found", async () => {
    const found = await storage.getHypothesisById("H-TEST-999");
    expect(found).toBeNull();
  });

  test("saveHypothesis creates new hypothesis", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveHypothesis(hypothesis);

    const found = await storage.getHypothesisById("H-TEST-001");
    expect(found).not.toBeNull();
  });

  test("saveHypothesis updates existing hypothesis", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveHypothesis(hypothesis);

    const updated = { ...hypothesis, notes: "Updated notes" };
    await storage.saveHypothesis(updated);

    const found = await storage.getHypothesisById("H-TEST-001");
    expect(found?.notes).toBe("Updated notes");

    const all = await storage.loadSessionHypotheses("TEST");
    expect(all).toHaveLength(1);
  });

  test("deleteHypothesis removes hypothesis", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveHypothesis(hypothesis);

    const deleted = await storage.deleteHypothesis("H-TEST-001");
    expect(deleted).toBe(true);

    const found = await storage.getHypothesisById("H-TEST-001");
    expect(found).toBeNull();
  });

  test("deleteHypothesis returns false for non-existent hypothesis", async () => {
    const deleted = await storage.deleteHypothesis("H-TEST-999");
    expect(deleted).toBe(false);
  });

  test("deleteHypothesis returns false if hypothesis disappears between lookup and delete", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });

    class FlakyStorage extends HypothesisStorage {
      private calls = 0;

      // Simulate a race: first call finds hypothesis, second call returns empty session list.
      override async loadSessionHypotheses(_sessionId: string) {
        this.calls++;
        return this.calls === 1 ? [hypothesis] : [];
      }
    }

    const flaky = new FlakyStorage({ baseDir: testDir, autoRebuildIndex: false });
    const deleted = await flaky.deleteHypothesis("H-TEST-001");
    expect(deleted).toBe(false);
  });
});

// ============================================================================
// Index Operations Tests
// ============================================================================

describe("Index Operations", () => {
  test("rebuildIndex creates index from session files", async () => {
    const h1 = createTestHypothesisData({ id: "H-S1-001", sessionId: "S1" });
    const h2 = createTestHypothesisData({ id: "H-S2-001", sessionId: "S2" });

    await storage.saveSessionHypotheses("S1", [h1]);
    await storage.saveSessionHypotheses("S2", [h2]);

    const index = await storage.rebuildIndex();

    expect(index.entries).toHaveLength(2);
    expect(index.entries.map((e) => e.id)).toContain("H-S1-001");
    expect(index.entries.map((e) => e.id)).toContain("H-S2-001");
  });

  test("loadIndex rebuilds if missing", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveSessionHypotheses("TEST", [hypothesis]);

    const index = await storage.loadIndex();
    expect(index.entries).toHaveLength(1);
  });

  test("loadIndex returns existing index", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveSessionHypotheses("TEST", [hypothesis]);
    await storage.rebuildIndex();

    const index = await storage.loadIndex();
    expect(index.entries).toHaveLength(1);
    expect(index.version).toBe("1.0.0");
  });

  test("index entries contain correct metadata", async () => {
    const hypothesis = createTestHypothesisData({
      id: "H-TEST-001",
      sessionId: "TEST",
      category: "mechanistic",
      confidence: "high",
      state: "active",
      mechanism: "Mechanism X",
    });

    await storage.saveHypothesis(hypothesis);
    const index = await storage.rebuildIndex();

    expect(index.entries).toHaveLength(1);
    const entry = index.entries[0];
    expect(entry.category).toBe("mechanistic");
    expect(entry.confidence).toBe("high");
    expect(entry.state).toBe("active");
    expect(entry.hasMechanism).toBe(true);
    expect(entry.unresolvedCritiqueCount).toBe(0);
  });
});

// ============================================================================
// Query Operations Tests
// ============================================================================

describe("Query Operations", () => {
  test("getActiveHypotheses returns only active hypotheses", async () => {
    const active = createTestHypothesisData({ id: "H-TEST-001", state: "active" });
    const proposed = createTestHypothesisData({ id: "H-TEST-002", state: "proposed" });

    await storage.saveSessionHypotheses("TEST", [active, proposed]);
    await storage.rebuildIndex();

    const results = await storage.getActiveHypotheses();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("H-TEST-001");
  });

  test("searchHypotheses matches statement, mechanism, notes, tags, and id", async () => {
    const h1 = createTestHypothesisData({
      id: "H-S1-001",
      sessionId: "S1",
      statement: "Cell fate is determined by chromatin state",
      mechanism: "Chromatin remodeling machinery",
      tags: ["chromatin", "cell-fate"],
    });
    const h2 = createTestHypothesisData({
      id: "H-S2-001",
      sessionId: "S2",
      statement: "Completely unrelated statement",
      notes: "Contains the magic word: chromatin",
    });

    await storage.saveSessionHypotheses("S1", [h1]);
    await storage.saveSessionHypotheses("S2", [h2]);

    expect((await storage.searchHypotheses("H-S1-001"))).toHaveLength(1);
    expect((await storage.searchHypotheses("cell fate"))).toHaveLength(1);
    expect((await storage.searchHypotheses("remodeling"))).toHaveLength(1);
    expect((await storage.searchHypotheses("magic word"))).toHaveLength(1);
    expect((await storage.searchHypotheses("chromatin"))).toHaveLength(2);
    expect((await storage.searchHypotheses("   "))).toHaveLength(0);
  });
});

// ============================================================================
// Bulk Operations Tests
// ============================================================================

describe("Bulk Operations", () => {
  test("getAllHypotheses returns all hypotheses across sessions", async () => {
    await storage.saveSessionHypotheses("S1", [
      createTestHypothesisData({ id: "H-S1-001", sessionId: "S1" }),
    ]);
    await storage.saveSessionHypotheses("S2", [
      createTestHypothesisData({ id: "H-S2-001", sessionId: "S2" }),
      createTestHypothesisData({ id: "H-S2-002", sessionId: "S2" }),
    ]);

    const all = await storage.getAllHypotheses();
    expect(all).toHaveLength(3);
  });

  test("listSessions returns all session IDs", async () => {
    await storage.saveSessionHypotheses("S1", [
      createTestHypothesisData({ id: "H-S1-001", sessionId: "S1" }),
    ]);
    await storage.saveSessionHypotheses("S2", [
      createTestHypothesisData({ id: "H-S2-001", sessionId: "S2" }),
    ]);

    const sessions = await storage.listSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions).toContain("S1");
    expect(sessions).toContain("S2");
  });
});

// ============================================================================
// Auto-Rebuild Index Tests
// ============================================================================

describe("Auto-Rebuild Index", () => {
  test("autoRebuildIndex=true rebuilds on save", async () => {
    const autoStorage = new HypothesisStorage({ baseDir: testDir, autoRebuildIndex: true });
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });

    await autoStorage.saveHypothesis(hypothesis);

    const indexPath = join(testDir, ".research", "hypothesis-index.json");
    const exists = await fs.access(indexPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  test("autoRebuildIndex=false does not rebuild on save", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveHypothesis(hypothesis);

    const indexPath = join(testDir, ".research", "hypothesis-index.json");
    const exists = await fs.access(indexPath).then(() => true).catch(() => false);
    expect(exists).toBe(false);
  });
});
