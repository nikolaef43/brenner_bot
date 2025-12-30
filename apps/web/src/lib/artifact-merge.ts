/**
 * Brenner Protocol Artifact Merge Algorithm
 *
 * Implements deterministic merge of agent deltas into research artifacts.
 * Follows the rules from artifact_delta_spec_v0.1.md
 *
 * Usage:
 * ```typescript
 * import { mergeArtifact, createEmptyArtifact, type Artifact } from "./artifact-merge";
 * import { extractValidDeltas } from "./delta-parser";
 *
 * const deltas = extractValidDeltas(messageBody);
 * const result = mergeArtifact(baseArtifact, deltas, agentName, timestamp);
 * if (result.ok) {
 *   // result.artifact contains the merged artifact
 * } else {
 *   // result.errors contains validation errors
 * }
 * ```
 */

import {
  type ValidDelta,
  type DeltaSection,
  type DeltaOperation,
  SECTION_ID_PREFIXES,
  generateNextId,
} from "./delta-parser";

// ============================================================================
// Types
// ============================================================================

/** Contributor record in artifact metadata */
export interface Contributor {
  agent: string;
  program?: string;
  model?: string;
  contributed_at?: string;
}

/** Artifact metadata header */
export interface ArtifactMetadata {
  session_id: string;
  created_at: string;
  updated_at: string;
  version: number;
  contributors: Contributor[];
  status: "draft" | "active" | "closed";
}

/** Base interface for all artifact items */
interface BaseItem {
  id: string;
  killed?: boolean;
  killed_by?: string;
  killed_at?: string;
  kill_reason?: string;
}

/** Research thread (singleton) */
export interface ResearchThreadItem extends BaseItem {
  statement: string;
  context: string;
  why_it_matters: string;
  anchors?: string[];
}

/** Hypothesis item */
export interface HypothesisItem extends BaseItem {
  name: string;
  claim: string;
  mechanism: string;
  anchors?: string[];
  third_alternative?: boolean;
}

/** Prediction item */
export interface PredictionItem extends BaseItem {
  condition: string;
  predictions: Record<string, string>;
}

/** Test score breakdown */
export interface TestScore {
  likelihood_ratio?: number;
  cost?: number;
  speed?: number;
  ambiguity?: number;
}

/** Discriminative test item */
export interface TestItem extends BaseItem {
  name: string;
  procedure: string;
  discriminates: string;
  expected_outcomes: Record<string, string>;
  potency_check: string;
  feasibility?: string;
  score?: TestScore;
}

/** Assumption item */
export interface AssumptionItem extends BaseItem {
  name: string;
  statement: string;
  load: string;
  test: string;
  status?: "unchecked" | "verified" | "falsified";
  scale_check?: boolean;
  calculation?: string;
  implication?: string;
}

/** Anomaly item */
export interface AnomalyItem extends BaseItem {
  name: string;
  observation: string;
  conflicts_with: string[];
  status?: "active" | "resolved" | "deferred";
  resolution_plan?: string;
}

/** Critique item */
export interface CritiqueItem extends BaseItem {
  name: string;
  attack: string;
  evidence: string;
  current_status: string;
  real_third_alternative?: boolean;
}

/** Union of all item types */
export type ArtifactItem =
  | ResearchThreadItem
  | HypothesisItem
  | PredictionItem
  | TestItem
  | AssumptionItem
  | AnomalyItem
  | CritiqueItem;

/** Artifact sections */
export interface ArtifactSections {
  research_thread: ResearchThreadItem | null;
  hypothesis_slate: HypothesisItem[];
  predictions_table: PredictionItem[];
  discriminative_tests: TestItem[];
  assumption_ledger: AssumptionItem[];
  anomaly_register: AnomalyItem[];
  adversarial_critique: CritiqueItem[];
}

/** Complete artifact structure */
export interface Artifact {
  metadata: ArtifactMetadata;
  sections: ArtifactSections;
}

/** Merge error types */
export type MergeErrorCode =
  | "INVALID_TARGET"
  | "TARGET_KILLED"
  | "SECTION_LIMIT_EXCEEDED"
  | "MISSING_REQUIRED_FIELD"
  | "INVALID_SECTION"
  | "RT_ADD_NOT_ALLOWED"
  | "NO_THIRD_ALTERNATIVE"
  | "BELOW_MINIMUM";

/** Merge error */
export interface MergeError {
  code: MergeErrorCode;
  message: string;
  delta_raw?: string;
}

/** Merge warning */
export interface MergeWarning {
  code: string;
  message: string;
  delta_raw?: string;
}

/** Successful merge result */
export interface MergeSuccess {
  ok: true;
  artifact: Artifact;
  warnings: MergeWarning[];
  applied_count: number;
  skipped_count: number;
}

/** Failed merge result */
export interface MergeFailure {
  ok: false;
  errors: MergeError[];
  warnings: MergeWarning[];
  applied_count: number;
  skipped_count: number;
}

/** Merge result */
export type MergeResult = MergeSuccess | MergeFailure;

/** Internal delta with timestamp for sorting */
interface TimestampedDelta extends ValidDelta {
  timestamp: string;
  agent: string;
}

// ============================================================================
// Section Limits
// ============================================================================

const SECTION_LIMITS: Partial<Record<DeltaSection, number>> = {
  hypothesis_slate: 6,
};

// ============================================================================
// Helpers
// ============================================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function getItemsForSection(artifact: Artifact, section: DeltaSection): BaseItem[] {
  if (section === "research_thread") {
    return artifact.sections.research_thread ? [artifact.sections.research_thread] : [];
  }
  return artifact.sections[section] as BaseItem[];
}

function getItemById(artifact: Artifact, section: DeltaSection, id: string): BaseItem | undefined {
  const items = getItemsForSection(artifact, section);
  return items.find((item) => item.id === id);
}

function getExistingIds(artifact: Artifact, section: DeltaSection): string[] {
  return getItemsForSection(artifact, section).map((item) => item.id);
}

function isKilled(item: BaseItem): boolean {
  return item.killed === true;
}

/** Merge array fields by union (for anchors, conflicts_with, etc.) */
function mergeArrayField(existing: unknown, incoming: unknown): string[] {
  const existingArr = Array.isArray(existing) ? existing : [];
  const incomingArr = Array.isArray(incoming) ? incoming : [];
  const combined = new Set([...existingArr, ...incomingArr]);
  return Array.from(combined).filter((v): v is string => typeof v === "string");
}

/** Calculate total score for a test */
function calculateTotalScore(score?: TestScore): number {
  if (!score) return 0;
  return (
    (score.likelihood_ratio ?? 0) +
    (score.cost ?? 0) +
    (score.speed ?? 0) +
    (score.ambiguity ?? 0)
  );
}

/** Sort tests by score (highest first) */
function sortTestsByScore(tests: TestItem[]): void {
  tests.sort((a, b) => calculateTotalScore(b.score) - calculateTotalScore(a.score));
}

// ============================================================================
// Create Empty Artifact
// ============================================================================

/**
 * Create a new empty artifact with the given session ID.
 */
export function createEmptyArtifact(sessionId: string): Artifact {
  const now = new Date().toISOString();
  return {
    metadata: {
      session_id: sessionId,
      created_at: now,
      updated_at: now,
      version: 0,
      contributors: [],
      status: "draft",
    },
    sections: {
      research_thread: null,
      hypothesis_slate: [],
      predictions_table: [],
      discriminative_tests: [],
      assumption_ledger: [],
      anomaly_register: [],
      adversarial_critique: [],
    },
  };
}

// ============================================================================
// Apply Operations
// ============================================================================

function applyAdd(
  artifact: Artifact,
  delta: TimestampedDelta,
  errors: MergeError[],
  warnings: MergeWarning[],
): boolean {
  const { section, payload, raw } = delta;

  // Research thread cannot use ADD
  if (section === "research_thread") {
    errors.push({
      code: "RT_ADD_NOT_ALLOWED",
      message: "Research thread only supports EDIT operation, not ADD",
      delta_raw: raw,
    });
    return false;
  }

  // Check section limits
  const limit = SECTION_LIMITS[section];
  const currentItems = artifact.sections[section] as BaseItem[];
  const activeItems = currentItems.filter((item) => !isKilled(item));

  if (limit !== undefined && activeItems.length >= limit) {
    errors.push({
      code: "SECTION_LIMIT_EXCEEDED",
      message: `Section ${section} is at its limit of ${limit} active items`,
      delta_raw: raw,
    });
    return false;
  }

  // Generate next ID
  const existingIds = getExistingIds(artifact, section);
  const newId = generateNextId(section, existingIds);

  // Create new item from payload
  if (!isRecord(payload)) {
    errors.push({
      code: "MISSING_REQUIRED_FIELD",
      message: "ADD operation requires a payload object",
      delta_raw: raw,
    });
    return false;
  }

  const newItem: BaseItem = {
    id: newId,
    ...payload,
  };

  // Add to section
  (artifact.sections[section] as BaseItem[]).push(newItem);

  // Re-sort tests by score if applicable
  if (section === "discriminative_tests") {
    sortTestsByScore(artifact.sections.discriminative_tests);
  }

  return true;
}

function applyEdit(
  artifact: Artifact,
  delta: TimestampedDelta,
  errors: MergeError[],
  warnings: MergeWarning[],
): boolean {
  const { section, target_id, payload, raw } = delta;

  // Research thread: special handling
  if (section === "research_thread") {
    if (!artifact.sections.research_thread) {
      // Create the research thread if it doesn't exist
      if (!isRecord(payload)) {
        errors.push({
          code: "MISSING_REQUIRED_FIELD",
          message: "Research thread EDIT requires a payload object",
          delta_raw: raw,
        });
        return false;
      }
      artifact.sections.research_thread = {
        id: "RT",
        statement: "",
        context: "",
        why_it_matters: "",
        ...payload,
      } as ResearchThreadItem;
      return true;
    }

    // Merge fields into existing research thread
    if (isRecord(payload)) {
      const rt = artifact.sections.research_thread;
      const rtRecord = rt as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(payload)) {
        if (key === "anchors" && !(payload as Record<string, unknown>).replace) {
          rtRecord[key] = mergeArrayField(rtRecord[key], value);
        } else if (key !== "replace") {
          rtRecord[key] = value;
        }
      }
    }
    return true;
  }

  // Regular sections: find target item
  if (!target_id) {
    errors.push({
      code: "INVALID_TARGET",
      message: "EDIT operation requires target_id",
      delta_raw: raw,
    });
    return false;
  }

  const item = getItemById(artifact, section, target_id);
  if (!item) {
    errors.push({
      code: "INVALID_TARGET",
      message: `Target ${target_id} not found in ${section}`,
      delta_raw: raw,
    });
    return false;
  }

  if (isKilled(item)) {
    warnings.push({
      code: "TARGET_KILLED",
      message: `Skipping EDIT of killed item ${target_id}`,
      delta_raw: raw,
    });
    return false;
  }

  // Merge payload fields
  if (isRecord(payload)) {
    const shouldReplace = (payload as Record<string, unknown>).replace === true;
    const itemRecord = item as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(payload)) {
      if (key === "replace") continue;

      // Array fields: merge by default, replace if explicitly requested
      if (
        Array.isArray(value) &&
        (key === "anchors" || key === "conflicts_with") &&
        !shouldReplace
      ) {
        itemRecord[key] = mergeArrayField(itemRecord[key], value);
      } else {
        itemRecord[key] = value;
      }
    }
  }

  // Re-sort tests if score was edited
  if (section === "discriminative_tests") {
    sortTestsByScore(artifact.sections.discriminative_tests);
  }

  return true;
}

function applyKill(
  artifact: Artifact,
  delta: TimestampedDelta,
  errors: MergeError[],
  warnings: MergeWarning[],
): boolean {
  const { section, target_id, payload, agent, timestamp, raw } = delta;

  // Research thread cannot be killed
  if (section === "research_thread") {
    errors.push({
      code: "INVALID_TARGET",
      message: "Research thread cannot be killed",
      delta_raw: raw,
    });
    return false;
  }

  if (!target_id) {
    errors.push({
      code: "INVALID_TARGET",
      message: "KILL operation requires target_id",
      delta_raw: raw,
    });
    return false;
  }

  const item = getItemById(artifact, section, target_id);
  if (!item) {
    errors.push({
      code: "INVALID_TARGET",
      message: `Target ${target_id} not found in ${section}`,
      delta_raw: raw,
    });
    return false;
  }

  // Idempotent: killing already-killed item is a no-op
  if (isKilled(item)) {
    return true;
  }

  // Extract kill reason
  const reason = isRecord(payload) && typeof payload.reason === "string" ? payload.reason : "";

  // Mark as killed
  item.killed = true;
  item.killed_by = agent;
  item.killed_at = timestamp;
  item.kill_reason = reason;

  // Check post-conditions
  if (section === "hypothesis_slate") {
    const activeHypotheses = artifact.sections.hypothesis_slate.filter((h) => !isKilled(h));
    const hasThirdAlternative = activeHypotheses.some((h) => h.third_alternative === true);
    if (!hasThirdAlternative) {
      warnings.push({
        code: "NO_THIRD_ALTERNATIVE",
        message: "No active third alternative hypothesis remains after KILL",
        delta_raw: raw,
      });
    }
  }

  if (section === "assumption_ledger") {
    const activeAssumptions = artifact.sections.assumption_ledger.filter((a) => !isKilled(a));
    const hasScaleCheck = activeAssumptions.some((a) => a.scale_check === true);
    if (!hasScaleCheck) {
      warnings.push({
        code: "NO_SCALE_CHECK",
        message: "No active scale/physics check assumption remains after KILL",
        delta_raw: raw,
      });
    }
  }

  return true;
}

// ============================================================================
// Merge Function
// ============================================================================

/**
 * Merge deltas into an artifact, producing a new artifact.
 *
 * Per the spec:
 * 1. Sort deltas by timestamp (oldest first)
 * 2. Apply each delta in order
 * 3. Collect errors and warnings
 * 4. Return merged artifact or errors
 *
 * @param base - The base artifact to merge into
 * @param deltas - Array of valid deltas to apply
 * @param agentName - Name of the agent applying the deltas
 * @param timestamp - Timestamp for the merge operation
 * @returns Merge result with artifact or errors
 */
export function mergeArtifact(
  base: Artifact,
  deltas: ValidDelta[],
  agentName: string,
  timestamp: string,
): MergeResult {
  // Deep clone to avoid mutating original
  const artifact = deepClone(base);

  // Convert to timestamped deltas (use provided timestamp for all)
  const timestampedDeltas: TimestampedDelta[] = deltas.map((d) => ({
    ...d,
    timestamp,
    agent: agentName,
  }));

  // Sort by timestamp (oldest first) - for now all have same timestamp
  // In a real scenario with multiple message sources, each delta would have its own timestamp
  timestampedDeltas.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const errors: MergeError[] = [];
  const warnings: MergeWarning[] = [];
  let appliedCount = 0;
  let skippedCount = 0;

  for (const delta of timestampedDeltas) {
    let applied = false;

    switch (delta.operation) {
      case "ADD":
        applied = applyAdd(artifact, delta, errors, warnings);
        break;
      case "EDIT":
        applied = applyEdit(artifact, delta, errors, warnings);
        break;
      case "KILL":
        applied = applyKill(artifact, delta, errors, warnings);
        break;
    }

    if (applied) {
      appliedCount++;
    } else {
      skippedCount++;
    }
  }

  // Update metadata
  artifact.metadata.updated_at = timestamp;
  artifact.metadata.version++;

  // Add contributor if not already present
  const existingContributor = artifact.metadata.contributors.find((c) => c.agent === agentName);
  if (!existingContributor) {
    artifact.metadata.contributors.push({
      agent: agentName,
      contributed_at: timestamp,
    });
  } else {
    existingContributor.contributed_at = timestamp;
  }

  // Check post-conditions for errors
  const finalErrors: MergeError[] = [...errors];

  // If there are any errors, return failure
  if (finalErrors.length > 0) {
    return {
      ok: false,
      errors: finalErrors,
      warnings,
      applied_count: appliedCount,
      skipped_count: skippedCount,
    };
  }

  return {
    ok: true,
    artifact,
    warnings,
    applied_count: appliedCount,
    skipped_count: skippedCount,
  };
}

/**
 * Merge deltas from multiple agents with individual timestamps.
 *
 * This version accepts deltas that already have timestamp and agent info,
 * sorting them by timestamp for deterministic ordering.
 *
 * @param base - The base artifact to merge into
 * @param deltas - Array of deltas with timestamp and agent info
 * @returns Merge result
 */
export function mergeArtifactWithTimestamps(
  base: Artifact,
  deltas: Array<ValidDelta & { timestamp: string; agent: string }>,
): MergeResult {
  // Deep clone to avoid mutating original
  const artifact = deepClone(base);

  // Sort by timestamp (oldest first)
  const sortedDeltas = [...deltas].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const errors: MergeError[] = [];
  const warnings: MergeWarning[] = [];
  let appliedCount = 0;
  let skippedCount = 0;

  let latestTimestamp = base.metadata.updated_at;

  for (const delta of sortedDeltas) {
    let applied = false;

    switch (delta.operation) {
      case "ADD":
        applied = applyAdd(artifact, delta, errors, warnings);
        break;
      case "EDIT":
        applied = applyEdit(artifact, delta, errors, warnings);
        break;
      case "KILL":
        applied = applyKill(artifact, delta, errors, warnings);
        break;
    }

    if (applied) {
      appliedCount++;
      if (delta.timestamp > latestTimestamp) {
        latestTimestamp = delta.timestamp;
      }

      // Track contributor
      const existingContributor = artifact.metadata.contributors.find(
        (c) => c.agent === delta.agent,
      );
      if (!existingContributor) {
        artifact.metadata.contributors.push({
          agent: delta.agent,
          contributed_at: delta.timestamp,
        });
      } else if (
        existingContributor.contributed_at &&
        delta.timestamp > existingContributor.contributed_at
      ) {
        existingContributor.contributed_at = delta.timestamp;
      }
    } else {
      skippedCount++;
    }
  }

  // Update metadata
  artifact.metadata.updated_at = latestTimestamp;
  artifact.metadata.version++;

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings,
      applied_count: appliedCount,
      skipped_count: skippedCount,
    };
  }

  return {
    ok: true,
    artifact,
    warnings,
    applied_count: appliedCount,
    skipped_count: skippedCount,
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that an artifact meets minimum requirements.
 *
 * @param artifact - The artifact to validate
 * @returns Array of validation warnings (empty if valid)
 */
export function validateArtifact(artifact: Artifact): MergeWarning[] {
  const warnings: MergeWarning[] = [];

  // Check minimum counts
  const activeHypotheses = artifact.sections.hypothesis_slate.filter((h) => !isKilled(h));
  const activePredictions = artifact.sections.predictions_table.filter((p) => !isKilled(p));
  const activeTests = artifact.sections.discriminative_tests.filter((t) => !isKilled(t));
  const activeAssumptions = artifact.sections.assumption_ledger.filter((a) => !isKilled(a));
  const activeCritiques = artifact.sections.adversarial_critique.filter((c) => !isKilled(c));

  if (activeHypotheses.length < 3) {
    warnings.push({
      code: "BELOW_MINIMUM",
      message: `Hypothesis slate has ${activeHypotheses.length} active items (minimum 3)`,
    });
  }

  if (!activeHypotheses.some((h) => h.third_alternative)) {
    warnings.push({
      code: "NO_THIRD_ALTERNATIVE",
      message: "No third alternative hypothesis found",
    });
  }

  if (activePredictions.length < 3) {
    warnings.push({
      code: "BELOW_MINIMUM",
      message: `Predictions table has ${activePredictions.length} active items (minimum 3)`,
    });
  }

  if (activeTests.length < 2) {
    warnings.push({
      code: "BELOW_MINIMUM",
      message: `Discriminative tests has ${activeTests.length} active items (minimum 2)`,
    });
  }

  if (activeAssumptions.length < 3) {
    warnings.push({
      code: "BELOW_MINIMUM",
      message: `Assumption ledger has ${activeAssumptions.length} active items (minimum 3)`,
    });
  }

  if (!activeAssumptions.some((a) => a.scale_check)) {
    warnings.push({
      code: "NO_SCALE_CHECK",
      message: "No scale/physics check assumption found",
    });
  }

  if (activeCritiques.length < 2) {
    warnings.push({
      code: "BELOW_MINIMUM",
      message: `Adversarial critique has ${activeCritiques.length} active items (minimum 2)`,
    });
  }

  if (!activeCritiques.some((c) => c.real_third_alternative)) {
    warnings.push({
      code: "NO_REAL_THIRD_ALTERNATIVE",
      message: "No real third alternative critique found",
    });
  }

  return warnings;
}
