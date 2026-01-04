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
// Export / Import (bead 1v26.4)
// ============================================================================

export type { SessionExport, SessionExportFormat, SessionImportResult } from "./export";

export { exportSession, importSession } from "./export";

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

// ============================================================================
// Session State Machine (bead reew.3)
// ============================================================================

export type {
  // Event types
  SessionEvent,
  SessionEventType,

  // Configuration types
  TransitionGuard,
  TransitionAction,
  TransitionDef,
  StateConfig,
  SessionMachineConfig,

  // Result types
  TransitionResult,
} from "./session-machine";

export {
  // Machine config
  sessionMachineConfig,

  // Core functions
  transition,
  getAvailableEvents,
  getReachablePhases,
  canSend,
  canGoBack,
  isComplete,
  getDefaultNextPhase,

  // Display helpers
  getPhaseName,
  getPhaseDescription,
  getPhaseSymbol,

  // Guards (for custom use)
  hasPrimaryHypothesis,
  hasPredictions,
  canTransitionTo,
  hasPendingAgentRequests,
  hasAgentResponses,
  hasEvidence,
} from "./session-machine";

// Hook and helpers
export type { SessionMachineState, UseSessionMachineOptions } from "./use-session-machine";

export {
  useSessionMachine,
  getPhaseStatusClass,
  getSessionProgress,
} from "./use-session-machine";

// ============================================================================
// Hypothesis History (bead an1n.2)
// ============================================================================

export type {
  EvolutionTrigger,
  HypothesisVersion,
  HypothesisHistoryStore,
  HypothesisChange,
  HypothesisDiff,
  EvolutionStatus,
  EvolutionGraphNode,
  EvolutionGraphEdge,
  EvolutionGraph,
} from "./hypothesis-history";

export {
  EVOLUTION_TRIGGER_LABELS,
  createHistoryStore,
  addRootHypothesis,
  evolveHypothesis,
  abandonHypothesis,
  getAncestors,
  getDescendants,
  getRoot,
  getLeaves,
  findCommonAncestor,
  diffHypotheses,
  generateEvolutionGraph,
  generateLineageGraph,
  getEvolutionStats,
  findByTrigger,
  findByTimeRange,
  isAncestor,
} from "./hypothesis-history";

// ============================================================================
// Hypothesis Arena (bead an1n.6)
// ============================================================================

export type {
  // Core types
  TestResultType,
  PredictionBoldness,
  ArenaHypothesisStatus,
  HypothesisSource,
  ArenaHypothesis,
  ScoredPrediction,
  HypothesisTestResult,
  ArenaTest,
  HypothesisArena,
  ComparisonMatrixRow,
  ComparisonMatrix,
} from "./hypothesis-arena";

export {
  // Constants
  BOLDNESS_MULTIPLIERS,
  BASE_SCORE_DELTAS,
  SOURCE_LABELS,
  STATUS_CONFIG,

  // Factory functions
  generateArenaId,
  generateTestResultId,
  generateArenaTestId,
  createArena,
  createArenaHypothesis,

  // Arena operations
  addCompetitor,
  calculateScoreDelta,
  recordTestResult,
  createArenaTest,
  eliminateHypothesis,
  resolveArena,

  // Query functions
  getActiveHypotheses,
  getEliminatedHypotheses,
  getLeader,
  getRankedHypotheses,
  calculateDiscriminativePower,

  // Comparison matrix
  buildComparisonMatrix,

  // Type guards
  isHypothesisArena,
  isArenaHypothesis,

  // Boldness assessment
  assessPredictionBoldness,
  scorePredictions,
  getAverageBoldness,
} from "./hypothesis-arena";

// ============================================================================
// Hypothesis Lifecycle State Machine (bead se2r)
// ============================================================================

export type {
  // Core types
  HypothesisState,
  HypothesisLifecycleEvent,
  HypothesisWithLifecycle,
  LifecycleTransitionResult,
  LifecycleSideEffect,

  // Configuration types
  HypothesisStateConfig,

  // Statistics
  LifecycleStats,
} from "./hypothesis-lifecycle";

export {
  // State configuration
  HYPOTHESIS_STATE_CONFIG,

  // Core transition functions
  transitionHypothesis,
  getAvailableTransitions,
  canTransition,
  canTransitionWithEvent,

  // State queries
  isTerminalState,
  isResolvable,
  shouldBeDormant,

  // Factory functions
  createHypothesisWithLifecycle,
  upgradeToLifecycle,

  // Type guards
  isHypothesisState,
  isHypothesisWithLifecycle,

  // Display helpers
  getStateLabel,
  getStateDescription,
  getStateIcon,
  getStateColors,
  isStateEditable,
  isStateDeletable,

  // Statistics
  calculateLifecycleStats,
} from "./hypothesis-lifecycle";

// ============================================================================
// Prediction Lock System (bead rffy)
// ============================================================================

export type {
  // Core types
  PredictionLockState,
  PredictionType,
  LockedPrediction,
  PredictionAmendment,

  // Result types
  LockResult,
  RevealResult,
  VerificationResult,
  PredictionLockStats,

  // Display types
  LockStateDisplay,
} from "./prediction-lock";

export {
  // Cryptographic functions
  generateHash,

  // ID generation
  generatePredictionLockId,

  // Core lock operations
  lockPrediction,
  verifyPrediction,
  revealPrediction,
  amendPrediction,

  // Statistics & scoring
  calculatePredictionLockStats,
  calculateRobustnessMultiplier,

  // Type guards
  isPredictionLockState,
  isPredictionType,
  isLockedPrediction,

  // Display helpers
  LOCK_STATE_DISPLAY,
  getLockStateDisplay,
  formatLockTimestamp,
  getShortHash,
} from "./prediction-lock";

// ============================================================================
// Evidence Ledger (bead njjo.1)
// ============================================================================

export type {
  // Core types
  TestType,
  EvidenceResult,
  DiscriminativePower,
  TestDescription,

  // Main interface (comprehensive version)
  EvidenceEntry as FullEvidenceEntry,

  // Validation types
  EvidenceValidationResult,
  EvidenceValidationError,
  EvidenceValidationWarning,
  EvidenceValidationErrorCode,
  EvidenceValidationWarningCode,
} from "./evidence";

export {
  // Constants
  TEST_TYPE_LABELS,
  DISCRIMINATIVE_POWER_LABELS,
  EVIDENCE_ID_PATTERN,

  // Type guards
  isTestType,
  isEvidenceResult,
  isDiscriminativePower,
  isTestDescription,
  isEvidenceEntry,

  // Validation
  validateEvidenceEntry,

  // Factory functions
  generateEvidenceId,
  createEvidenceEntry,

  // Utility functions
  calculateConfidenceDelta,
  summarizeEvidenceResult,
  getResultColor,
} from "./evidence";

// ============================================================================
// Artifact Templates (bead nu8g.1)
// ============================================================================

export type {
  ResearchBriefStatus,
  ResearchBriefMetadata,
  HypothesisStatement,
  HypothesisEvolution,
  DiscriminativeStructure,
  OperatorAppliedSummary,
  AgentAnalysis,
  EvidenceSummary,
  ResearchBriefTemplateInput,
} from "./artifacts/research-brief-template";

export {
  RESEARCH_BRIEF_TEMPLATE_VERSION,
  renderResearchBriefTemplate,
  createResearchBriefTemplate,
} from "./artifacts/research-brief-template";

// ============================================================================
// Multi-Agent Tribunal System (bead xlk2.1)
// ============================================================================

export type {
  // Agent types
  TribunalAgentRole,
  TribunalAgentConfig,

  // Agent persona types (beads njiu, oytk)
  PersonaPhaseGroup,
  SessionPhase as AgentSessionPhase, // Deprecated alias
  InvocationTrigger,
  AgentBehavior,
  InteractionPattern,
  ToneCalibration,
  ModelConfig as AgentModelConfig,
  AgentPersona,
} from "./agents";

export {
  // Agent configurations
  TRIBUNAL_AGENTS,
  TRIBUNAL_ORDER,

  // Agent helpers
  getTribunalAgentsInOrder,
  getAgentConfig,
  loadPrompt,
  clearPromptCache,

  // Type guards
  isTribunalAgentRole,

  // Phase mapping (converts detailed SessionPhase to PersonaPhaseGroup)
  mapSessionPhaseToPersonaGroup,

  // Agent personas (beads njiu, oytk)
  DEVILS_ADVOCATE_PERSONA,
  EXPERIMENT_DESIGNER_PERSONA,
  BRENNER_CHANNELER_PERSONA,
  SYNTHESIS_PERSONA,
  AGENT_PERSONAS,

  // Persona utility functions
  getPersona,
  getActivePersonasForPhase,
  getPersonasForTrigger,
  shouldInvokePersona,
  getBehaviorsByPriority,
  buildSystemPromptContext,
  getInteractionExamples,
  getModelConfig,

  // Agent dispatch types (bead xlk2.2)
  type AgentTaskStatus,
  type AgentTask,
  type TribunalAgentResponse,
  type OperatorResults,
  type AgentDispatch,
  type CreateDispatchOptions,
  type PollOptions,

  // Agent dispatch constants
  DEFAULT_DISPATCH_ROLES,
  DISPATCH_SUBJECT_PREFIX,
  FALLBACK_BRENNER_QUOTES,

  // Agent dispatch functions
  createDispatch,
  generateThreadId,
  formatHypothesisForPrompt,
  formatOperatorResultsForPrompt,
  buildAgentPrompt,
  dispatchAgentTask,
  dispatchAllTasks,
  pollForResponses,
  checkAgentAvailability,
  getFallbackContent,
  getDispatchStatus,
} from "./agents";
