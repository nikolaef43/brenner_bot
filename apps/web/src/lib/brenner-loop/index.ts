/**
 * Brenner Loop Module
 *
 * Core data models and utilities for the Brenner Loop hypothesis engine.
 * This module provides the foundational types for discriminative hypothesis testing.
 *
 * @module brenner-loop
 * @see brenner_bot-1v26.1 (Session Data Model)
 * @see brenner_bot-an1n.1 (HypothesisCard Interface)
 */

// ============================================================================
// Hypothesis Engine (bead an1n.1)
// ============================================================================

export {
  // Core interfaces
  type HypothesisCard,
  type IdentifiedConfound,

  // Validation types
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type ValidationErrorCode,
  type ValidationWarningCode,

  // Validation functions
  validateHypothesisCard,
  validateConfound,

  // Type guards
  isHypothesisCard,
  isIdentifiedConfound,

  // Factory functions
  generateHypothesisCardId,
  generateConfoundId,
  createHypothesisCard,
  evolveHypothesisCard,

  // Utility functions
  calculateFalsifiabilityScore,
  calculateSpecificityScore,
  interpretConfidence,
} from "./hypothesis";

// ============================================================================
// Session Data Model (bead 1v26.1)
// ============================================================================

export type {
  // Session phases
  SessionPhase,
  SimplifiedPhase,

  // Operator result types
  LevelSplitResult,
  LevelIdentification,
  ExclusionTestResult,
  DesignedTest,
  RejectedTest,
  ObjectTransposeResult,
  AlternativeSystem,
  ScaleCheckResult,
  ScaleCalculation,

  // Agent types
  AgentRole,
  AgentResponse,
  AgentDelta,
  PendingAgentRequest,
  SynthesisResult,
  Disagreement,
  AgentContribution,

  // Evidence types
  EvidenceEntry,

  // Artifact types
  ArtifactType,
  ResearchArtifact,

  // Session versioning types
  CommitTrigger,
  SessionCommit,
  SessionSnapshot,

  // Evolution types
  HypothesisEvolution,
  ConfidenceUpdate,

  // Main session type
  Session,
} from "./types";

export {
  // Phase utilities
  toSimplifiedPhase,
  isValidTransition,

  // Type guards
  isSessionPhase,
  isAgentRole,
  isSession,

  // Factory functions
  createSession,
  generateSessionId,

  // Constants
  CURRENT_SESSION_VERSION,
} from "./types";

// ============================================================================
// Storage Layer (bead 1v26.2)
// ============================================================================

export type {
  // Storage interface
  SessionStorage,
  SessionSummary,
  StorageStats,
  StorageErrorCode,
  StorageChangeCallback,
} from "./storage";

export {
  // Storage implementation
  LocalStorageSessionStorage,
  sessionStorage,
  StorageError,

  // Recovery utilities
  recoverSessions,
  estimateRemainingStorage,
  cleanupOldSessions,

  // Cross-tab sync
  onStorageChange,
} from "./storage";

// ============================================================================
// Session Context Provider & Hooks (bead 1v26.3)
// ============================================================================

export type { SessionContextValue } from "./session-context";

export {
  // Provider
  SessionProvider,
  SessionContext,

  // Hooks
  useSession,
  useHypothesis,
  useCurrentPhase,
  usePhaseNavigation,

  // Constants
  PHASE_ORDER,
} from "./session-context";
