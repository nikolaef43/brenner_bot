import { promises as fs } from "fs";
import { join } from "path";
import {
  type OperatorIntervention,
  type InterventionType,
  type InterventionSeverity,
  type InterventionSummary,
  OperatorInterventionSchema,
  aggregateInterventions,
} from "../schemas/operator-intervention";

/**
 * Operator Intervention Storage Layer
 *
 * File-based storage for operator intervention audit trail records.
 * Enables reproducibility verification and learning from human overrides.
 *
 * Storage structure:
 * .research/
 * ├── interventions/
 * │   ├── RS-20251230-interventions.json
 * │   └── ...
 * └── intervention-index.json
 *
 * @see operator-intervention.ts
 * @see brenner_bot-mqg7 (bead)
 */

// ============================================================================
// Constants
// ============================================================================

const RESEARCH_DIR = ".research";
const INTERVENTIONS_DIR = "interventions";
const INDEX_FILE = "intervention-index.json";

// ============================================================================
// Types
// ============================================================================

/**
 * Session file format for interventions.
 */
export interface SessionInterventionFile {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  interventions: OperatorIntervention[];
}

/**
 * Index entry for quick lookups.
 */
export interface InterventionIndexEntry {
  id: string;
  sessionId: string;
  type: InterventionType;
  severity: InterventionSeverity;
  operatorId: string;
  timestamp: string;
  reversible: boolean;
  reversed: boolean;
}

/**
 * Full index file format.
 */
export interface InterventionIndex {
  version: string;
  updatedAt: string;
  entries: InterventionIndexEntry[];
}

/**
 * Storage configuration.
 */
export interface InterventionStorageConfig {
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

function getInterventionsDir(baseDir: string): string {
  return join(getResearchDir(baseDir), INTERVENTIONS_DIR);
}

function getIndexPath(baseDir: string): string {
  return join(getResearchDir(baseDir), INDEX_FILE);
}

function getSessionFilePath(baseDir: string, sessionId: string): string {
  const sanitized = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(getInterventionsDir(baseDir), `${sanitized}-interventions.json`);
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
  await ensureDir(getInterventionsDir(baseDir));
}

// ============================================================================
// Storage Class
// ============================================================================

/**
 * Operator Intervention storage manager.
 * Provides CRUD operations and indexing for intervention audit records.
 */
export class InterventionStorage {
  private baseDir: string;
  private autoRebuildIndex: boolean;

  constructor(config: InterventionStorageConfig = {}) {
    this.baseDir = config.baseDir ?? process.cwd();
    this.autoRebuildIndex = config.autoRebuildIndex ?? true;
  }

  // ============================================================================
  // Session File Operations
  // ============================================================================

  /**
   * Load interventions for a specific session.
   */
  async loadSessionInterventions(sessionId: string): Promise<OperatorIntervention[]> {
    const filePath = getSessionFilePath(this.baseDir, sessionId);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content) as SessionInterventionFile;

      // Validate each intervention
      return data.interventions.map((i) => OperatorInterventionSchema.parse(i));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Save interventions for a specific session.
   */
  async saveSessionInterventions(
    sessionId: string,
    interventions: OperatorIntervention[]
  ): Promise<void> {
    await ensureStorageStructure(this.baseDir);

    const filePath = getSessionFilePath(this.baseDir, sessionId);
    const now = new Date().toISOString();

    // Check if file exists for createdAt
    let createdAt = now;
    try {
      const existing = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(existing) as SessionInterventionFile;
      createdAt = data.createdAt;
    } catch {
      // New file
    }

    const data: SessionInterventionFile = {
      sessionId,
      createdAt,
      updatedAt: now,
      interventions,
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    if (this.autoRebuildIndex) {
      await this.rebuildIndex();
    }
  }

  // ============================================================================
  // Individual Intervention Operations
  // ============================================================================

  /**
   * Get a specific intervention by ID.
   * ID format: INT-{sessionId}-{seq}
   */
  async getInterventionById(id: string): Promise<OperatorIntervention | null> {
    const match = id.match(/^INT-(.+)-\d{3}$/);
    if (!match?.[1]) return null;

    const sessionId = match[1];
    const interventions = await this.loadSessionInterventions(sessionId);
    return interventions.find((i) => i.id === id) ?? null;
  }

  /**
   * Create or update an intervention.
   */
  async saveIntervention(intervention: OperatorIntervention): Promise<void> {
    const interventions = await this.loadSessionInterventions(intervention.session_id);
    const existingIndex = interventions.findIndex((i) => i.id === intervention.id);

    if (existingIndex >= 0) {
      interventions[existingIndex] = intervention;
    } else {
      interventions.push(intervention);
    }

    await this.saveSessionInterventions(intervention.session_id, interventions);
  }

  /**
   * Delete an intervention by ID.
   */
  async deleteIntervention(id: string): Promise<boolean> {
    const intervention = await this.getInterventionById(id);
    if (!intervention) {
      return false;
    }

    const interventions = await this.loadSessionInterventions(intervention.session_id);
    const newInterventions = interventions.filter((i) => i.id !== id);

    if (newInterventions.length === interventions.length) {
      return false;
    }

    await this.saveSessionInterventions(intervention.session_id, newInterventions);
    return true;
  }

  /**
   * Get the next sequence number for a session.
   */
  async getNextSequence(sessionId: string): Promise<number> {
    const interventions = await this.loadSessionInterventions(sessionId);
    return interventions.length + 1;
  }

  // ============================================================================
  // Index Operations
  // ============================================================================

  /**
   * Rebuild the cross-session index.
   */
  async rebuildIndex(): Promise<InterventionIndex> {
    const entries: InterventionIndexEntry[] = [];
    const interventionsDir = getInterventionsDir(this.baseDir);

    try {
      const files = await fs.readdir(interventionsDir);

      for (const file of files) {
        if (!file.endsWith("-interventions.json")) continue;

        const content = await fs.readFile(join(interventionsDir, file), "utf-8");
        const data = JSON.parse(content) as SessionInterventionFile;

        for (const intervention of data.interventions) {
          entries.push({
            id: intervention.id,
            sessionId: intervention.session_id,
            type: intervention.type,
            severity: intervention.severity,
            operatorId: intervention.operator_id,
            timestamp: intervention.timestamp,
            reversible: intervention.reversible,
            reversed: Boolean(intervention.reversed_at),
          });
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const index: InterventionIndex = {
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
  async loadIndex(): Promise<InterventionIndex> {
    const indexPath = getIndexPath(this.baseDir);

    try {
      const content = await fs.readFile(indexPath, "utf-8");
      return JSON.parse(content) as InterventionIndex;
    } catch {
      return await this.rebuildIndex();
    }
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Get all interventions by severity.
   */
  async getInterventionsBySeverity(
    severity: InterventionSeverity
  ): Promise<OperatorIntervention[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.severity === severity);

    const results: OperatorIntervention[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const interventions = await this.loadSessionInterventions(sessionId);
      results.push(...interventions.filter((i) => i.severity === severity));
    }

    return results;
  }

  /**
   * Get all interventions by type.
   */
  async getInterventionsByType(type: InterventionType): Promise<OperatorIntervention[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.type === type);

    const results: OperatorIntervention[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const interventions = await this.loadSessionInterventions(sessionId);
      results.push(...interventions.filter((i) => i.type === type));
    }

    return results;
  }

  /**
   * Get all interventions by operator.
   */
  async getInterventionsByOperator(operatorId: string): Promise<OperatorIntervention[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.operatorId === operatorId);

    const results: OperatorIntervention[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const interventions = await this.loadSessionInterventions(sessionId);
      results.push(...interventions.filter((i) => i.operator_id === operatorId));
    }

    return results;
  }

  /**
   * Get all major+ interventions (major or critical severity).
   */
  async getMajorInterventions(): Promise<OperatorIntervention[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter(
      (e) => e.severity === "major" || e.severity === "critical"
    );

    const results: OperatorIntervention[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const interventions = await this.loadSessionInterventions(sessionId);
      results.push(
        ...interventions.filter(
          (i) => i.severity === "major" || i.severity === "critical"
        )
      );
    }

    return results;
  }

  /**
   * Get all reversed interventions.
   */
  async getReversedInterventions(): Promise<OperatorIntervention[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.reversed);

    const results: OperatorIntervention[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const interventions = await this.loadSessionInterventions(sessionId);
      results.push(...interventions.filter((i) => Boolean(i.reversed_at)));
    }

    return results;
  }

  // ============================================================================
  // Aggregation Operations
  // ============================================================================

  /**
   * Get intervention summary for a session.
   */
  async getSessionSummary(sessionId: string): Promise<InterventionSummary> {
    const interventions = await this.loadSessionInterventions(sessionId);
    return aggregateInterventions(interventions);
  }

  /**
   * Get intervention summary for all sessions (program-level).
   */
  async getProgramSummary(): Promise<InterventionSummary> {
    const allInterventions = await this.getAllInterventions();
    return aggregateInterventions(allInterventions);
  }

  /**
   * Check if a session is "clean" (no major+ interventions).
   */
  async isCleanSession(sessionId: string): Promise<boolean> {
    const summary = await this.getSessionSummary(sessionId);
    return !summary.has_major_interventions;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get intervention statistics.
   */
  async getStatistics(): Promise<{
    total: number;
    bySeverity: Record<InterventionSeverity, number>;
    byType: Record<InterventionType, number>;
    reversed: number;
    sessionsWithInterventions: number;
    operators: string[];
  }> {
    const index = await this.loadIndex();

    const bySeverity: Record<InterventionSeverity, number> = {
      minor: 0,
      moderate: 0,
      major: 0,
      critical: 0,
    };

    const byType: Record<InterventionType, number> = {
      artifact_edit: 0,
      delta_exclusion: 0,
      delta_injection: 0,
      decision_override: 0,
      session_control: 0,
      role_reassignment: 0,
    };

    let reversed = 0;
    const operators = new Set<string>();

    for (const entry of index.entries) {
      bySeverity[entry.severity]++;
      byType[entry.type]++;
      if (entry.reversed) {
        reversed++;
      }
      operators.add(entry.operatorId);
    }

    const sessionsWithInterventions = new Set(index.entries.map((e) => e.sessionId))
      .size;

    return {
      total: index.entries.length,
      bySeverity,
      byType,
      reversed,
      sessionsWithInterventions,
      operators: Array.from(operators).sort(),
    };
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Get all interventions across all sessions.
   */
  async getAllInterventions(): Promise<OperatorIntervention[]> {
    const interventionsDir = getInterventionsDir(this.baseDir);
    const results: OperatorIntervention[] = [];

    try {
      const files = await fs.readdir(interventionsDir);

      for (const file of files) {
        if (!file.endsWith("-interventions.json")) continue;

        const content = await fs.readFile(join(interventionsDir, file), "utf-8");
        const data = JSON.parse(content) as SessionInterventionFile;
        results.push(
          ...data.interventions.map((i) => OperatorInterventionSchema.parse(i))
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    return results;
  }

  /**
   * List all session IDs that have interventions.
   */
  async listSessions(): Promise<string[]> {
    const interventionsDir = getInterventionsDir(this.baseDir);

    try {
      const files = await fs.readdir(interventionsDir);
      return files
        .filter((f) => f.endsWith("-interventions.json"))
        .map((f) => {
          const match = f.match(/^(.+)-interventions\.json$/);
          return match ? match[1] : null;
        })
        .filter((s): s is string => s !== null);
    } catch {
      return [];
    }
  }

  /**
   * Get interventions within a time range.
   */
  async getInterventionsInRange(
    startTime: string,
    endTime: string
  ): Promise<OperatorIntervention[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter(
      (e) => e.timestamp >= startTime && e.timestamp <= endTime
    );

    const results: OperatorIntervention[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const interventions = await this.loadSessionInterventions(sessionId);
      results.push(
        ...interventions.filter(
          (i) => i.timestamp >= startTime && i.timestamp <= endTime
        )
      );
    }

    return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Default storage instance using current working directory.
 */
export const interventionStorage = new InterventionStorage();
