import { promises as fs } from "fs";
import { join } from "path";
import {
  type Anomaly,
  type QuarantineStatus,
  AnomalySchema,
} from "../schemas/anomaly";

/**
 * Anomaly Storage Layer
 *
 * File-based storage for anomaly records with cross-session indexing.
 * Follows the same pattern as other registry storage layers.
 *
 * Storage structure:
 * .research/
 * ├── anomalies/
 * │   ├── RS-20251230-anomalies.json
 * │   └── ...
 * └── anomaly-index.json
 *
 * @see brenner_bot-vxd3.2 (bead)
 */

// ============================================================================
// Constants
// ============================================================================

const RESEARCH_DIR = ".research";
const ANOMALIES_DIR = "anomalies";
const INDEX_FILE = "anomaly-index.json";

// ============================================================================
// Types
// ============================================================================

/**
 * Session file format for anomalies.
 */
export interface SessionAnomalyFile {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  anomalies: Anomaly[];
}

/**
 * Index entry for quick lookups.
 */
export interface AnomalyIndexEntry {
  id: string;
  sessionId: string;
  quarantineStatus: QuarantineStatus;
  conflictsWithHypotheses: string[];
  conflictsWithAssumptions: string[];
  spawnedHypotheses: string[];
}

/**
 * Full index file format.
 */
export interface AnomalyIndex {
  version: string;
  updatedAt: string;
  entries: AnomalyIndexEntry[];
}

/**
 * Storage configuration.
 */
export interface AnomalyStorageConfig {
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

function getAnomaliesDir(baseDir: string): string {
  return join(getResearchDir(baseDir), ANOMALIES_DIR);
}

function getIndexPath(baseDir: string): string {
  return join(getResearchDir(baseDir), INDEX_FILE);
}

function getSessionFilePath(baseDir: string, sessionId: string): string {
  // Allow '.' because bead/thread IDs often contain dots (e.g. brenner_bot-5so.10.2.2).
  // Only strip characters that are path separators or otherwise unsafe in filenames.
  const sanitized = sessionId.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return join(getAnomaliesDir(baseDir), `${sanitized}-anomalies.json`);
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
  await ensureDir(getAnomaliesDir(baseDir));
}

// ============================================================================
// Storage Class
// ============================================================================

/**
 * Anomaly storage manager.
 * Provides CRUD operations and indexing for anomalies.
 */
export class AnomalyStorage {
  private baseDir: string;
  private autoRebuildIndex: boolean;

  constructor(config: AnomalyStorageConfig = {}) {
    this.baseDir = config.baseDir ?? process.cwd();
    this.autoRebuildIndex = config.autoRebuildIndex ?? true;
  }

  // ============================================================================
  // Session File Operations
  // ============================================================================

  /**
   * Load anomalies for a specific session.
   */
  async loadSessionAnomalies(sessionId: string): Promise<Anomaly[]> {
    const filePath = getSessionFilePath(this.baseDir, sessionId);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content) as SessionAnomalyFile;

      // Validate each anomaly
      return data.anomalies.map((a) => AnomalySchema.parse(a));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Save anomalies for a specific session.
   */
  async saveSessionAnomalies(sessionId: string, anomalies: Anomaly[]): Promise<void> {
    await ensureStorageStructure(this.baseDir);

    const filePath = getSessionFilePath(this.baseDir, sessionId);
    const now = new Date().toISOString();

    // Check if file exists for createdAt
    let createdAt = now;
    try {
      const existing = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(existing) as SessionAnomalyFile;
      createdAt = data.createdAt;
    } catch {
      // New file
    }

    const data: SessionAnomalyFile = {
      sessionId,
      createdAt,
      updatedAt: now,
      anomalies,
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    if (this.autoRebuildIndex) {
      await this.rebuildIndex();
    }
  }

  // ============================================================================
  // Individual Anomaly Operations
  // ============================================================================

  /**
   * Get a specific anomaly by ID.
   */
  async getAnomalyById(id: string): Promise<Anomaly | null> {
    // Extract session ID from anomaly ID (X-{sessionId}-{seq})
    const match = id.match(/^X-(.+)-\d{3}$/);
    if (!match) {
      return null;
    }

    const sessionId = match[1];
    const anomalies = await this.loadSessionAnomalies(sessionId);
    return anomalies.find((a) => a.id === id) ?? null;
  }

  /**
   * Create or update an anomaly.
   */
  async saveAnomaly(anomaly: Anomaly): Promise<void> {
    const anomalies = await this.loadSessionAnomalies(anomaly.sessionId);
    const existingIndex = anomalies.findIndex((a) => a.id === anomaly.id);

    if (existingIndex >= 0) {
      anomalies[existingIndex] = anomaly;
    } else {
      anomalies.push(anomaly);
    }

    await this.saveSessionAnomalies(anomaly.sessionId, anomalies);
  }

  /**
   * Delete an anomaly by ID.
   */
  async deleteAnomaly(id: string): Promise<boolean> {
    const anomaly = await this.getAnomalyById(id);
    if (!anomaly) {
      return false;
    }

    const anomalies = await this.loadSessionAnomalies(anomaly.sessionId);
    const newAnomalies = anomalies.filter((a) => a.id !== id);

    if (newAnomalies.length === anomalies.length) {
      return false;
    }

    await this.saveSessionAnomalies(anomaly.sessionId, newAnomalies);
    return true;
  }

  // ============================================================================
  // Index Operations
  // ============================================================================

  /**
   * Rebuild the cross-session index.
   */
  async rebuildIndex(): Promise<AnomalyIndex> {
    const entries: AnomalyIndexEntry[] = [];
    const anomaliesDir = getAnomaliesDir(this.baseDir);

    try {
      const files = await fs.readdir(anomaliesDir);

      for (const file of files) {
        if (!file.endsWith("-anomalies.json")) continue;

        const content = await fs.readFile(join(anomaliesDir, file), "utf-8");
        const data = JSON.parse(content) as SessionAnomalyFile;

        for (const anomaly of data.anomalies) {
          entries.push({
            id: anomaly.id,
            sessionId: anomaly.sessionId,
            quarantineStatus: anomaly.quarantineStatus,
            conflictsWithHypotheses: anomaly.conflictsWith.hypotheses,
            conflictsWithAssumptions: anomaly.conflictsWith.assumptions,
            spawnedHypotheses: anomaly.spawnedHypotheses ?? [],
          });
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const index: AnomalyIndex = {
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
  async loadIndex(): Promise<AnomalyIndex> {
    const indexPath = getIndexPath(this.baseDir);

    try {
      const content = await fs.readFile(indexPath, "utf-8");
      return JSON.parse(content) as AnomalyIndex;
    } catch {
      return await this.rebuildIndex();
    }
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Get all anomalies by quarantine status.
   */
  async getAnomaliesByStatus(status: QuarantineStatus): Promise<Anomaly[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.quarantineStatus === status);

    const results: Anomaly[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const anomalies = await this.loadSessionAnomalies(sessionId);
      results.push(...anomalies.filter((a) => a.quarantineStatus === status));
    }

    return results;
  }

  /**
   * Get all active (unresolved) anomalies.
   */
  async getActiveAnomalies(): Promise<Anomaly[]> {
    return this.getAnomaliesByStatus("active");
  }

  /**
   * Get all anomalies that conflict with a specific hypothesis.
   */
  async getAnomaliesForHypothesis(hypothesisId: string): Promise<Anomaly[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) =>
      e.conflictsWithHypotheses.includes(hypothesisId)
    );

    const results: Anomaly[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const anomalies = await this.loadSessionAnomalies(sessionId);
      results.push(
        ...anomalies.filter((a) =>
          a.conflictsWith.hypotheses.includes(hypothesisId)
        )
      );
    }

    return results;
  }

  /**
   * Get all anomalies that conflict with a specific assumption.
   */
  async getAnomaliesForAssumption(assumptionId: string): Promise<Anomaly[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) =>
      e.conflictsWithAssumptions.includes(assumptionId)
    );

    const results: Anomaly[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const anomalies = await this.loadSessionAnomalies(sessionId);
      results.push(
        ...anomalies.filter((a) =>
          a.conflictsWith.assumptions.includes(assumptionId)
        )
      );
    }

    return results;
  }

  /**
   * Get all anomalies that spawned hypotheses.
   */
  async getAnomaliesWithSpawnedHypotheses(): Promise<Anomaly[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.spawnedHypotheses.length > 0);

    const results: Anomaly[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const anomalies = await this.loadSessionAnomalies(sessionId);
      results.push(
        ...anomalies.filter(
          (a) => a.spawnedHypotheses && a.spawnedHypotheses.length > 0
        )
      );
    }

    return results;
  }

  /**
   * Get anomalies that spawned a specific hypothesis.
   */
  async getAnomalyThatSpawned(hypothesisId: string): Promise<Anomaly | null> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) =>
      e.spawnedHypotheses.includes(hypothesisId)
    );

    if (matching.length === 0) {
      return null;
    }

    // Get the anomaly
    const anomaly = await this.getAnomalyById(matching[0].id);
    return anomaly;
  }

  /**
   * Get all paradigm-shifting anomalies.
   */
  async getParadigmShiftingAnomalies(): Promise<Anomaly[]> {
    return this.getAnomaliesByStatus("paradigm_shifting");
  }

  /**
   * Get all deferred anomalies.
   */
  async getDeferredAnomalies(): Promise<Anomaly[]> {
    return this.getAnomaliesByStatus("deferred");
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get anomaly statistics.
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<QuarantineStatus, number>;
    withSpawnedHypotheses: number;
    sessionsWithAnomalies: number;
  }> {
    const index = await this.loadIndex();

    const byStatus: Record<QuarantineStatus, number> = {
      active: 0,
      resolved: 0,
      deferred: 0,
      paradigm_shifting: 0,
    };

    for (const entry of index.entries) {
      byStatus[entry.quarantineStatus]++;
    }

    const sessionsWithAnomalies = new Set(index.entries.map((e) => e.sessionId)).size;
    const withSpawnedHypotheses = index.entries.filter(
      (e) => e.spawnedHypotheses.length > 0
    ).length;

    return {
      total: index.entries.length,
      byStatus,
      withSpawnedHypotheses,
      sessionsWithAnomalies,
    };
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Get all anomalies across all sessions.
   */
  async getAllAnomalies(): Promise<Anomaly[]> {
    const anomaliesDir = getAnomaliesDir(this.baseDir);
    const results: Anomaly[] = [];

    try {
      const files = await fs.readdir(anomaliesDir);

      for (const file of files) {
        if (!file.endsWith("-anomalies.json")) continue;

        const content = await fs.readFile(join(anomaliesDir, file), "utf-8");
        const data = JSON.parse(content) as SessionAnomalyFile;
        results.push(...data.anomalies.map((a) => AnomalySchema.parse(a)));
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    return results;
  }

  /**
   * List all session IDs that have anomalies.
   */
  async listSessions(): Promise<string[]> {
    const anomaliesDir = getAnomaliesDir(this.baseDir);

    try {
      const files = await fs.readdir(anomaliesDir);
      return files
        .filter((f) => f.endsWith("-anomalies.json"))
        .map((f) => {
          // Extract session ID from filename
          const match = f.match(/^(.+)-anomalies\.json$/);
          return match ? match[1] : null;
        })
        .filter((s): s is string => s !== null);
    } catch {
      return [];
    }
  }
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Default storage instance using current working directory.
 */
export const anomalyStorage = new AnomalyStorage();
