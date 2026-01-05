import { promises as fs } from "fs";
import { join } from "path";
import {
  type Assumption,
  type AssumptionStatus,
  type AssumptionType,
  AssumptionSchema,
} from "../schemas/assumption";

/**
 * Assumption Storage Layer
 *
 * File-based storage for assumption records with cross-session indexing.
 * Follows the same pattern as anomaly-storage.ts.
 *
 * Storage structure:
 * .research/
 * ├── assumptions/
 * │   ├── RS-20251230-assumptions.json
 * │   └── ...
 * └── assumption-index.json
 *
 * @see brenner_bot-5kr7.2 (bead)
 */

// ============================================================================
// Constants
// ============================================================================

const RESEARCH_DIR = ".research";
const ASSUMPTIONS_DIR = "assumptions";
const INDEX_FILE = "assumption-index.json";

// ============================================================================
// Types
// ============================================================================

/**
 * Session file format for assumptions.
 */
export interface SessionAssumptionFile {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  assumptions: Assumption[];
}

/**
 * Index entry for quick lookups.
 */
export interface AssumptionIndexEntry {
  id: string;
  sessionId: string;
  type: AssumptionType;
  status: AssumptionStatus;
  affectedHypotheses: string[];
  affectedTests: string[];
  hasCalculation: boolean;
}

/**
 * Full index file format.
 */
export interface AssumptionIndex {
  version: string;
  updatedAt: string;
  entries: AssumptionIndexEntry[];
}

/**
 * Storage configuration.
 */
export interface AssumptionStorageConfig {
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

function getAssumptionsDir(baseDir: string): string {
  return join(getResearchDir(baseDir), ASSUMPTIONS_DIR);
}

function getIndexPath(baseDir: string): string {
  return join(getResearchDir(baseDir), INDEX_FILE);
}

function getSessionFilePath(baseDir: string, sessionId: string): string {
  // Allow '.' because bead/thread IDs often contain dots (e.g. brenner_bot-5so.10.2.2).
  // Only strip characters that are path separators or otherwise unsafe in filenames.
  const sanitized = sessionId.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return join(getAssumptionsDir(baseDir), `${sanitized}-assumptions.json`);
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
  await ensureDir(getAssumptionsDir(baseDir));
}

// ============================================================================
// Storage Class
// ============================================================================

/**
 * Assumption storage manager.
 * Provides CRUD operations and indexing for assumptions.
 */
export class AssumptionStorage {
  private baseDir: string;
  private autoRebuildIndex: boolean;

  constructor(config: AssumptionStorageConfig = {}) {
    this.baseDir = config.baseDir ?? process.cwd();
    this.autoRebuildIndex = config.autoRebuildIndex ?? true;
  }

  // ============================================================================
  // Session File Operations
  // ============================================================================

  /**
   * Load assumptions for a specific session.
   */
  async loadSessionAssumptions(sessionId: string): Promise<Assumption[]> {
    const filePath = getSessionFilePath(this.baseDir, sessionId);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content) as SessionAssumptionFile;

      // Validate each assumption
      return data.assumptions.map((a) => AssumptionSchema.parse(a));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Save assumptions for a specific session.
   */
  async saveSessionAssumptions(sessionId: string, assumptions: Assumption[]): Promise<void> {
    await ensureStorageStructure(this.baseDir);

    const filePath = getSessionFilePath(this.baseDir, sessionId);
    const now = new Date().toISOString();

    // Check if file exists for createdAt
    let createdAt = now;
    try {
      const existing = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(existing) as SessionAssumptionFile;
      createdAt = data.createdAt;
    } catch {
      // New file
    }

    const data: SessionAssumptionFile = {
      sessionId,
      createdAt,
      updatedAt: now,
      assumptions,
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    if (this.autoRebuildIndex) {
      await this.rebuildIndex();
    }
  }

  // ============================================================================
  // Individual Assumption Operations
  // ============================================================================

  /**
   * Get a specific assumption by ID.
   *
   * Supports two ID formats:
   * - Complex: A-{sessionId}-{seq} (e.g., A-TEST-001)
   * - Simple: A{n} (e.g., A1, A42) - requires scanning all sessions
   */
  async getAssumptionById(id: string): Promise<Assumption | null> {
    // Try complex format first: A-{sessionId}-{seq}
    const complexMatch = id.match(/^A-(.+)-\d{3}$/);
    if (complexMatch) {
      const sessionId = complexMatch[1];
      const assumptions = await this.loadSessionAssumptions(sessionId);
      return assumptions.find((a) => a.id === id) ?? null;
    }

    // Check for simple format: A{n}
    const simpleMatch = id.match(/^A\d+$/);
    if (simpleMatch) {
      // For simple format, we need to scan all sessions
      const allAssumptions = await this.getAllAssumptions();
      return allAssumptions.find((a) => a.id === id) ?? null;
    }

    // Invalid format
    return null;
  }

  /**
   * Create or update an assumption.
   */
  async saveAssumption(assumption: Assumption): Promise<void> {
    const assumptions = await this.loadSessionAssumptions(assumption.sessionId);
    const existingIndex = assumptions.findIndex((a) => a.id === assumption.id);

    if (existingIndex >= 0) {
      assumptions[existingIndex] = assumption;
    } else {
      assumptions.push(assumption);
    }

    await this.saveSessionAssumptions(assumption.sessionId, assumptions);
  }

  /**
   * Delete an assumption by ID.
   */
  async deleteAssumption(id: string): Promise<boolean> {
    const assumption = await this.getAssumptionById(id);
    if (!assumption) {
      return false;
    }

    const assumptions = await this.loadSessionAssumptions(assumption.sessionId);
    const newAssumptions = assumptions.filter((a) => a.id !== id);

    if (newAssumptions.length === assumptions.length) {
      return false;
    }

    await this.saveSessionAssumptions(assumption.sessionId, newAssumptions);
    return true;
  }

  // ============================================================================
  // Index Operations
  // ============================================================================

  /**
   * Rebuild the cross-session index.
   */
  async rebuildIndex(): Promise<AssumptionIndex> {
    const entries: AssumptionIndexEntry[] = [];
    const assumptionsDir = getAssumptionsDir(this.baseDir);

    try {
      const files = await fs.readdir(assumptionsDir);

      for (const file of files) {
        if (!file.endsWith("-assumptions.json")) continue;

        const content = await fs.readFile(join(assumptionsDir, file), "utf-8");
        const data = JSON.parse(content) as SessionAssumptionFile;

        for (const assumption of data.assumptions) {
          entries.push({
            id: assumption.id,
            sessionId: assumption.sessionId,
            type: assumption.type,
            status: assumption.status,
            affectedHypotheses: assumption.load.affectedHypotheses,
            affectedTests: assumption.load.affectedTests,
            hasCalculation: Boolean(assumption.calculation),
          });
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const index: AssumptionIndex = {
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
  async loadIndex(): Promise<AssumptionIndex> {
    const indexPath = getIndexPath(this.baseDir);

    try {
      const content = await fs.readFile(indexPath, "utf-8");
      return JSON.parse(content) as AssumptionIndex;
    } catch {
      return await this.rebuildIndex();
    }
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Get all assumptions by status.
   */
  async getAssumptionsByStatus(status: AssumptionStatus): Promise<Assumption[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.status === status);

    const results: Assumption[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const assumptions = await this.loadSessionAssumptions(sessionId);
      results.push(...assumptions.filter((a) => a.status === status));
    }

    return results;
  }

  /**
   * Get all assumptions by type.
   */
  async getAssumptionsByType(type: AssumptionType): Promise<Assumption[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.type === type);

    const results: Assumption[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const assumptions = await this.loadSessionAssumptions(sessionId);
      results.push(...assumptions.filter((a) => a.type === type));
    }

    return results;
  }

  /**
   * Get all unchecked assumptions.
   */
  async getUncheckedAssumptions(): Promise<Assumption[]> {
    return this.getAssumptionsByStatus("unchecked");
  }

  /**
   * Get all challenged assumptions.
   */
  async getChallengedAssumptions(): Promise<Assumption[]> {
    return this.getAssumptionsByStatus("challenged");
  }

  /**
   * Get all verified assumptions.
   */
  async getVerifiedAssumptions(): Promise<Assumption[]> {
    return this.getAssumptionsByStatus("verified");
  }

  /**
   * Get all falsified assumptions.
   */
  async getFalsifiedAssumptions(): Promise<Assumption[]> {
    return this.getAssumptionsByStatus("falsified");
  }

  /**
   * Get all scale_physics assumptions.
   */
  async getScalePhysicsAssumptions(): Promise<Assumption[]> {
    return this.getAssumptionsByType("scale_physics");
  }

  /**
   * Get all assumptions that affect a specific hypothesis.
   */
  async getAssumptionsForHypothesis(hypothesisId: string): Promise<Assumption[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) =>
      e.affectedHypotheses.includes(hypothesisId)
    );

    const results: Assumption[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const assumptions = await this.loadSessionAssumptions(sessionId);
      results.push(
        ...assumptions.filter((a) =>
          a.load.affectedHypotheses.includes(hypothesisId)
        )
      );
    }

    return results;
  }

  /**
   * Get all assumptions that affect a specific test.
   */
  async getAssumptionsForTest(testId: string): Promise<Assumption[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) =>
      e.affectedTests.includes(testId)
    );

    const results: Assumption[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const assumptions = await this.loadSessionAssumptions(sessionId);
      results.push(
        ...assumptions.filter((a) =>
          a.load.affectedTests.includes(testId)
        )
      );
    }

    return results;
  }

  /**
   * Get all scale_physics assumptions that have calculations.
   */
  async getScaleAssumptionsWithCalculations(): Promise<Assumption[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter(
      (e) => e.type === "scale_physics" && e.hasCalculation
    );

    const results: Assumption[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const assumptions = await this.loadSessionAssumptions(sessionId);
      results.push(
        ...assumptions.filter(
          (a) => a.type === "scale_physics" && Boolean(a.calculation)
        )
      );
    }

    return results;
  }

  // ============================================================================
  // Propagation Operations (for lifecycle transitions)
  // ============================================================================

  /**
   * Get all hypotheses and tests that would be affected if an assumption is falsified.
   * This is used by the lifecycle transitions module.
   */
  async getAffectedByFalsification(assumptionId: string): Promise<{
    hypotheses: string[];
    tests: string[];
  }> {
    const assumption = await this.getAssumptionById(assumptionId);
    if (!assumption) {
      return { hypotheses: [], tests: [] };
    }

    return {
      hypotheses: assumption.load.affectedHypotheses,
      tests: assumption.load.affectedTests,
    };
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get assumption statistics.
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<AssumptionStatus, number>;
    byType: Record<AssumptionType, number>;
    withCalculations: number;
    sessionsWithAssumptions: number;
  }> {
    const index = await this.loadIndex();

    const byStatus: Record<AssumptionStatus, number> = {
      unchecked: 0,
      challenged: 0,
      verified: 0,
      falsified: 0,
    };

    const byType: Record<AssumptionType, number> = {
      background: 0,
      methodological: 0,
      boundary: 0,
      scale_physics: 0,
    };

    let withCalculations = 0;

    for (const entry of index.entries) {
      byStatus[entry.status]++;
      byType[entry.type]++;
      if (entry.hasCalculation) {
        withCalculations++;
      }
    }

    const sessionsWithAssumptions = new Set(index.entries.map((e) => e.sessionId)).size;

    return {
      total: index.entries.length,
      byStatus,
      byType,
      withCalculations,
      sessionsWithAssumptions,
    };
  }

  /**
   * Check if any session has at least one scale_physics assumption.
   * This is MANDATORY per the Brenner method.
   */
  async validateScaleAssumptionPresence(sessionId: string): Promise<{
    present: boolean;
    count: number;
    message: string;
  }> {
    const assumptions = await this.loadSessionAssumptions(sessionId);
    const scaleAssumptions = assumptions.filter((a) => a.type === "scale_physics");

    if (scaleAssumptions.length === 0) {
      return {
        present: false,
        count: 0,
        message: "No scale_physics assumption found. Every research program MUST have at least one.",
      };
    }

    return {
      present: true,
      count: scaleAssumptions.length,
      message: `Found ${scaleAssumptions.length} scale_physics assumption(s).`,
    };
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Get all assumptions across all sessions.
   */
  async getAllAssumptions(): Promise<Assumption[]> {
    const assumptionsDir = getAssumptionsDir(this.baseDir);
    const results: Assumption[] = [];

    try {
      const files = await fs.readdir(assumptionsDir);

      for (const file of files) {
        if (!file.endsWith("-assumptions.json")) continue;

        const content = await fs.readFile(join(assumptionsDir, file), "utf-8");
        const data = JSON.parse(content) as SessionAssumptionFile;
        results.push(...data.assumptions.map((a) => AssumptionSchema.parse(a)));
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    return results;
  }

  /**
   * List all session IDs that have assumptions.
   */
  async listSessions(): Promise<string[]> {
    const assumptionsDir = getAssumptionsDir(this.baseDir);

    try {
      const files = await fs.readdir(assumptionsDir);
      return files
        .filter((f) => f.endsWith("-assumptions.json"))
        .map((f) => {
          // Extract session ID from filename
          const match = f.match(/^(.+)-assumptions\.json$/);
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
export const assumptionStorage = new AssumptionStorage();
