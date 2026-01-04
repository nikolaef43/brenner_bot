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
