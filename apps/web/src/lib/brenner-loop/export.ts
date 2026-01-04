/**
 * Session Export / Import Utilities
 *
 * Provides JSON and Markdown export for Brenner Loop sessions and
 * a safe import path with checksum validation and normalization.
 *
 * @see brenner_bot-1v26.4 (bead)
 */

import type { Session } from "./types";
import { CURRENT_SESSION_VERSION, createSession, isSession } from "./types";

// ============================================================================
// Types
// ============================================================================

export type SessionExportFormat = "brenner-session-v1";

export interface SessionExport {
  format: SessionExportFormat;
  exportedAt: string;
  session: Session;
  checksum: string;
}

export interface SessionImportResult {
  session: Session;
  warnings: string[];
}

// ============================================================================
// Public API
// ============================================================================

export async function exportSession(session: Session, format: "json" | "markdown"): Promise<Blob> {
  if (format === "markdown") {
    const markdown = renderSessionMarkdown(session);
    return new Blob([markdown], { type: "text/markdown" });
  }

  const checksum = await checksumForSession(session);
  const payload: SessionExport = {
    format: "brenner-session-v1",
    exportedAt: new Date().toISOString(),
    session,
    checksum,
  };

  const json = JSON.stringify(payload, null, 2);
  return new Blob([json], { type: "application/json" });
}

export async function importSession(file: File): Promise<SessionImportResult> {
  const warnings: string[] = [];

  if (!file) {
    throw new Error("No file provided for session import.");
  }

  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Session import failed: file is not valid JSON.");
  }

  if (!isRecord(parsed)) {
    throw new Error("Session import failed: malformed export payload.");
  }

  const format = typeof parsed.format === "string" ? parsed.format : "";
  if (format !== "brenner-session-v1") {
    warnings.push(
      `Unexpected export format "${format || "missing"}"; attempting to import as v1.`
    );
  }

  const rawSession = parsed.session;
  if (!isSession(rawSession)) {
    throw new Error("Session import failed: missing or invalid session payload.");
  }

  if (typeof parsed.exportedAt !== "string") {
    warnings.push("Export timestamp missing or invalid.");
  }

  const checksum = typeof parsed.checksum === "string" ? parsed.checksum : null;
  if (checksum) {
    const computed = await checksumForSession(rawSession);
    if (computed !== checksum) {
      warnings.push("Checksum mismatch; session data may be corrupted or modified.");
    }
  } else {
    warnings.push("Checksum missing; integrity could not be verified.");
  }

  const normalized = normalizeSession(rawSession, warnings);

  if (normalized._version > CURRENT_SESSION_VERSION) {
    warnings.push(
      `Session schema version ${normalized._version} is newer than supported (${CURRENT_SESSION_VERSION}).`
    );
  }

  return { session: normalized, warnings };
}

// ============================================================================
// Normalization
// ============================================================================

function normalizeSession(raw: Session, warnings: string[]): Session {
  const base = createSession({
    id: raw.id,
    researchQuestion: raw.researchQuestion,
    theme: raw.theme,
    domain: raw.domain,
    createdBy: raw.createdBy,
  });

  const operatorApplications = isRecord(raw.operatorApplications)
    ? {
        levelSplit: Array.isArray(raw.operatorApplications.levelSplit)
          ? raw.operatorApplications.levelSplit
          : base.operatorApplications.levelSplit,
        exclusionTest: Array.isArray(raw.operatorApplications.exclusionTest)
          ? raw.operatorApplications.exclusionTest
          : base.operatorApplications.exclusionTest,
        objectTranspose: Array.isArray(raw.operatorApplications.objectTranspose)
          ? raw.operatorApplications.objectTranspose
          : base.operatorApplications.objectTranspose,
        scaleCheck: Array.isArray(raw.operatorApplications.scaleCheck)
          ? raw.operatorApplications.scaleCheck
          : base.operatorApplications.scaleCheck,
      }
    : base.operatorApplications;

  const normalized: Session = {
    ...base,
    ...raw,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : base.createdAt,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : base.updatedAt,
    alternativeHypothesisIds: coerceStringArray(raw.alternativeHypothesisIds, "alternativeHypothesisIds", warnings),
    archivedHypothesisIds: coerceStringArray(raw.archivedHypothesisIds, "archivedHypothesisIds", warnings),
    predictionIds: coerceStringArray(raw.predictionIds, "predictionIds", warnings),
    testIds: coerceStringArray(raw.testIds, "testIds", warnings),
    assumptionIds: coerceStringArray(raw.assumptionIds, "assumptionIds", warnings),
    pendingAgentRequests: Array.isArray(raw.pendingAgentRequests) ? raw.pendingAgentRequests : [],
    agentResponses: Array.isArray(raw.agentResponses) ? raw.agentResponses : [],
    evidenceLedger: Array.isArray(raw.evidenceLedger) ? raw.evidenceLedger : [],
    artifacts: Array.isArray(raw.artifacts) ? raw.artifacts : [],
    commits: Array.isArray(raw.commits) ? raw.commits : base.commits,
    operatorApplications,
    hypothesisCards: isRecord(raw.hypothesisCards) ? raw.hypothesisCards : base.hypothesisCards,
  };

  if (typeof normalized.headCommitId !== "string" || normalized.headCommitId.length === 0) {
    const lastCommit = normalized.commits[normalized.commits.length - 1];
    if (lastCommit?.id) {
      normalized.headCommitId = lastCommit.id;
      warnings.push("Missing headCommitId; derived from latest commit.");
    }
  }

  if (typeof raw.createdAt !== "string") {
    warnings.push("Missing createdAt; defaulted to current timestamp.");
  }
  if (typeof raw.updatedAt !== "string") {
    warnings.push("Missing updatedAt; defaulted to current timestamp.");
  }

  return normalized;
}

function coerceStringArray(value: unknown, label: string, warnings: string[]): string[] {
  if (!Array.isArray(value)) {
    warnings.push(`Missing ${label}; defaulted to empty.`);
    return [];
  }

  const filtered = value.filter((entry) => typeof entry === "string");
  if (filtered.length !== value.length) {
    warnings.push(`Filtered non-string entries from ${label}.`);
  }
  return filtered;
}

// ============================================================================
// Markdown Rendering
// ============================================================================

function renderSessionMarkdown(session: Session): string {
  const lines: string[] = [];

  lines.push(`# Brenner Loop Session ${session.id}`);
  lines.push("");
  lines.push("## Metadata");
  lines.push(`- ID: ${session.id}`);
  lines.push(`- Phase: ${session.phase}`);
  lines.push(`- Created: ${session.createdAt}`);
  lines.push(`- Updated: ${session.updatedAt}`);
  if (session.researchQuestion) lines.push(`- Research Question: ${session.researchQuestion}`);
  if (session.theme) lines.push(`- Theme: ${session.theme}`);
  if (session.domain) lines.push(`- Domain: ${session.domain}`);
  if (session.tags?.length) lines.push(`- Tags: ${session.tags.join(", ")}`);
  lines.push("");

  lines.push("## Hypotheses");
  const primary = session.hypothesisCards?.[session.primaryHypothesisId];
  if (primary) {
    lines.push("");
    lines.push("### Primary Hypothesis");
    lines.push(...renderHypothesis(primary as unknown as Record<string, unknown>, session.primaryHypothesisId));
  } else if (session.primaryHypothesisId) {
    lines.push("");
    lines.push(`- Primary Hypothesis ID: ${session.primaryHypothesisId}`);
  }

  if (session.alternativeHypothesisIds.length > 0) {
    lines.push("");
    lines.push("### Alternative Hypotheses");
    for (const id of session.alternativeHypothesisIds) {
      const card = session.hypothesisCards?.[id];
      lines.push("");
      lines.push(`#### ${id}`);
      if (card) {
        lines.push(...renderHypothesis(card as unknown as Record<string, unknown>, id));
      } else {
        lines.push(`- Missing hypothesis card for ${id}`);
      }
    }
  }

  lines.push("");
  lines.push("## Operator Applications");
  lines.push(`- Level Split: ${session.operatorApplications.levelSplit.length}`);
  lines.push(`- Exclusion Test: ${session.operatorApplications.exclusionTest.length}`);
  lines.push(`- Object Transpose: ${session.operatorApplications.objectTranspose.length}`);
  lines.push(`- Scale Check: ${session.operatorApplications.scaleCheck.length}`);

  if (session.operatorApplications.levelSplit.length > 0) {
    lines.push("");
    lines.push("### Level Split Results");
    session.operatorApplications.levelSplit.forEach((result, index) => {
      lines.push(`- [${index + 1}] ${result.appliedAt} by ${result.appliedBy}`);
      result.levels.forEach((level) => {
        lines.push(`  - ${level.name} (${level.levelType}): ${level.description}`);
      });
    });
  }

  if (session.operatorApplications.exclusionTest.length > 0) {
    lines.push("");
    lines.push("### Exclusion Test Results");
    session.operatorApplications.exclusionTest.forEach((result, index) => {
      lines.push(`- [${index + 1}] ${result.appliedAt} by ${result.appliedBy}`);
      result.designedTests.forEach((test) => {
        lines.push(`  - ${test.name}: ${test.procedure}`);
      });
    });
  }

  if (session.operatorApplications.objectTranspose.length > 0) {
    lines.push("");
    lines.push("### Object Transpose Results");
    session.operatorApplications.objectTranspose.forEach((result, index) => {
      lines.push(`- [${index + 1}] ${result.appliedAt} by ${result.appliedBy}`);
      lines.push(`  - Original: ${result.originalSystem}`);
      result.alternativeSystems.forEach((system) => {
        lines.push(`  - Alternative: ${system.name}`);
      });
    });
  }

  if (session.operatorApplications.scaleCheck.length > 0) {
    lines.push("");
    lines.push("### Scale Check Results");
    session.operatorApplications.scaleCheck.forEach((result, index) => {
      lines.push(`- [${index + 1}] ${result.appliedAt} by ${result.appliedBy}`);
      lines.push(`  - Plausible: ${result.plausible ? "yes" : "no"}`);
      result.calculations.forEach((calc) => {
        lines.push(`  - ${calc.name}: ${calc.result} ${calc.units} (${calc.implication})`);
      });
    });
  }

  if (session.evidenceLedger.length > 0) {
    lines.push("");
    lines.push("## Evidence Ledger");
    session.evidenceLedger.forEach((evidence) => {
      lines.push(`- ${evidence.recordedAt}: ${evidence.observation}`);
    });
  }

  if (session.notes) {
    lines.push("");
    lines.push("## Notes");
    lines.push(session.notes);
  }

  lines.push("");
  return lines.join("\n");
}

function renderHypothesis(card: Record<string, unknown>, fallbackId: string): string[] {
  const lines: string[] = [];
  const id = typeof card.id === "string" ? card.id : fallbackId;

  lines.push(`- ID: ${id}`);

  if (typeof card.statement === "string") {
    lines.push(`- Statement: ${card.statement}`);
  }
  if (typeof card.mechanism === "string") {
    lines.push(`- Mechanism: ${card.mechanism}`);
  }
  if (Array.isArray(card.domain)) {
    const domains = card.domain.filter((entry) => typeof entry === "string");
    if (domains.length > 0) lines.push(`- Domain: ${domains.join(", ")}`);
  }
  if (Array.isArray(card.predictionsIfTrue)) {
    const preds = card.predictionsIfTrue.filter((entry) => typeof entry === "string");
    if (preds.length > 0) lines.push(`- Predictions (true): ${preds.join(" | ")}`);
  }
  if (Array.isArray(card.predictionsIfFalse)) {
    const preds = card.predictionsIfFalse.filter((entry) => typeof entry === "string");
    if (preds.length > 0) lines.push(`- Predictions (false): ${preds.join(" | ")}`);
  }
  if (Array.isArray(card.impossibleIfTrue)) {
    const impossible = card.impossibleIfTrue.filter((entry) => typeof entry === "string");
    if (impossible.length > 0) lines.push(`- Falsifiers: ${impossible.join(" | ")}`);
  }

  return lines;
}

// ============================================================================
// Checksums
// ============================================================================

async function checksumForSession(session: Session): Promise<string> {
  const payload = stableStringify(session);
  return sha256Hex(payload);
}

async function sha256Hex(input: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(input);
    const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
    return bufferToHex(hash);
  }

  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(input).digest("hex");
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ============================================================================
// Stable Serialization
// ============================================================================

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }

  if (isRecord(value)) {
    const sortedEntries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    const result: Record<string, unknown> = {};
    for (const [key, entry] of sortedEntries) {
      result[key] = sortKeysDeep(entry);
    }
    return result;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
