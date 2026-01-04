/**
 * Storage Layer Tests
 *
 * Tests for the LocalStorage session persistence implementation.
 *
 * @see brenner_bot-1v26.2 (bead)
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  LocalStorageSessionStorage,
  StorageError,
  recoverSessions,
  estimateRemainingStorage,
  cleanupOldSessions,
} from "./storage";
import type { Session, SessionPhase } from "./types";

// ============================================================================
// Mock localStorage
// ============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

// Replace global localStorage with mock
Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

Object.defineProperty(global, "window", {
  value: {
    localStorage: localStorageMock,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});

// ============================================================================
// Test Utilities
// ============================================================================

function createTestSession(overrides: Partial<Session> = {}): Session {
  const now = new Date().toISOString();
  const id = overrides.id ?? `SESSION-TEST-${Date.now()}`;
  const hypothesisId = `HC-${id}-001-v1`;

  return {
    id,
    _version: 1,
    createdAt: now,
    updatedAt: now,
    phase: "intake" as SessionPhase,
    primaryHypothesisId: hypothesisId,
    alternativeHypothesisIds: [],
    archivedHypothesisIds: [],
    hypothesisCards: {
      [hypothesisId]: {
        hypothesisId,
        version: 1,
        statement: "Test hypothesis for storage testing",
        domains: ["testing"],
        predictionsIfTrue: ["The tests should pass"],
        predictionsIfFalse: [],
        impossibleIfTrue: ["Tests fail catastrophically"],
        confounds: [],
        assumptionIds: [],
        confidence: 50,
        confidenceHistory: [],
        createdAt: now,
        updatedAt: now,
      },
    },
    hypothesisEvolution: [],
    operatorApplications: {
      levelSplit: [],
      exclusionTest: [],
      objectTranspose: [],
      scaleCheck: [],
    },
    predictionIds: [],
    testIds: [],
    assumptionIds: [],
    pendingAgentRequests: [],
    agentResponses: [],
    evidenceLedger: [],
    artifacts: [],
    commits: [],
    headCommitId: "",
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("LocalStorageSessionStorage", () => {
  let storage: LocalStorageSessionStorage;

  beforeEach(() => {
    localStorageMock.clear();
    storage = new LocalStorageSessionStorage();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe("save", () => {
    test("should save a session successfully", async () => {
      const session = createTestSession();

      await storage.save(session);

      // Verify session is saved
      const raw = localStorageMock.getItem(`brenner-session-${session.id}`);
      expect(raw).toBeTruthy();

      const saved = JSON.parse(raw!);
      expect(saved.id).toBe(session.id);
    });

    test("should update the index when saving", async () => {
      const session = createTestSession();

      await storage.save(session);

      const index = JSON.parse(localStorageMock.getItem("brenner-sessions-index")!);
      expect(index.summaries).toHaveLength(1);
      expect(index.summaries[0].id).toBe(session.id);
    });

    test("should update existing session", async () => {
      const session = createTestSession();
      await storage.save(session);

      // Modify and save again
      session.phase = "sharpening";
      await storage.save(session);

      const summaries = await storage.list();
      expect(summaries).toHaveLength(1);
      expect(summaries[0].phase).toBe("sharpening");
    });

    test("should update updatedAt timestamp on save", async () => {
      const session = createTestSession({
        updatedAt: "2020-01-01T00:00:00.000Z",
      });

      await storage.save(session);

      const loaded = await storage.load(session.id);
      expect(loaded!.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    });
  });

  describe("load", () => {
    test("should load a saved session", async () => {
      const session = createTestSession();
      await storage.save(session);

      const loaded = await storage.load(session.id);

      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(session.id);
      expect(loaded!.phase).toBe(session.phase);
    });

    test("should return null for non-existent session", async () => {
      const loaded = await storage.load("non-existent-id");
      expect(loaded).toBeNull();
    });

    test("should throw StorageError for corrupted data", async () => {
      localStorageMock.setItem("brenner-session-corrupted", "not valid json{");

      await expect(storage.load("corrupted")).rejects.toThrow(StorageError);
    });
  });

  describe("list", () => {
    test("should return empty array when no sessions", async () => {
      const summaries = await storage.list();
      expect(summaries).toEqual([]);
    });

    test("should return summaries for saved sessions", async () => {
      const session1 = createTestSession({ id: "SESSION-1" });
      const session2 = createTestSession({ id: "SESSION-2" });

      await storage.save(session1);
      await storage.save(session2);

      const summaries = await storage.list();
      expect(summaries).toHaveLength(2);
    });

    test("should order by updatedAt (most recent first)", async () => {
      const old = createTestSession({ id: "SESSION-OLD" });
      await storage.save(old);

      // Wait a tiny bit to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10));

      const newer = createTestSession({ id: "SESSION-NEW" });
      await storage.save(newer);

      const summaries = await storage.list();
      expect(summaries[0].id).toBe("SESSION-NEW");
      expect(summaries[1].id).toBe("SESSION-OLD");
    });

    test("should clean up orphaned index entries", async () => {
      const session = createTestSession();
      await storage.save(session);

      // Manually remove the session data but keep index
      localStorageMock.removeItem(`brenner-session-${session.id}`);

      const summaries = await storage.list();
      expect(summaries).toHaveLength(0);
    });
  });

  describe("delete", () => {
    test("should delete a session", async () => {
      const session = createTestSession();
      await storage.save(session);

      await storage.delete(session.id);

      const loaded = await storage.load(session.id);
      expect(loaded).toBeNull();
    });

    test("should remove from index", async () => {
      const session = createTestSession();
      await storage.save(session);

      await storage.delete(session.id);

      const summaries = await storage.list();
      expect(summaries).toHaveLength(0);
    });

    test("should not throw for non-existent session", async () => {
      // Should complete without throwing
      await storage.delete("non-existent");
      // If we get here, the test passed
      expect(true).toBe(true);
    });
  });

  describe("clear", () => {
    test("should remove all sessions", async () => {
      const session1 = createTestSession({ id: "SESSION-1" });
      const session2 = createTestSession({ id: "SESSION-2" });
      await storage.save(session1);
      await storage.save(session2);

      await storage.clear();

      const summaries = await storage.list();
      expect(summaries).toHaveLength(0);
    });
  });

  describe("stats", () => {
    test("should return correct session count", async () => {
      const session1 = createTestSession({ id: "SESSION-1" });
      const session2 = createTestSession({ id: "SESSION-2" });
      await storage.save(session1);
      await storage.save(session2);

      const stats = await storage.stats();
      expect(stats.sessionCount).toBe(2);
    });

    test("should calculate total size", async () => {
      const session = createTestSession();
      await storage.save(session);

      const stats = await storage.stats();
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });
});

describe("Recovery utilities", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("recoverSessions", () => {
    test("should recover sessions from storage", async () => {
      // Manually add session data without index
      const session = createTestSession();
      localStorageMock.setItem(
        `brenner-session-${session.id}`,
        JSON.stringify(session)
      );

      const count = await recoverSessions();
      expect(count).toBe(1);

      // Verify index was rebuilt
      const index = JSON.parse(localStorageMock.getItem("brenner-sessions-index")!);
      expect(index.summaries).toHaveLength(1);
    });
  });

  describe("estimateRemainingStorage", () => {
    test("should return positive value for empty storage", () => {
      const remaining = estimateRemainingStorage();
      expect(remaining).toBeGreaterThan(0);
    });
  });

  describe("cleanupOldSessions", () => {
    test("should remove sessions older than specified days", async () => {
      // Create an old session
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      const oldSession = createTestSession({
        id: "OLD-SESSION",
        updatedAt: oldDate.toISOString(),
      });

      // Save with manual timestamp preservation
      const raw = JSON.stringify({
        ...oldSession,
        updatedAt: oldDate.toISOString(),
      });
      localStorageMock.setItem(`brenner-session-${oldSession.id}`, raw);

      // Save index manually too
      localStorageMock.setItem(
        "brenner-sessions-index",
        JSON.stringify({
          version: 1,
          summaries: [
            {
              id: oldSession.id,
              hypothesis: "Test",
              phase: "intake",
              confidence: 50,
              updatedAt: oldDate.toISOString(),
              createdAt: oldDate.toISOString(),
            },
          ],
        })
      );

      const removed = await cleanupOldSessions(30);
      expect(removed).toBe(1);
    });
  });
});

describe("SessionSummary", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test("should include hypothesis preview", async () => {
    const storage = new LocalStorageSessionStorage();
    const session = createTestSession();

    await storage.save(session);
    const summaries = await storage.list();

    expect(summaries[0].hypothesis).toContain("Test hypothesis");
  });

  test("should truncate long hypothesis statements", async () => {
    const storage = new LocalStorageSessionStorage();
    const longStatement = "A".repeat(200);
    const session = createTestSession();
    session.hypothesisCards[session.primaryHypothesisId].statement = longStatement;

    await storage.save(session);
    const summaries = await storage.list();

    expect(summaries[0].hypothesis.length).toBeLessThanOrEqual(100);
    expect(summaries[0].hypothesis.endsWith("...")).toBe(true);
  });
});
