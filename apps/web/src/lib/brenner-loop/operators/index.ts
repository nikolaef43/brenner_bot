/**
 * Brenner Loop Operators Module
 *
 * Exports all operator-related types, functions, and configurations.
 *
 * @module brenner-loop/operators
 */

// ============================================================================
// Framework (bead vw6p.1)
// ============================================================================

export type {
  // Core types
  OperatorType,
  OperatorMetadata,
  OperatorSessionStatus,
  OperatorInsight,

  // Step types
  OperatorStepConfig,
  StepValidation,
  OperatorStepState,

  // Session types
  OperatorSession,
  OperatorSessionAction,
} from "./framework";

export {
  // Type guards
  isOperatorType,

  // Metadata
  OPERATOR_METADATA,

  // Factory functions
  generateSessionId,
  generateInsightId,
  createStepStates,
  createSession,

  // State management
  sessionReducer,

  // Utility functions
  getCurrentStep,
  getCurrentStepConfig,
  canProceedToNext,
  canGoBack,
  canSkipCurrent,
  getProgress,
  getSessionSummary,

  // Serialization
  serializeSession,
  deserializeSession,
} from "./framework";

// ============================================================================
// Level Split Operator (bead vw6p.2)
// ============================================================================

export type {
  Level,
  LevelCategory,
  LevelCombination,
  SubHypothesis,
  LevelSplitResult,
} from "./level-split";

export {
  // Step configurations
  LEVEL_SPLIT_STEP_IDS,
  LEVEL_SPLIT_STEPS,

  // Level templates
  X_LEVEL_TEMPLATES,
  Y_LEVEL_TEMPLATES,

  // Generation functions
  generateXLevels,
  generateYLevels,
  generateCombinationMatrix,
  generateSubHypothesis,
  buildLevelSplitResult,

  // Quote references
  LEVEL_SPLIT_QUOTE_ANCHORS,
  LEVEL_SPLIT_FALLBACK_QUOTES,
} from "./level-split";

// ============================================================================
// Exclusion Test Operator (bead vw6p.3)
// ============================================================================

export type {
  ExclusionTestCategory,
  TestFeasibility,
  ExclusionTest,
  TestProtocol,
  ExclusionTestResult,
} from "./exclusion-test";

export {
  // Labels and constants
  EXCLUSION_TEST_CATEGORY_LABELS,
  CATEGORY_DEFAULT_POWER,
  FEASIBILITY_LABELS,

  // Step configurations
  EXCLUSION_TEST_STEP_IDS,
  EXCLUSION_TEST_STEPS,

  // Generation functions
  generateTestId,
  generateExclusionTests,
  createCustomTest,
  generateProtocolTemplate,
  generateProtocols,
  buildExclusionTestResult,

  // Display utilities
  getDiscriminativePowerStars,
  getDiscriminativePowerLabel,
  getFeasibilityColor,
  getCategoryColor,

  // Quote references
  EXCLUSION_TEST_QUOTE_ANCHORS,
  EXCLUSION_TEST_FALLBACK_QUOTES,
} from "./exclusion-test";

// ============================================================================
// Object Transpose Operator (bead vw6p.4)
// ============================================================================

export type {
  AlternativeType,
  AlternativeExplanation,
  DiscriminatingTest,
  PlausibilityRating,
  ObjectTransposeResult,
} from "./object-transpose";

export {
  // Step configurations
  OBJECT_TRANSPOSE_STEP_IDS,
  OBJECT_TRANSPOSE_STEPS,

  // Third variable templates
  THIRD_VARIABLE_TEMPLATES,

  // Generation functions
  generateReverseCausation,
  generateThirdVariables,
  generateSelectionEffect,
  generateBidirectional,
  generateCoincidence,
  generateAlternatives,
  generateDiscriminatingTests,
  buildObjectTransposeResult,

  // Quote references
  OBJECT_TRANSPOSE_QUOTE_ANCHORS,
  OBJECT_TRANSPOSE_FALLBACK_QUOTES,
} from "./object-transpose";

// ============================================================================
// Scale Check Operator (bead vw6p.5)
// ============================================================================

export type {
  EffectSizeType,
  EffectDirection,
  EffectMagnitude,
  EffectSizeSpec,
  DomainContext,
  TypicalEffect,
  Benchmark,
  ContextComparison,
  MeasurementAssessment,
  PracticalSignificance,
  PopulationConsideration,
  ScaleCheckResult,
} from "./scale-check";

export {
  // Step configurations
  SCALE_CHECK_STEP_IDS,
  SCALE_CHECK_STEPS,

  // Effect size utilities
  EFFECT_SIZE_CONVENTIONS,
  estimateToValue,
  classifyEffectSize,
  varianceExplained,
  approximateSampleSize,

  // Domain context
  DOMAIN_CONTEXTS,
  getDomainContext,

  // Generation functions
  generateContextComparison,
  generatePopulationConsiderations,
  buildScaleCheckResult,

  // Quote references
  SCALE_CHECK_QUOTE_ANCHORS,
  SCALE_CHECK_FALLBACK_QUOTES,
} from "./scale-check";

// ============================================================================
// Operator Documentation (bead yh1c)
// ============================================================================

export type {
  OperatorDocumentation,
  OperatorStepTip,
} from "./docs";

export {
  // Documentation by operator
  LEVEL_SPLIT_DOCS,
  EXCLUSION_TEST_DOCS,
  OBJECT_TRANSPOSE_DOCS,
  SCALE_CHECK_DOCS,

  // Documentation index
  OPERATOR_DOCUMENTATION,

  // Utility functions
  getOperatorDocumentation,
  getStepTip,
  getCommonMistakes,
  getSuccessCriteria,
} from "./docs";
