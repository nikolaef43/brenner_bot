import { promises as fs } from "fs";
import { join } from "path";
import {
  type Hypothesis,
  type HypothesisState,
  type HypothesisCategory,
  type HypothesisConfidence,
  HypothesisSchema,
} from "../schemas/hypothesis";

/**
 * Hypothesis Storage Layer
 *
 * File-based storage for hypothesis records with cross-session indexing.
 * Follows the same pattern as anomaly-storage.ts and assumption-storage.ts.
 *
 * Storage structure:
 * .research/
 * ├── hypotheses/
 * │   ├── RS-20251230-hypotheses.json
 * │   └── ...
 * └── hypothesis-index.json
 *
 * @see brenner_bot-8hv8 (bead)
 */

// ============================================================================
// Constants
// ============================================================================

const RESEARCH_DIR = ".research";
const HYPOTHESES_DIR = "hypotheses";
const INDEX_FILE = "hypothesis-index.json";

// ============================================================================
// Types
// ============================================================================

/**
 * Session file format for hypotheses.
 */
export interface SessionHypothesisFile {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  hypotheses: Hypothesis[];
}

/**
 * Index entry for quick lookups.
 */
export interface HypothesisIndexEntry {
  id: string;
  sessionId: string;
  state: HypothesisState;
  category: HypothesisCategory;
  confidence: HypothesisConfidence;
  hasMechanism: boolean;
  unresolvedCritiqueCount: number;
  parentId: string | undefined;
  spawnedFromAnomaly: string | undefined;
}

/**
 * Full index file format.
 */
export interface HypothesisIndex {
  version: string;
  updatedAt: string;
  entries: HypothesisIndexEntry[];
}

/**
 * Storage configuration.
 */
export interface HypothesisStorageConfig {
  /** Base directory for storage (defaults to cwd) */
  baseDir?: string;
  /** Whether to auto-rebuild index on mutations (default: true) */
  autoRebuildIndex?: boolean;
}

// ============================================================================
// Path Helpers
// ============================================================================

function getResearchDir(baseDir: string): string {
  return join(baseDir, RESEARCH_DIR);
}

function getHypothesesDir(baseDir: string): string {
  return join(getResearchDir(baseDir), HYPOTHESES_DIR);
}

function getIndexPath(baseDir: string): string {
  return join(getResearchDir(baseDir), INDEX_FILE);
}

function getSessionFilePath(baseDir: string, sessionId: string): string {
  // Allow '.' because bead/thread IDs often contain dots (e.g. brenner_bot-5so.10.2.2).
  // Only strip characters that are path separators or otherwise unsafe in filenames.
  const sanitized = sessionId.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return join(getHypothesesDir(baseDir), `${sanitized}-hypotheses.json`);
}

// ============================================================================
// Directory Initialization
// ============================================================================

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory might already exist
  }
}

async function ensureStorageStructure(baseDir: string): Promise<void> {
  await ensureDir(getHypothesesDir(baseDir));
}

// ============================================================================
// In-process Locking
// ============================================================================

const HYPOTHESIS_STORAGE_LOCKS = new Map<string, Promise<void>>();

async function withHypothesisStorageLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = HYPOTHESIS_STORAGE_LOCKS.get(key) ?? Promise.resolve();
  const safePrev = prev.catch(() => {});

  let result: T | undefined;
  let didThrow = false;
  let error: unknown;

  const next = safePrev.then(async () => {
    try {
      result = await fn();
    } catch (err) {
      didThrow = true;
      error = err;
    }
  });

  HYPOTHESIS_STORAGE_LOCKS.set(key, next);

  await next;

  if (HYPOTHESIS_STORAGE_LOCKS.get(key) === next) {
    HYPOTHESIS_STORAGE_LOCKS.delete(key);
  }

  if (didThrow) {
    throw error;
  }

  return result as T;
}

// ============================================================================
// Storage Class
// ============================================================================

/**
 * Hypothesis storage manager.
 * Provides CRUD operations and indexing for hypotheses.
 */
export class HypothesisStorage {
  private baseDir: string;
  private autoRebuildIndex: boolean;

  constructor(config: HypothesisStorageConfig = {}) {
    this.baseDir = config.baseDir ?? process.cwd();
    this.autoRebuildIndex = config.autoRebuildIndex ?? true;
  }

  private lockKey(): string {
    return `hypothesis-storage:${this.baseDir}`;
  }

  // ============================================================================
  // Session File Operations
  // ============================================================================

  /**
   * Load hypotheses for a specific session.
   */
  async loadSessionHypotheses(sessionId: string): Promise<Hypothesis[]> {
    const filePath = getSessionFilePath(this.baseDir, sessionId);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content) as SessionHypothesisFile;

      return data.hypotheses.map((h) => HypothesisSchema.parse(h));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Save hypotheses for a specific session.
   */
  async saveSessionHypotheses(sessionId: string, hypotheses: Hypothesis[]): Promise<void> {
    await withHypothesisStorageLock(this.lockKey(), async () => {
      await this.saveSessionHypothesesUnlocked(sessionId, hypotheses);
    });
  }

  private async saveSessionHypothesesUnlocked(sessionId: string, hypotheses: Hypothesis[]): Promise<void> {
    await ensureStorageStructure(this.baseDir);

    const filePath = getSessionFilePath(this.baseDir, sessionId);
    const now = new Date().toISOString();

    // Preserve createdAt if file already exists
    let createdAt = now;
    try {
      const existing = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(existing) as SessionHypothesisFile;
      createdAt = data.createdAt;
    } catch {
      // New file
    }

    const data: SessionHypothesisFile = {
      sessionId,
      createdAt,
      updatedAt: now,
      hypotheses,
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    if (this.autoRebuildIndex) {
      await this.rebuildIndexUnlocked();
    }
  }

  // ============================================================================
  // Individual Hypothesis Operations
  // ============================================================================

  /**
   * Get a specific hypothesis by ID.
   */
  async getHypothesisById(id: string): Promise<Hypothesis | null> {
    // Extract session ID from hypothesis ID (H-{sessionId}-{seq})
    const match = id.match(/^H-(.+)-\d{3}$/);
    if (!match) {
      return null;
    }

    const sessionId = match[1];
    const hypotheses = await this.loadSessionHypotheses(sessionId);
    return hypotheses.find((h) => h.id === id) ?? null;
  }

  /**
   * Create or update a hypothesis.
   */
  async saveHypothesis(hypothesis: Hypothesis): Promise<void> {
    await withHypothesisStorageLock(this.lockKey(), async () => {
      const hypotheses = await this.loadSessionHypotheses(hypothesis.sessionId);
      const existingIndex = hypotheses.findIndex((h) => h.id === hypothesis.id);

      if (existingIndex >= 0) {
        hypotheses[existingIndex] = hypothesis;
      } else {
        hypotheses.push(hypothesis);
      }

      await this.saveSessionHypothesesUnlocked(hypothesis.sessionId, hypotheses);
    });
  }

  /**
   * Delete a hypothesis by ID.
   */
  async deleteHypothesis(id: string): Promise<boolean> {
    return await withHypothesisStorageLock(this.lockKey(), async () => {
      const hypothesis = await this.getHypothesisById(id);
      if (!hypothesis) {
        return false;
      }

      const hypotheses = await this.loadSessionHypotheses(hypothesis.sessionId);
      const newHypotheses = hypotheses.filter((h) => h.id !== id);

      if (newHypotheses.length === hypotheses.length) {
        return false;
      }

      await this.saveSessionHypothesesUnlocked(hypothesis.sessionId, newHypotheses);
      return true;
    });
  }

  // ============================================================================
  // Index Operations
  // ============================================================================

  /**
   * Rebuild the cross-session index.
   */
  async rebuildIndex(): Promise<HypothesisIndex> {
    return await withHypothesisStorageLock(this.lockKey(), async () => {
      return await this.rebuildIndexUnlocked();
    });
  }

  private async rebuildIndexUnlocked(): Promise<HypothesisIndex> {
    const entries: HypothesisIndexEntry[] = [];
    const hypothesesDir = getHypothesesDir(this.baseDir);

    try {
      const files = await fs.readdir(hypothesesDir);

      for (const file of files) {
        if (!file.endsWith("-hypotheses.json")) continue;

        const content = await fs.readFile(join(hypothesesDir, file), "utf-8");
        const data = JSON.parse(content) as SessionHypothesisFile;

        for (const hypothesis of data.hypotheses) {
          const parsed = HypothesisSchema.parse(hypothesis);
          entries.push({
            id: parsed.id,
            sessionId: parsed.sessionId,
            state: parsed.state,
            category: parsed.category,
            confidence: parsed.confidence,
            hasMechanism: !!parsed.mechanism,
            unresolvedCritiqueCount: parsed.unresolvedCritiqueCount,
            parentId: parsed.parentId,
            spawnedFromAnomaly: parsed.spawnedFromAnomaly,
          });
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const index: HypothesisIndex = {
      version: "1.0.0",
      updatedAt: new Date().toISOString(),
      entries,
    };

    await ensureStorageStructure(this.baseDir);
    await fs.writeFile(getIndexPath(this.baseDir), JSON.stringify(index, null, 2));

    return index;
  }

  /**
   * Load the index (or rebuild if missing).
   */
  async loadIndex(): Promise<HypothesisIndex> {
    const indexPath = getIndexPath(this.baseDir);

    try {
      const content = await fs.readFile(indexPath, "utf-8");
      return JSON.parse(content) as HypothesisIndex;
    } catch {
      return await this.rebuildIndex();
    }
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Get all hypotheses by state.
   */
  async getHypothesesByState(state: HypothesisState): Promise<Hypothesis[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.state === state);

    const results: Hypothesis[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const hypotheses = await this.loadSessionHypotheses(sessionId);
      results.push(...hypotheses.filter((h) => h.state === state));
    }

    return results;
  }

  /**
   * Get all active hypotheses.
   */
  async getActiveHypotheses(): Promise<Hypothesis[]> {
    return this.getHypothesesByState("active");
  }

  /**
   * Full-text search across all hypotheses (statement, mechanism, notes, tags, id).
   */
  async searchHypotheses(query: string): Promise<Hypothesis[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const all = await this.getAllHypotheses();
    return all.filter((h) => {
      if (h.id.toLowerCase().includes(q)) return true;
      if (h.statement.toLowerCase().includes(q)) return true;
      if (h.mechanism?.toLowerCase().includes(q)) return true;
      if (h.notes?.toLowerCase().includes(q)) return true;
      if (h.tags?.some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Get all hypotheses across all sessions.
   */
  async getAllHypotheses(): Promise<Hypothesis[]> {
    const hypothesesDir = getHypothesesDir(this.baseDir);
    const results: Hypothesis[] = [];

    try {
      const files = await fs.readdir(hypothesesDir);

      for (const file of files) {
        if (!file.endsWith("-hypotheses.json")) continue;

        const content = await fs.readFile(join(hypothesesDir, file), "utf-8");
        const data = JSON.parse(content) as SessionHypothesisFile;
        results.push(...data.hypotheses.map((h) => HypothesisSchema.parse(h)));
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    return results;
  }

  /**
   * List all session IDs that have hypotheses.
   */
  async listSessions(): Promise<string[]> {
    const hypothesesDir = getHypothesesDir(this.baseDir);

    try {
      const files = await fs.readdir(hypothesesDir);
      return files
        .filter((f) => f.endsWith("-hypotheses.json"))
        .map((f) => {
          const match = f.match(/^(.+)-hypotheses\.json$/);
          return match ? match[1] : null;
        })
        .filter((s): s is string => s !== null);
    } catch {
      return [];
    }
  }
}
