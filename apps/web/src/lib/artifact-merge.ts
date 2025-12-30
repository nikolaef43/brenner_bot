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

import { type ValidDelta, type DeltaSection, generateNextId } from "./delta-parser";

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

const SYSTEM_ITEM_FIELDS = new Set(["id", "killed", "killed_by", "killed_at", "kill_reason"]);
const FORBIDDEN_PAYLOAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isForbiddenPayloadKey(key: string): boolean {
  return FORBIDDEN_PAYLOAD_KEYS.has(key);
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

  const sanitizedPayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SYSTEM_ITEM_FIELDS.has(key)) continue;
    if (isForbiddenPayloadKey(key)) {
      warnings.push({
        code: "FORBIDDEN_PAYLOAD_KEY",
        message: `Ignoring forbidden payload key "${key}" (prototype pollution risk)`,
        delta_raw: raw,
      });
      continue;
    }
    sanitizedPayload[key] = value;
  }

  const newItem: BaseItem = {
    ...sanitizedPayload,
    id: newId,
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

      const sanitizedPayload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(payload)) {
        if (SYSTEM_ITEM_FIELDS.has(key)) continue;
        if (isForbiddenPayloadKey(key)) {
          warnings.push({
            code: "FORBIDDEN_PAYLOAD_KEY",
            message: `Ignoring forbidden payload key "${key}" (prototype pollution risk)`,
            delta_raw: raw,
          });
          continue;
        }
        sanitizedPayload[key] = value;
      }

      artifact.sections.research_thread = {
        statement: "",
        context: "",
        why_it_matters: "",
        ...sanitizedPayload,
        id: "RT",
      } as ResearchThreadItem;
      return true;
    }

    // Merge fields into existing research thread
    if (isRecord(payload)) {
      const rt = artifact.sections.research_thread;
      const rtRecord = rt as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(payload)) {
        if (SYSTEM_ITEM_FIELDS.has(key)) continue;
        if (isForbiddenPayloadKey(key)) {
          warnings.push({
            code: "FORBIDDEN_PAYLOAD_KEY",
            message: `Ignoring forbidden payload key "${key}" (prototype pollution risk)`,
            delta_raw: raw,
          });
          continue;
        }
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
      if (SYSTEM_ITEM_FIELDS.has(key)) continue;
      if (isForbiddenPayloadKey(key)) {
        warnings.push({
          code: "FORBIDDEN_PAYLOAD_KEY",
          message: `Ignoring forbidden payload key "${key}" (prototype pollution risk)`,
          delta_raw: raw,
        });
        continue;
      }

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

// ============================================================================
// Canonical Markdown Rendering
// ============================================================================

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function escapeInline(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function escapeTableCell(value: unknown): string {
  return escapeInline(value).replaceAll("|", "\\|").replaceAll("\n", "<br/>");
}

function formatStringList(list: unknown, emptyValue = "inference"): string {
  if (!Array.isArray(list) || list.length === 0) return emptyValue;
  const strings = list.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return strings.length > 0 ? strings.join(", ") : emptyValue;
}

function idNumber(id: string): number | null {
  const match = id.match(/^[A-Z]+(\d+)$/);
  if (!match?.[1]) return null;
  return Number.parseInt(match[1], 10);
}

function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const an = idNumber(a.id);
    const bn = idNumber(b.id);
    if (an !== null && bn !== null) return an - bn;
    if (an !== null) return -1;
    if (bn !== null) return 1;
    return a.id.localeCompare(b.id);
  });
}

function renderYamlFrontMatter(metadata: ArtifactMetadata): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`session_id: ${yamlString(metadata.session_id)}`);
  lines.push(`created_at: ${yamlString(metadata.created_at)}`);
  lines.push(`updated_at: ${yamlString(metadata.updated_at)}`);
  lines.push(`version: ${metadata.version}`);
  lines.push("contributors:");
  if (metadata.contributors.length === 0) {
    lines.push("  []");
  } else {
    for (const c of metadata.contributors) {
      lines.push(`  - agent: ${yamlString(c.agent)}`);
      if (c.program) lines.push(`    program: ${yamlString(c.program)}`);
      if (c.model) lines.push(`    model: ${yamlString(c.model)}`);
      if (c.contributed_at) lines.push(`    contributed_at: ${yamlString(c.contributed_at)}`);
    }
  }
  lines.push(`status: ${yamlString(metadata.status)}`);
  lines.push("---");
  return lines.join("\n");
}

function renderKillBlock(item: BaseItem): string[] {
  if (!isKilled(item)) return [];
  const lines: string[] = [];
  lines.push("");
  lines.push("**Killed**: true");
  if (item.killed_by) lines.push(`**Killed by**: ${item.killed_by}`);
  if (item.killed_at) lines.push(`**Killed at**: ${item.killed_at}`);
  if (item.kill_reason) lines.push(`**Kill reason**: ${item.kill_reason}`);
  return lines;
}

function renderResearchThread(rt: ResearchThreadItem | null): string[] {
  const lines: string[] = [];
  lines.push("## 1. Research Thread");
  lines.push("");
  lines.push(`**RT**: ${rt ? escapeInline(rt.statement) : ""}`);
  lines.push("");
  lines.push(`**Context**: ${rt ? escapeInline(rt.context) : ""}`);
  lines.push("");
  lines.push(`**Why it matters**: ${rt ? escapeInline(rt.why_it_matters) : ""}`);
  lines.push("");
  lines.push(`**Anchors**: ${rt ? formatStringList(rt.anchors) : "inference"}`);
  if (rt) lines.push(...renderKillBlock(rt));
  return lines;
}

function renderHypothesisSlate(items: HypothesisItem[]): string[] {
  const lines: string[] = [];
  lines.push("## 2. Hypothesis Slate");
  lines.push("");
  for (const h of sortById(items)) {
    const thirdAlt = h.third_alternative === true;
    const name = escapeInline(h.name);
    const title = thirdAlt && !/third\s+alternative/i.test(name) ? `${name} (Third Alternative)` : name;
    const heading = isKilled(h) ? `### ~~${h.id}: ${title}~~` : `### ${h.id}: ${title}`;
    lines.push(heading);
    lines.push(`**Claim**: ${escapeInline(h.claim)}`);
    lines.push(`**Mechanism**: ${escapeInline(h.mechanism)}`);
    lines.push(`**Anchors**: ${formatStringList(h.anchors)}`);
    if (thirdAlt) lines.push("**Third alternative**: true");
    lines.push(...renderKillBlock(h));
    lines.push("");
  }
  return lines;
}

function renderPredictionsTable(items: PredictionItem[], hypothesisIds: string[]): string[] {
  const lines: string[] = [];
  lines.push("## 3. Predictions Table");
  lines.push("");

  const headerCells = ["ID", "Observation/Condition", ...hypothesisIds];
  lines.push(`| ${headerCells.join(" | ")} |`);
  lines.push(`| ${headerCells.map(() => "---").join(" | ")} |`);

  for (const p of sortById(items)) {
    const idCell = isKilled(p) ? `~~${p.id}~~` : p.id;
    const row: string[] = [idCell, escapeTableCell(p.condition)];
    for (const hid of hypothesisIds) {
      const value = (p.predictions ?? {})[hid] ?? (p.predictions ?? {})[hid.toLowerCase()] ?? "—";
      row.push(escapeTableCell(value));
    }
    lines.push(`| ${row.join(" | ")} |`);
  }

  return lines;
}

function renderTests(items: TestItem[]): string[] {
  const lines: string[] = [];
  lines.push("## 4. Discriminative Tests");
  lines.push("");

  for (const t of sortById(items)) {
    const totalScore = calculateTotalScore(t.score);
    const headingBase = `${t.id}: ${escapeInline(t.name)} (Score: ${totalScore}/12)`;
    const heading = isKilled(t) ? `### ~~${headingBase}~~` : `### ${headingBase}`;

    lines.push(heading);
    lines.push(`**Procedure**: ${escapeInline(t.procedure)}`);
    lines.push(`**Discriminates**: ${escapeInline(t.discriminates)}`);
    lines.push("**Expected outcomes**:");
    for (const [key, value] of Object.entries(t.expected_outcomes ?? {})) {
      lines.push(`- ${key}: ${escapeInline(value)}`);
    }
    lines.push(`**Potency check**: ${escapeInline(t.potency_check)}`);
    if (t.feasibility) lines.push(`**Feasibility**: ${escapeInline(t.feasibility)}`);
    if (t.score) {
      const lr = t.score.likelihood_ratio ?? 0;
      const cost = t.score.cost ?? 0;
      const speed = t.score.speed ?? 0;
      const ambiguity = t.score.ambiguity ?? 0;
      lines.push(`**Evidence-per-week score**: LR=${lr}, Cost=${cost}, Speed=${speed}, Ambiguity=${ambiguity}`);
    }
    lines.push(...renderKillBlock(t));
    lines.push("");
  }

  return lines;
}

function renderAssumptions(items: AssumptionItem[]): string[] {
  const lines: string[] = [];
  lines.push("## 5. Assumption Ledger");
  lines.push("");

  for (const a of sortById(items)) {
    const heading = isKilled(a) ? `### ~~${a.id}: ${escapeInline(a.name)}~~` : `### ${a.id}: ${escapeInline(a.name)}`;
    lines.push(heading);
    lines.push(`**Statement**: ${escapeInline(a.statement)}`);
    lines.push(`**Load**: ${escapeInline(a.load)}`);
    lines.push(`**Test**: ${escapeInline(a.test)}`);
    if (a.status) lines.push(`**Status**: ${escapeInline(a.status)}`);
    if (a.scale_check) lines.push("**Scale check**: true");
    if (a.calculation) lines.push(`**Calculation**: ${escapeInline(a.calculation)}`);
    if (a.implication) lines.push(`**Implication**: ${escapeInline(a.implication)}`);
    lines.push(...renderKillBlock(a));
    lines.push("");
  }

  return lines;
}

function renderAnomalies(items: AnomalyItem[]): string[] {
  const lines: string[] = [];
  lines.push("## 6. Anomaly Register");
  lines.push("");

  const active = items.filter((x) => !isKilled(x));
  if (active.length === 0) {
    lines.push("None registered.");
    lines.push("");
    return lines;
  }

  for (const x of sortById(items)) {
    const heading = isKilled(x) ? `### ~~${x.id}: ${escapeInline(x.name)}~~` : `### ${x.id}: ${escapeInline(x.name)}`;
    lines.push(heading);
    lines.push(`**Observation**: ${escapeInline(x.observation)}`);
    lines.push(`**Conflicts with**: ${formatStringList(x.conflicts_with, "—")}`);
    if (x.status) lines.push(`**Quarantine status**: ${escapeInline(x.status)}`);
    if (x.resolution_plan) lines.push(`**Resolution plan**: ${escapeInline(x.resolution_plan)}`);
    lines.push(...renderKillBlock(x));
    lines.push("");
  }

  return lines;
}

function renderCritiques(items: CritiqueItem[]): string[] {
  const lines: string[] = [];
  lines.push("## 7. Adversarial Critique");
  lines.push("");

  for (const c of sortById(items)) {
    const heading = isKilled(c) ? `### ~~${c.id}: ${escapeInline(c.name)}~~` : `### ${c.id}: ${escapeInline(c.name)}`;
    lines.push(heading);
    lines.push(`**Attack**: ${escapeInline(c.attack)}`);
    lines.push(`**Evidence**: ${escapeInline(c.evidence)}`);
    lines.push(`**Current status**: ${escapeInline(c.current_status)}`);
    if (c.real_third_alternative) lines.push("**Real third alternative**: true");
    lines.push(...renderKillBlock(c));
    lines.push("");
  }

  return lines;
}

/**
 * Render a merged artifact into canonical markdown per artifact_schema_v0.1.md.
 */
export function renderArtifactMarkdown(artifact: Artifact): string {
  const lines: string[] = [];

  lines.push(renderYamlFrontMatter(artifact.metadata));
  lines.push("");
  lines.push(`# Brenner Protocol Artifact: ${artifact.metadata.session_id}`);
  lines.push("");

  lines.push(...renderResearchThread(artifact.sections.research_thread));
  lines.push("");

  lines.push(...renderHypothesisSlate(artifact.sections.hypothesis_slate));

  const hypothesisIds = sortById(artifact.sections.hypothesis_slate).map((h) => h.id);
  lines.push(...renderPredictionsTable(artifact.sections.predictions_table, hypothesisIds));
  lines.push("");

  lines.push(...renderTests(artifact.sections.discriminative_tests));
  lines.push(...renderAssumptions(artifact.sections.assumption_ledger));
  lines.push(...renderAnomalies(artifact.sections.anomaly_register));
  lines.push(...renderCritiques(artifact.sections.adversarial_critique));

  return lines.join("\n").trimEnd() + "\n";
}

// ============================================================================
// Artifact Linter (Guardrails)
// ============================================================================

export type LintSeverity = "error" | "warning" | "info";

export interface LintViolation {
  id: string;
  severity: LintSeverity;
  message: string;
  fix?: string;
}

export interface LintReport {
  valid: boolean;
  summary: { errors: number; warnings: number; info: number };
  violations: LintViolation[];
}

function severityRank(severity: LintSeverity): number {
  switch (severity) {
    case "error":
      return 0;
    case "warning":
      return 1;
    case "info":
      return 2;
  }
}

function isIsoTimestamp(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function isAllowedStatus(status: string): boolean {
  return status === "draft" || status === "active" || status === "closed";
}

function hasThirdAlternative(hypotheses: HypothesisItem[]): boolean {
  return hypotheses.some((h) => {
    if (isKilled(h)) return false;
    if (h.third_alternative === true) return true;
    return typeof h.name === "string" && /third\s+alternative/i.test(h.name);
  });
}

function hasScaleCheck(assumptions: AssumptionItem[]): boolean {
  return assumptions.some((a) => !isKilled(a) && a.scale_check === true);
}

function pushViolation(violations: LintViolation[], violation: LintViolation): void {
  violations.push(violation);
}

/**
 * Lint an artifact object against machine-checkable guardrails.
 *
 * This lints the structured artifact (not raw markdown), so line numbers are not provided.
 */
export function lintArtifact(artifact: Artifact): LintReport {
  const violations: LintViolation[] = [];

  // --------------------------------------------------------------------------
  // Metadata (M)
  // --------------------------------------------------------------------------

  if (!artifact.metadata.session_id || artifact.metadata.session_id.trim().length === 0) {
    pushViolation(violations, {
      id: "EM-002",
      severity: "error",
      message: "Metadata.session_id is required",
      fix: "Set artifact.metadata.session_id to a non-empty thread/session identifier",
    });
  }

  if (!isIsoTimestamp(artifact.metadata.created_at)) {
    pushViolation(violations, {
      id: "EM-003",
      severity: "error",
      message: "Metadata.created_at must be an ISO-8601 timestamp",
      fix: "Set artifact.metadata.created_at to new Date().toISOString()",
    });
  }

  if (!isIsoTimestamp(artifact.metadata.updated_at)) {
    pushViolation(violations, {
      id: "EM-003b",
      severity: "error",
      message: "Metadata.updated_at must be an ISO-8601 timestamp",
      fix: "Set artifact.metadata.updated_at to new Date().toISOString()",
    });
  }

  if (!isAllowedStatus(artifact.metadata.status)) {
    pushViolation(violations, {
      id: "EM-004",
      severity: "error",
      message: "Metadata.status must be one of: draft | active | closed",
      fix: "Set artifact.metadata.status to 'draft', 'active', or 'closed'",
    });
  }

  if (artifact.metadata.contributors.length === 0) {
    pushViolation(violations, {
      id: "WM-001",
      severity: "warning",
      message: "No contributors recorded",
      fix: "Ensure merge pipeline stamps artifact.metadata.contributors",
    });
  }

  if (
    isIsoTimestamp(artifact.metadata.created_at) &&
    isIsoTimestamp(artifact.metadata.updated_at) &&
    Date.parse(artifact.metadata.updated_at) < Date.parse(artifact.metadata.created_at)
  ) {
    pushViolation(violations, {
      id: "WM-002",
      severity: "warning",
      message: "updated_at is earlier than created_at",
      fix: "Ensure updated_at is >= created_at",
    });
  }

  if (!Number.isInteger(artifact.metadata.version)) {
    pushViolation(violations, {
      id: "IM-002",
      severity: "info",
      message: "Metadata.version should be an integer",
      fix: "Set artifact.metadata.version to an integer",
    });
  }

  // --------------------------------------------------------------------------
  // Research Thread (R)
  // --------------------------------------------------------------------------

  const rt = artifact.sections.research_thread;
  if (!rt || rt.statement.trim().length === 0) {
    pushViolation(violations, {
      id: "ER-001",
      severity: "error",
      message: "Research thread statement is missing",
      fix: "Add an EDIT delta to section 'research_thread' with a non-empty statement",
    });
  }
  if (!rt || rt.context.trim().length === 0) {
    pushViolation(violations, {
      id: "ER-002",
      severity: "error",
      message: "Research thread context is missing",
      fix: "Add an EDIT delta to section 'research_thread' with a non-empty context",
    });
  }
  if (!rt || !Array.isArray(rt.anchors) || rt.anchors.length === 0) {
    pushViolation(violations, {
      id: "WR-001",
      severity: "warning",
      message: "Research thread anchors are missing",
      fix: "Add at least one transcript anchor (e.g., §42) or 'inference'",
    });
  }

  // --------------------------------------------------------------------------
  // Hypothesis Slate (H)
  // --------------------------------------------------------------------------

  const hypotheses = artifact.sections.hypothesis_slate.filter((h) => !isKilled(h));
  if (hypotheses.length < 3) {
    pushViolation(violations, {
      id: "EH-001",
      severity: "error",
      message: `Hypothesis slate has ${hypotheses.length} active items (minimum 3)`,
      fix: "Add hypotheses (including a third alternative) via ADD deltas",
    });
  }
  if (hypotheses.length > 6) {
    pushViolation(violations, {
      id: "EH-002",
      severity: "error",
      message: `Hypothesis slate has ${hypotheses.length} active items (maximum 6)`,
      fix: "KILL or consolidate hypotheses to <= 6 items",
    });
  }
  if (!hasThirdAlternative(artifact.sections.hypothesis_slate)) {
    pushViolation(violations, {
      id: "EH-003",
      severity: "error",
      message: "No third alternative hypothesis is present",
      fix: "Ensure at least one hypothesis is explicitly labeled as the third alternative",
    });
  }

  for (const h of hypotheses) {
    if (!h.claim || h.claim.trim().length === 0) {
      pushViolation(violations, {
        id: "EH-004",
        severity: "error",
        message: `${h.id} is missing claim`,
        fix: "Add a non-empty claim field",
      });
    }
    if (!Array.isArray(h.anchors) || h.anchors.length === 0) {
      pushViolation(violations, {
        id: "WH-001",
        severity: "warning",
        message: `${h.id} is missing anchors`,
        fix: "Add transcript anchors (e.g., §42) or 'inference'",
      });
    }
  }

  // --------------------------------------------------------------------------
  // Predictions Table (P)
  // --------------------------------------------------------------------------

  const predictions = artifact.sections.predictions_table.filter((p) => !isKilled(p));
  if (predictions.length < 3) {
    pushViolation(violations, {
      id: "EP-001",
      severity: "error",
      message: `Predictions table has ${predictions.length} active items (minimum 3)`,
      fix: "Add predictions via ADD deltas",
    });
  }

  const hypothesisIds = sortById(artifact.sections.hypothesis_slate).map((h) => h.id);
  for (const p of predictions) {
    const values = hypothesisIds.map((hid) => (p.predictions ?? {})[hid] ?? "");
    const normalized = values.map((v) => v.trim()).filter(Boolean);
    const unique = new Set(normalized);
    if (normalized.length > 0 && unique.size <= 1 && hypothesisIds.length >= 2) {
      pushViolation(violations, {
        id: "WP-001",
        severity: "warning",
        message: `${p.id} does not discriminate (all hypothesis outcomes identical or missing)`,
        fix: "Adjust prediction so at least two hypotheses differ in expected outcome",
      });
    }
  }

  // --------------------------------------------------------------------------
  // Discriminative Tests (T)
  // --------------------------------------------------------------------------

  const tests = artifact.sections.discriminative_tests.filter((t) => !isKilled(t));
  if (tests.length < 2) {
    pushViolation(violations, {
      id: "ET-001",
      severity: "error",
      message: `Discriminative tests has ${tests.length} active items (minimum 2)`,
      fix: "Add discriminative tests via ADD deltas",
    });
  }
  for (const t of tests) {
    if (!t.procedure || t.procedure.trim().length === 0) {
      pushViolation(violations, {
        id: "ET-002",
        severity: "error",
        message: `${t.id} is missing procedure`,
        fix: "Add a non-empty procedure field",
      });
    }
    if (!t.expected_outcomes || Object.keys(t.expected_outcomes).length === 0) {
      pushViolation(violations, {
        id: "ET-003",
        severity: "error",
        message: `${t.id} is missing expected outcomes`,
        fix: "Add expected_outcomes mapping (e.g., {'H1': '...', 'H2': '...'})",
      });
    }
    if (!t.potency_check || t.potency_check.trim().length === 0) {
      pushViolation(violations, {
        id: "WT-001",
        severity: "warning",
        message: `${t.id} is missing potency check`,
        fix: "Add a potency_check that distinguishes chastity vs impotence",
      });
    }
    if (!t.score) {
      pushViolation(violations, {
        id: "WT-003",
        severity: "warning",
        message: `${t.id} is missing score breakdown`,
        fix: "Add score: {likelihood_ratio, cost, speed, ambiguity} with 0-3 values",
      });
    }
  }

  for (let i = 1; i < tests.length; i++) {
    const prev = calculateTotalScore(tests[i - 1]?.score);
    const cur = calculateTotalScore(tests[i]?.score);
    if (cur > prev) {
      pushViolation(violations, {
        id: "WT-002",
        severity: "warning",
        message: "Tests are not ranked by score (non-increasing order violated)",
        fix: "Sort tests by descending total score (LR+cost+speed+ambiguity)",
      });
      break;
    }
  }

  // --------------------------------------------------------------------------
  // Assumption Ledger (A)
  // --------------------------------------------------------------------------

  const assumptions = artifact.sections.assumption_ledger.filter((a) => !isKilled(a));
  if (assumptions.length < 3) {
    pushViolation(violations, {
      id: "EA-001",
      severity: "error",
      message: `Assumption ledger has ${assumptions.length} active items (minimum 3)`,
      fix: "Add assumptions via ADD deltas",
    });
  }
  if (!hasScaleCheck(artifact.sections.assumption_ledger)) {
    pushViolation(violations, {
      id: "EA-002",
      severity: "error",
      message: "No scale/physics check assumption found",
      fix: "Add an assumption with scale_check: true and a calculation",
    });
  }
  for (const a of assumptions) {
    if (!a.statement || a.statement.trim().length === 0) {
      pushViolation(violations, {
        id: "EA-003",
        severity: "error",
        message: `${a.id} is missing statement`,
        fix: "Add a non-empty statement field",
      });
    }
    if (a.scale_check === true && (!a.calculation || a.calculation.trim().length === 0)) {
      pushViolation(violations, {
        id: "WA-003",
        severity: "warning",
        message: `${a.id} is a scale check but missing calculation`,
        fix: "Add a calculation field with explicit numbers and units",
      });
    }
  }

  // --------------------------------------------------------------------------
  // Adversarial Critique (C)
  // --------------------------------------------------------------------------

  const critiques = artifact.sections.adversarial_critique.filter((c) => !isKilled(c));
  if (critiques.length < 2) {
    pushViolation(violations, {
      id: "EC-001",
      severity: "error",
      message: `Adversarial critique has ${critiques.length} active items (minimum 2)`,
      fix: "Add critiques via ADD deltas",
    });
  }
  for (const c of critiques) {
    if (!c.attack || c.attack.trim().length === 0) {
      pushViolation(violations, {
        id: "EC-002",
        severity: "error",
        message: `${c.id} is missing attack`,
        fix: "Add an attack field describing how the framing could be wrong",
      });
    }
    if (!c.evidence || c.evidence.trim().length === 0) {
      pushViolation(violations, {
        id: "WC-002",
        severity: "warning",
        message: `${c.id} is missing evidence`,
        fix: "Add evidence describing what would confirm the critique",
      });
    }
    if (!c.current_status || c.current_status.trim().length === 0) {
      pushViolation(violations, {
        id: "IC-001",
        severity: "info",
        message: `${c.id} is missing current status`,
        fix: "Add current_status describing how seriously to take this critique",
      });
    }
  }
  if (!critiques.some((c) => c.real_third_alternative === true)) {
    pushViolation(violations, {
      id: "WC-001",
      severity: "warning",
      message: "No critique marked as a real third alternative",
      fix: "Mark at least one critique with real_third_alternative: true",
    });
  }

  // --------------------------------------------------------------------------
  // Provenance & Citation (P) - from artifact_linter_spec_v0.1.md
  // --------------------------------------------------------------------------

  // Max section in transcript (Brenner's Web of Stories has 236 sections)
  const MAX_TRANSCRIPT_SECTION = 236;

  /**
   * Extract §n anchor references from an anchors array.
   * Returns array of section numbers referenced.
   */
  function extractAnchorRefs(anchors: string[] | undefined): number[] {
    if (!Array.isArray(anchors)) return [];
    const refs: number[] = [];
    for (const anchor of anchors) {
      // Match §42, §42-45 (range), or multiple like §42, §57
      const matches = anchor.matchAll(/§(\d+)(?:-(\d+))?/g);
      for (const match of matches) {
        const start = Number.parseInt(match[1], 10);
        const end = match[2] ? Number.parseInt(match[2], 10) : start;
        for (let i = start; i <= end; i++) {
          refs.push(i);
        }
      }
    }
    return refs;
  }

  /**
   * Check if anchors contain [inference] without source context.
   */
  function isPureInference(anchors: string[] | undefined): boolean {
    if (!Array.isArray(anchors)) return false;
    return anchors.some((a) => {
      const lower = a.toLowerCase();
      return (
        lower === "inference" ||
        lower === "[inference]" ||
        (lower.includes("[inference]") && !lower.includes("from"))
      );
    });
  }

  // Collect all anchor references across the artifact for EP-P01
  const allAnchors: Array<{ section: string; id: string; refs: number[] }> = [];

  // Research thread anchors
  if (rt) {
    allAnchors.push({ section: "research_thread", id: "RT", refs: extractAnchorRefs(rt.anchors) });
  }

  // Hypothesis anchors
  for (const h of hypotheses) {
    allAnchors.push({ section: "hypothesis_slate", id: h.id, refs: extractAnchorRefs(h.anchors) });

    // WP-P02: Pure inference without source context
    if (isPureInference(h.anchors)) {
      pushViolation(violations, {
        id: "WP-P02",
        severity: "warning",
        message: `${h.id} uses [inference] without source context`,
        fix: "Use [inference] from §n to cite the evidence the inference is based on",
      });
    }
  }

  // EP-P01: Validate all anchor references are in range
  for (const { id, refs } of allAnchors) {
    for (const ref of refs) {
      if (ref < 1 || ref > MAX_TRANSCRIPT_SECTION) {
        pushViolation(violations, {
          id: "EP-P01",
          severity: "error",
          message: `${id} references §${ref} which is out of range (valid: 1-${MAX_TRANSCRIPT_SECTION})`,
          fix: `Update anchor to reference a valid transcript section (1-${MAX_TRANSCRIPT_SECTION})`,
        });
      }
    }
  }

  // IP-P02: Potency checks should cite §50 (Brenner's chastity principle)
  for (const t of tests) {
    if (t.potency_check && t.potency_check.trim().length > 0) {
      if (!t.potency_check.includes("§50") && !t.potency_check.includes("§ 50")) {
        pushViolation(violations, {
          id: "IP-P02",
          severity: "info",
          message: `${t.id} potency check doesn't cite §50 (Brenner's chastity principle)`,
          fix: "Consider referencing §50 for the canonical statement of the chastity principle",
        });
      }
    }
  }

  const sorted = [...violations].sort((a, b) => {
    const sr = severityRank(a.severity) - severityRank(b.severity);
    if (sr !== 0) return sr;
    return a.id.localeCompare(b.id);
  });

  const summary = {
    errors: sorted.filter((v) => v.severity === "error").length,
    warnings: sorted.filter((v) => v.severity === "warning").length,
    info: sorted.filter((v) => v.severity === "info").length,
  };

  return {
    valid: summary.errors === 0,
    summary,
    violations: sorted,
  };
}

// ============================================================================
// Lint Report Formatters
// ============================================================================

/**
 * Format a lint report as human-readable text.
 *
 * Example output:
 * ```
 * Artifact Linter Report
 * ======================
 * Artifact: RS-20251230-cell-fate
 * Status: INVALID (3 errors, 5 warnings, 2 info)
 *
 * Errors (must fix):
 *   EH-003: Third alternative not explicitly labeled
 *   ...
 * ```
 */
export function formatLintReportHuman(report: LintReport, artifactName?: string): string {
  const lines: string[] = [];
  const name = artifactName ?? "artifact";

  lines.push("Artifact Linter Report");
  lines.push("======================");
  lines.push(`Artifact: ${name}`);
  lines.push(
    `Status: ${report.valid ? "VALID" : "INVALID"} (${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.info} info)`,
  );
  lines.push("");

  if (report.summary.errors > 0) {
    lines.push("Errors (must fix):");
    for (const v of report.violations.filter((v) => v.severity === "error")) {
      lines.push(`  ${v.id}: ${v.message}`);
      if (v.fix) lines.push(`    → ${v.fix}`);
    }
    lines.push("");
  }

  if (report.summary.warnings > 0) {
    lines.push("Warnings (should fix):");
    for (const v of report.violations.filter((v) => v.severity === "warning")) {
      lines.push(`  ${v.id}: ${v.message}`);
      if (v.fix) lines.push(`    → ${v.fix}`);
    }
    lines.push("");
  }

  if (report.summary.info > 0) {
    lines.push("Info:");
    for (const v of report.violations.filter((v) => v.severity === "info")) {
      lines.push(`  ${v.id}: ${v.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a lint report as JSON.
 *
 * Returns a deterministic, pretty-printed JSON string.
 */
export function formatLintReportJson(report: LintReport, artifactName?: string): string {
  const output = {
    artifact: artifactName ?? "artifact",
    valid: report.valid,
    summary: report.summary,
    violations: report.violations,
  };
  return JSON.stringify(output, null, 2);
}
