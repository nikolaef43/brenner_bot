/**
 * HypothesisCard Interface & Validation
 *
 * Core data model for the Brenner Loop hypothesis engine.
 * This represents hypotheses as living, evolving structures with explicit
 * discriminative predictions and falsification conditions.
 *
 * Key Brenner insight operationalized: A hypothesis is only as good as
 * its falsifiability. The `impossibleIfTrue` field forces users to articulate
 * what would disprove their hypothesis.
 *
 * @see brenner_bot-an1n.1 (bead)
 * @see brenner_bot-an1n (parent epic: Hypothesis Engine)
 * @module brenner-loop/hypothesis
 */

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Identified confounding variable or alternative explanation.
 *
 * Confounds are potential alternative explanations that could explain
 * the same observations without the hypothesis being true. Different
 * domains have different common confounds (e.g., selection bias in
 * epidemiology, demand characteristics in psychology).
 */
export interface IdentifiedConfound {
  /** Unique identifier for this confound (within the hypothesis) */
  id: string;

  /** Short name for the confound (e.g., "Selection Bias", "Reverse Causation") */
  name: string;

  /** Detailed description of the confounding mechanism */
  description: string;

  /**
   * Estimated likelihood that this confound explains the observations.
   * Range: 0.0 (impossible) to 1.0 (certain).
   */
  likelihood: number;

  /** Domain where this confound is most relevant (e.g., "epidemiology", "psychology") */
  domain: string;

  /**
   * Whether this confound has been addressed (e.g., through study design
   * or additional evidence). Addressed confounds are tracked but not weighted.
   */
  addressed?: boolean;

  /** How the confound was addressed (if applicable) */
  addressedHow?: string;

  /** When the confound was addressed (if applicable) */
  addressedAt?: Date;
}

/**
 * The primary hypothesis unit for the Brenner Loop system.
 *
 * Each hypothesis is a card with:
 * - A core statement and proposed mechanism
 * - Explicit discriminative structure (predictions if true/false, falsification conditions)
 * - Identified weaknesses (confounds, assumptions)
 * - Version tracking for evolution
 * - Confidence tracking for Bayesian updates
 *
 * Design principles:
 * 1. **Immutable Versions**: Changes create new versions with links to parents
 * 2. **Explicit Falsifiability**: `impossibleIfTrue` is required (forces testability)
 * 3. **Domain-Aware**: Track which fields this hypothesis touches
 * 4. **Evolution-Tracked**: Every change has a reason
 */
export interface HypothesisCard {
  /**
   * Stable unique identifier.
   * Format: `HC-{session_id}-{sequence}-v{version}`
   * Example: `HC-RS20260104-001-v1`
   */
  id: string;

  /**
   * Version number, starting at 1.
   * Incremented each time the hypothesis evolves.
   */
  version: number;

  // === Core Statement ===

  /**
   * The hypothesis statement itself.
   * Should be specific, falsifiable, and testable.
   * Avoid vague claims like "X causes Y" without specificity.
   *
   * Length: 10-1000 characters
   */
  statement: string;

  /**
   * The proposed causal mechanism.
   * HOW would this work? What's the causal pathway?
   * Should avoid level conflation (program vs interpreter).
   *
   * Length: 10-500 characters
   */
  mechanism: string;

  /**
   * Research domains this hypothesis touches.
   * Examples: ["psychology", "epidemiology"], ["neuroscience", "computation"]
   */
  domain: string[];

  // === Discriminative Structure (THE KEY INNOVATION) ===

  /**
   * Predictions that MUST be true if the hypothesis is correct.
   * These are positive predictions: "If H is true, we'd observe X, Y, Z."
   *
   * At least 1 entry required.
   */
  predictionsIfTrue: string[];

  /**
   * Predictions that would be true if the hypothesis is WRONG.
   * Helps identify what to look for to falsify.
   *
   * At least 1 entry recommended for quality.
   */
  predictionsIfFalse: string[];

  /**
   * Observations that would DEFINITIVELY FALSIFY the hypothesis.
   * Not just weaken it, but rule it out entirely.
   *
   * This is the core Brenner insight: if you can't specify what would
   * prove you wrong, your hypothesis isn't testable yet.
   *
   * At least 1 entry required (enforced by validation).
   */
  impossibleIfTrue: string[];

  // === Identified Weaknesses ===

  /**
   * Known confounding variables or alternative explanations.
   * Each confound has a likelihood estimate and can be marked as addressed.
   */
  confounds: IdentifiedConfound[];

  /**
   * Background assumptions the hypothesis depends on.
   * These are load-bearing assumptions that, if false, would invalidate the hypothesis.
   * Examples: "Participants understood the survey questions", "Measurement is accurate"
   */
  assumptions: string[];

  // === Tracking ===

  /**
   * Current confidence level (0-100).
   * Updated via Bayesian reasoning based on evidence.
   *
   * Interpretation:
   * - 0-20: Very speculative
   * - 21-40: Interesting but untested
   * - 41-60: Reasonable, some support
   * - 61-80: Strong support, passed discriminative tests
   * - 81-100: Near-certain (rare in science)
   */
  confidence: number;

  /**
   * ID of the parent version this evolved from (if applicable).
   * Links to the previous version in the evolution graph.
   */
  parentVersion?: string;

  /**
   * Why this hypothesis evolved from its parent.
   * Examples: "Refined mechanism after Scale Check", "Split by Level Split operator"
   */
  evolutionReason?: string;

  // === Metadata ===

  /** When this version was created */
  createdAt: Date;

  /** When this version was last updated (metadata only; content is immutable) */
  updatedAt: Date;

  /** Agent or user who created this version */
  createdBy?: string;

  /** Session this hypothesis belongs to */
  sessionId?: string;

  /** Free-form tags for categorization */
  tags?: string[];

  /** Additional notes */
  notes?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of validating a HypothesisCard.
 */
export interface ValidationResult {
  /** Whether the card is valid */
  valid: boolean;

  /** List of validation errors (if any) */
  errors: ValidationError[];

  /** List of validation warnings (non-blocking) */
  warnings: ValidationWarning[];
}

/**
 * A validation error that prevents the card from being accepted.
 */
export interface ValidationError {
  /** Field that failed validation */
  field: keyof HypothesisCard | string;

  /** Error message */
  message: string;

  /** Error code for programmatic handling */
  code: ValidationErrorCode;
}

/**
 * A validation warning that doesn't prevent acceptance but suggests improvement.
 */
export interface ValidationWarning {
  /** Field with the warning */
  field: keyof HypothesisCard | string;

  /** Warning message */
  message: string;

  /** Warning code */
  code: ValidationWarningCode;
}

/**
 * Error codes for validation failures.
 */
export type ValidationErrorCode =
  | "MISSING_REQUIRED"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "INVALID_RANGE"
  | "EMPTY_ARRAY"
  | "INVALID_FORMAT"
  | "INVALID_TYPE"
  | "CONFOUND_INVALID";

/**
 * Warning codes for validation suggestions.
 */
export type ValidationWarningCode =
  | "NO_PREDICTIONS_IF_FALSE"
  | "LOW_CONFOUND_COUNT"
  | "NO_ASSUMPTIONS"
  | "NO_DOMAIN"
  | "HIGH_CONFIDENCE_NO_TESTS"
  | "GENERIC_MECHANISM";

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a HypothesisCard for completeness and correctness.
 *
 * Validation rules:
 * - statement: required, 10-1000 chars
 * - mechanism: required, 10-500 chars
 * - predictionsIfTrue: at least 1 entry
 * - impossibleIfTrue: at least 1 entry (enforces falsifiability)
 * - confidence: 0-100
 * - confounds: each must have valid structure
 *
 * @param card - The HypothesisCard to validate
 * @returns ValidationResult with errors and warnings
 */
export function validateHypothesisCard(card: HypothesisCard): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // === Required Fields ===

  if (!card.statement || card.statement.trim().length === 0) {
    errors.push({
      field: "statement",
      message: "Statement is required",
      code: "MISSING_REQUIRED",
    });
  } else if (card.statement.length < 10) {
    errors.push({
      field: "statement",
      message: `Statement must be at least 10 characters (got ${card.statement.length})`,
      code: "TOO_SHORT",
    });
  } else if (card.statement.length > 1000) {
    errors.push({
      field: "statement",
      message: `Statement must be at most 1000 characters (got ${card.statement.length})`,
      code: "TOO_LONG",
    });
  }

  if (!card.mechanism || card.mechanism.trim().length === 0) {
    errors.push({
      field: "mechanism",
      message: "Mechanism is required",
      code: "MISSING_REQUIRED",
    });
  } else if (card.mechanism.length < 10) {
    errors.push({
      field: "mechanism",
      message: `Mechanism must be at least 10 characters (got ${card.mechanism.length})`,
      code: "TOO_SHORT",
    });
  } else if (card.mechanism.length > 500) {
    errors.push({
      field: "mechanism",
      message: `Mechanism must be at most 500 characters (got ${card.mechanism.length})`,
      code: "TOO_LONG",
    });
  }

  // === Discriminative Structure ===

  if (!card.predictionsIfTrue || card.predictionsIfTrue.length === 0) {
    errors.push({
      field: "predictionsIfTrue",
      message: "At least one prediction if true is required",
      code: "EMPTY_ARRAY",
    });
  }

  if (!card.impossibleIfTrue || card.impossibleIfTrue.length === 0) {
    errors.push({
      field: "impossibleIfTrue",
      message:
        "At least one falsification condition is required. If you can't specify what would prove you wrong, your hypothesis isn't testable yet.",
      code: "EMPTY_ARRAY",
    });
  }

  // Warning for missing predictionsIfFalse (not required but recommended)
  if (!card.predictionsIfFalse || card.predictionsIfFalse.length === 0) {
    warnings.push({
      field: "predictionsIfFalse",
      message: "Consider adding predictions for when the hypothesis is wrong",
      code: "NO_PREDICTIONS_IF_FALSE",
    });
  }

  // === Confidence ===

  if (typeof card.confidence !== "number") {
    errors.push({
      field: "confidence",
      message: "Confidence must be a number",
      code: "INVALID_TYPE",
    });
  } else if (card.confidence < 0 || card.confidence > 100) {
    errors.push({
      field: "confidence",
      message: `Confidence must be between 0 and 100 (got ${card.confidence})`,
      code: "INVALID_RANGE",
    });
  }

  // === Version ===

  if (typeof card.version !== "number" || card.version < 1) {
    errors.push({
      field: "version",
      message: "Version must be a positive integer",
      code: "INVALID_RANGE",
    });
  }

  // === Confounds ===

  if (card.confounds && card.confounds.length > 0) {
    for (let i = 0; i < card.confounds.length; i++) {
      const confound = card.confounds[i];
      const prefix = `confounds[${i}]`;

      if (!confound.id) {
        errors.push({
          field: `${prefix}.id`,
          message: "Confound ID is required",
          code: "CONFOUND_INVALID",
        });
      }

      if (!confound.name || confound.name.trim().length === 0) {
        errors.push({
          field: `${prefix}.name`,
          message: "Confound name is required",
          code: "CONFOUND_INVALID",
        });
      }

      if (!confound.description || confound.description.trim().length === 0) {
        errors.push({
          field: `${prefix}.description`,
          message: "Confound description is required",
          code: "CONFOUND_INVALID",
        });
      }

      if (
        typeof confound.likelihood !== "number" ||
        confound.likelihood < 0 ||
        confound.likelihood > 1
      ) {
        errors.push({
          field: `${prefix}.likelihood`,
          message: "Confound likelihood must be between 0 and 1",
          code: "CONFOUND_INVALID",
        });
      }

      if (!confound.domain || confound.domain.trim().length === 0) {
        errors.push({
          field: `${prefix}.domain`,
          message: "Confound domain is required",
          code: "CONFOUND_INVALID",
        });
      }
    }
  } else {
    warnings.push({
      field: "confounds",
      message: "Consider identifying potential confounding variables",
      code: "LOW_CONFOUND_COUNT",
    });
  }

  // === Warnings for Quality ===

  if (!card.domain || card.domain.length === 0) {
    warnings.push({
      field: "domain",
      message: "Consider specifying which domains this hypothesis touches",
      code: "NO_DOMAIN",
    });
  }

  if (!card.assumptions || card.assumptions.length === 0) {
    warnings.push({
      field: "assumptions",
      message: "Consider listing the assumptions this hypothesis depends on",
      code: "NO_ASSUMPTIONS",
    });
  }

  // Check for generic mechanism patterns
  const genericMechanismPatterns = [
    /^causes?\s/i,
    /^leads?\sto\s/i,
    /^results?\sin\s/i,
  ];
  if (
    card.mechanism &&
    genericMechanismPatterns.some((p) => p.test(card.mechanism))
  ) {
    warnings.push({
      field: "mechanism",
      message:
        "Mechanism appears generic. Consider specifying the causal pathway in more detail.",
      code: "GENERIC_MECHANISM",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an IdentifiedConfound for completeness.
 *
 * @param confound - The confound to validate
 * @returns ValidationResult
 */
export function validateConfound(confound: IdentifiedConfound): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!confound.id || confound.id.trim().length === 0) {
    errors.push({
      field: "id",
      message: "Confound ID is required",
      code: "MISSING_REQUIRED",
    });
  }

  if (!confound.name || confound.name.trim().length === 0) {
    errors.push({
      field: "name",
      message: "Confound name is required",
      code: "MISSING_REQUIRED",
    });
  }

  if (!confound.description || confound.description.trim().length === 0) {
    errors.push({
      field: "description",
      message: "Confound description is required",
      code: "MISSING_REQUIRED",
    });
  }

  if (typeof confound.likelihood !== "number") {
    errors.push({
      field: "likelihood",
      message: "Likelihood must be a number",
      code: "INVALID_TYPE",
    });
  } else if (confound.likelihood < 0 || confound.likelihood > 1) {
    errors.push({
      field: "likelihood",
      message: `Likelihood must be between 0 and 1 (got ${confound.likelihood})`,
      code: "INVALID_RANGE",
    });
  }

  if (!confound.domain || confound.domain.trim().length === 0) {
    errors.push({
      field: "domain",
      message: "Domain is required",
      code: "MISSING_REQUIRED",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an unknown value is a valid HypothesisCard.
 *
 * @param obj - The value to check
 * @returns True if obj is a HypothesisCard
 */
export function isHypothesisCard(obj: unknown): obj is HypothesisCard {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const card = obj as Record<string, unknown>;

  // Check required fields exist with correct types
  if (typeof card.id !== "string") return false;
  if (typeof card.version !== "number") return false;
  if (typeof card.statement !== "string") return false;
  if (typeof card.mechanism !== "string") return false;
  if (!Array.isArray(card.domain)) return false;
  if (!Array.isArray(card.predictionsIfTrue)) return false;
  if (!Array.isArray(card.predictionsIfFalse)) return false;
  if (!Array.isArray(card.impossibleIfTrue)) return false;
  if (!Array.isArray(card.confounds)) return false;
  if (!Array.isArray(card.assumptions)) return false;
  if (typeof card.confidence !== "number") return false;
  if (!(card.createdAt instanceof Date)) return false;
  if (!(card.updatedAt instanceof Date)) return false;

  // Validate ranges
  if (card.confidence < 0 || card.confidence > 100) return false;
  if (card.version < 1) return false;

  return true;
}

/**
 * Type guard to check if an unknown value is a valid IdentifiedConfound.
 *
 * @param obj - The value to check
 * @returns True if obj is an IdentifiedConfound
 */
export function isIdentifiedConfound(obj: unknown): obj is IdentifiedConfound {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const confound = obj as Record<string, unknown>;

  if (typeof confound.id !== "string") return false;
  if (typeof confound.name !== "string") return false;
  if (typeof confound.description !== "string") return false;
  if (typeof confound.likelihood !== "number") return false;
  if (typeof confound.domain !== "string") return false;

  // Validate range
  if (confound.likelihood < 0 || confound.likelihood > 1) return false;

  return true;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Generate a new HypothesisCard ID.
 *
 * @param sessionId - The session this hypothesis belongs to
 * @param sequence - The sequence number within the session
 * @param version - The version number (default 1)
 * @returns A formatted ID string
 */
export function generateHypothesisCardId(
  sessionId: string,
  sequence: number,
  version: number = 1
): string {
  const paddedSeq = sequence.toString().padStart(3, "0");
  return `HC-${sessionId}-${paddedSeq}-v${version}`;
}

/**
 * Generate a new confound ID.
 *
 * @param hypothesisId - The parent hypothesis ID
 * @param sequence - The sequence number within the hypothesis
 * @returns A formatted confound ID
 */
export function generateConfoundId(
  hypothesisId: string,
  sequence: number
): string {
  return `${hypothesisId}-CF${sequence.toString().padStart(2, "0")}`;
}

/**
 * Create a new HypothesisCard with required fields and sensible defaults.
 *
 * @param input - The input fields for the new hypothesis
 * @returns A fully populated HypothesisCard
 * @throws Error if validation fails
 */
export function createHypothesisCard(input: {
  id: string;
  statement: string;
  mechanism: string;
  domain?: string[];
  predictionsIfTrue: string[];
  predictionsIfFalse?: string[];
  impossibleIfTrue: string[];
  confounds?: IdentifiedConfound[];
  assumptions?: string[];
  confidence?: number;
  parentVersion?: string;
  evolutionReason?: string;
  createdBy?: string;
  sessionId?: string;
  tags?: string[];
  notes?: string;
}): HypothesisCard {
  const now = new Date();

  const card: HypothesisCard = {
    id: input.id,
    version: 1,
    statement: input.statement,
    mechanism: input.mechanism,
    domain: input.domain ?? [],
    predictionsIfTrue: input.predictionsIfTrue,
    predictionsIfFalse: input.predictionsIfFalse ?? [],
    impossibleIfTrue: input.impossibleIfTrue,
    confounds: input.confounds ?? [],
    assumptions: input.assumptions ?? [],
    confidence: input.confidence ?? 50,
    parentVersion: input.parentVersion,
    evolutionReason: input.evolutionReason,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
    sessionId: input.sessionId,
    tags: input.tags,
    notes: input.notes,
  };

  // Validate the created card
  const result = validateHypothesisCard(card);
  if (!result.valid) {
    const errorMessages = result.errors.map((e) => `${e.field}: ${e.message}`);
    throw new Error(
      `Invalid HypothesisCard: ${errorMessages.join("; ")}`
    );
  }

  return card;
}

/**
 * Evolve a HypothesisCard to a new version.
 *
 * Creates a new card with incremented version, linked to the parent,
 * and the specified changes applied.
 *
 * @param current - The current hypothesis card
 * @param changes - Partial changes to apply
 * @param reason - Why the hypothesis is evolving
 * @param createdBy - Who is creating this new version
 * @returns A new HypothesisCard with incremented version
 */
export function evolveHypothesisCard(
  current: HypothesisCard,
  changes: Partial<Omit<HypothesisCard, "id" | "version" | "parentVersion" | "createdAt">>,
  reason: string,
  createdBy?: string
): HypothesisCard {
  const now = new Date();

  // Parse the current ID to get base and increment version
  const idParts = current.id.match(/^(HC-.*-\d{3})-v(\d+)$/);
  if (!idParts) {
    throw new Error(`Invalid hypothesis ID format: ${current.id}`);
  }

  const baseId = idParts[1];
  const newVersion = current.version + 1;
  const newId = `${baseId}-v${newVersion}`;

  const evolved: HypothesisCard = {
    ...current,
    ...changes,
    id: newId,
    version: newVersion,
    parentVersion: current.id,
    evolutionReason: reason,
    createdAt: now,
    updatedAt: now,
    createdBy: createdBy ?? current.createdBy,
  };

  // Validate the evolved card
  const result = validateHypothesisCard(evolved);
  if (!result.valid) {
    const errorMessages = result.errors.map((e) => `${e.field}: ${e.message}`);
    throw new Error(
      `Invalid evolved HypothesisCard: ${errorMessages.join("; ")}`
    );
  }

  return evolved;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate a falsifiability score based on the quality of impossibleIfTrue entries.
 *
 * Higher scores indicate better-defined falsification conditions.
 *
 * @param card - The hypothesis card to score
 * @returns A score from 0-100
 */
export function calculateFalsifiabilityScore(card: HypothesisCard): number {
  if (!card.impossibleIfTrue || card.impossibleIfTrue.length === 0) {
    return 0;
  }

  let score = 0;

  // Base score for having any falsification conditions
  score += 20;

  // Bonus for multiple conditions
  score += Math.min(card.impossibleIfTrue.length * 10, 30);

  // Bonus for specificity (longer = more specific, up to a point)
  const avgLength =
    card.impossibleIfTrue.reduce((sum, c) => sum + c.length, 0) /
    card.impossibleIfTrue.length;
  if (avgLength > 50) score += 20;
  else if (avgLength > 25) score += 10;

  // Bonus for having predictionsIfFalse as well
  if (card.predictionsIfFalse && card.predictionsIfFalse.length > 0) {
    score += 20;
  }

  // Penalty for very high confidence without many falsification conditions
  if (card.confidence > 80 && card.impossibleIfTrue.length < 2) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate a specificity score based on how precise the predictions are.
 *
 * @param card - The hypothesis card to score
 * @returns A score from 0-100
 */
export function calculateSpecificityScore(card: HypothesisCard): number {
  let score = 0;

  // Score based on predictions if true
  if (card.predictionsIfTrue.length > 0) {
    score += 20;
    score += Math.min(card.predictionsIfTrue.length * 5, 20);
  }

  // Score based on mechanism detail
  if (card.mechanism.length > 100) score += 20;
  else if (card.mechanism.length > 50) score += 10;

  // Score based on domain specificity
  if (card.domain.length > 0) score += 10;
  if (card.domain.length > 1) score += 10;

  // Score based on confound identification
  if (card.confounds.length > 0) {
    score += 10;
    score += Math.min(card.confounds.length * 5, 10);
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get a human-readable interpretation of the confidence level.
 *
 * @param confidence - The confidence value (0-100)
 * @returns A string interpretation
 */
export function interpretConfidence(confidence: number): string {
  if (confidence < 20) return "Very speculative";
  if (confidence < 40) return "Interesting but untested";
  if (confidence < 60) return "Reasonable, some support";
  if (confidence < 80) return "Strong support";
  return "Near-certain";
}
