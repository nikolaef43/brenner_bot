/**
 * Hypothesis Lifecycle State Machine
 *
 * Defines the formal states and transitions for hypothesis evolution.
 * Hypotheses aren't just "open" or "closed" - they have a rich lifecycle
 * from draft through testing to resolution (supported, falsified, or superseded).
 *
 * @see brenner_bot-se2r (bead)
 * @module brenner-loop/hypothesis-lifecycle
 */

import type { HypothesisCard } from "./hypothesis";

// ============================================================================
// Core Types
// ============================================================================

/**
 * The lifecycle states a hypothesis can be in.
 *
 * State semantics:
 * - draft: Initial creation, freely editable, no predictions locked
 * - active: User actively working, at least one locked prediction
 * - testing: Evidence collection in progress, predictions locked
 * - supported: Evidence consistent with hypothesis, high robustness
 * - falsified: Clear discriminative evidence against, moved to Graveyard
 * - superseded: Replaced by a better formulation, linked to successor
 * - dormant: User paused work (no activity for N days)
 */
export type HypothesisState =
  | "draft"
  | "active"
  | "testing"
  | "supported"
  | "falsified"
  | "superseded"
  | "dormant";

/**
 * Events that can trigger state transitions.
 */
export type HypothesisLifecycleEvent =
  | { type: "LOCK_PREDICTION" }
  | { type: "START_TESTING" }
  | { type: "RECORD_SUPPORT"; confidence: number }
  | { type: "RECORD_FALSIFICATION"; reason: string }
  | { type: "CREATE_SUCCESSOR"; successorId: string }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "REACTIVATE" }
  | { type: "ABANDON"; reason: string };

/**
 * Extended hypothesis with lifecycle state tracking.
 */
export interface HypothesisWithLifecycle extends HypothesisCard {
  /** Current lifecycle state */
  state: HypothesisState;

  /** When the current state was entered */
  stateEnteredAt: Date;

  /** IDs of predictions that are locked (immutable) */
  lockedPredictions: string[];

  /** ID of the successor hypothesis (if superseded) */
  successorId?: string;

  /** Reason for falsification (if falsified) */
  falsificationReason?: string;

  /** Learning captured from falsification */
  falsificationLearning?: string;

  /** Last activity timestamp (for dormancy detection) */
  lastActivityAt: Date;

  /** Number of days of inactivity before becoming dormant */
  dormancyThresholdDays: number;
}

/**
 * Result of a state transition attempt.
 */
export interface LifecycleTransitionResult {
  /** Whether the transition was successful */
  success: boolean;

  /** The new state (or current state if failed) */
  newState: HypothesisState;

  /** The updated hypothesis (or original if failed) */
  hypothesis: HypothesisWithLifecycle;

  /** Error message if transition failed */
  error?: string;

  /** Side effects to execute (notifications, etc.) */
  sideEffects?: LifecycleSideEffect[];
}

/**
 * Side effect to execute after a transition.
 */
export interface LifecycleSideEffect {
  type: "notify" | "archive" | "create_successor_link" | "log";
  payload: Record<string, unknown>;
}

// ============================================================================
// State Configuration
// ============================================================================

/**
 * Configuration for each hypothesis state.
 */
export interface HypothesisStateConfig {
  /** Human-readable label */
  label: string;

  /** Short description */
  description: string;

  /** Icon name (for UI) */
  icon: string;

  /** Color scheme (for UI) */
  color: {
    bg: string;
    text: string;
    border: string;
  };

  /** Whether the hypothesis can be edited in this state */
  editable: boolean;

  /** Whether the hypothesis can be deleted in this state */
  deletable: boolean;

  /** Valid transitions from this state */
  transitions: HypothesisLifecycleEvent["type"][];
}

/**
 * Configuration for all hypothesis states.
 */
export const HYPOTHESIS_STATE_CONFIG: Record<HypothesisState, HypothesisStateConfig> = {
  draft: {
    label: "Draft",
    description: "Initial creation, freely editable",
    icon: "pencil",
    color: {
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-700 dark:text-slate-300",
      border: "border-slate-300 dark:border-slate-600",
    },
    editable: true,
    deletable: true,
    transitions: ["LOCK_PREDICTION", "ABANDON"],
  },
  active: {
    label: "Active",
    description: "Actively working, predictions locked",
    icon: "play",
    color: {
      bg: "bg-blue-100 dark:bg-blue-900",
      text: "text-blue-700 dark:text-blue-300",
      border: "border-blue-300 dark:border-blue-600",
    },
    editable: false,
    deletable: false,
    transitions: ["START_TESTING", "CREATE_SUCCESSOR", "PAUSE"],
  },
  testing: {
    label: "Testing",
    description: "Evidence collection in progress",
    icon: "beaker",
    color: {
      bg: "bg-amber-100 dark:bg-amber-900",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-300 dark:border-amber-600",
    },
    editable: false,
    deletable: false,
    transitions: ["RECORD_SUPPORT", "RECORD_FALSIFICATION", "CREATE_SUCCESSOR"],
  },
  supported: {
    label: "Supported",
    description: "Evidence consistent, passed tests",
    icon: "check-circle",
    color: {
      bg: "bg-green-100 dark:bg-green-900",
      text: "text-green-700 dark:text-green-300",
      border: "border-green-300 dark:border-green-600",
    },
    editable: false,
    deletable: false,
    transitions: ["START_TESTING", "CREATE_SUCCESSOR"], // Can still be tested further
  },
  falsified: {
    label: "Falsified",
    description: "Definitively refuted by evidence",
    icon: "x-circle",
    color: {
      bg: "bg-red-100 dark:bg-red-900",
      text: "text-red-700 dark:text-red-300",
      border: "border-red-300 dark:border-red-600",
    },
    editable: false,
    deletable: false,
    transitions: [], // Terminal state
  },
  superseded: {
    label: "Superseded",
    description: "Replaced by refined formulation",
    icon: "arrow-right",
    color: {
      bg: "bg-purple-100 dark:bg-purple-900",
      text: "text-purple-700 dark:text-purple-300",
      border: "border-purple-300 dark:border-purple-600",
    },
    editable: false,
    deletable: false,
    transitions: [], // Terminal state (but can view successor)
  },
  dormant: {
    label: "Dormant",
    description: "Paused, no recent activity",
    icon: "pause",
    color: {
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-500 dark:text-gray-400",
      border: "border-gray-300 dark:border-gray-600",
    },
    editable: false,
    deletable: true,
    transitions: ["RESUME", "ABANDON"],
  },
};

// ============================================================================
// Transition Guards
// ============================================================================

/**
 * Guard function type for validating transitions.
 */
type TransitionGuard = (
  hypothesis: HypothesisWithLifecycle,
  event: HypothesisLifecycleEvent
) => { valid: boolean; error?: string };

/**
 * Guard: Hypothesis must have at least one prediction to lock.
 */
const hasUnlockedPredictions: TransitionGuard = (hypothesis) => {
  const allPredictions = [
    ...hypothesis.predictionsIfTrue,
    ...hypothesis.predictionsIfFalse,
  ];
  const unlockedCount = allPredictions.length - hypothesis.lockedPredictions.length;

  if (unlockedCount === 0) {
    return { valid: false, error: "No predictions available to lock" };
  }
  return { valid: true };
};

/**
 * Guard: Hypothesis must have at least one locked prediction.
 */
const hasLockedPredictions: TransitionGuard = (hypothesis) => {
  if (hypothesis.lockedPredictions.length === 0) {
    return { valid: false, error: "Must lock at least one prediction before testing" };
  }
  return { valid: true };
};

/**
 * Guard: Hypothesis must have falsification conditions.
 */
const hasFalsificationConditions: TransitionGuard = (hypothesis) => {
  if (hypothesis.impossibleIfTrue.length === 0) {
    return { valid: false, error: "Must have falsification conditions before testing" };
  }
  return { valid: true };
};

/**
 * Guard: Event must have required fields.
 */
const hasRequiredFields: TransitionGuard = (_hypothesis, event) => {
  if (event.type === "RECORD_FALSIFICATION" && !("reason" in event)) {
    return { valid: false, error: "Falsification requires a reason" };
  }
  if (event.type === "CREATE_SUCCESSOR" && !("successorId" in event)) {
    return { valid: false, error: "Supersession requires successor ID" };
  }
  return { valid: true };
};

// ============================================================================
// Transition Machine
// ============================================================================

/**
 * State transition definitions.
 */
interface TransitionDef {
  from: HypothesisState[];
  to: HypothesisState;
  guards: TransitionGuard[];
  action: (
    hypothesis: HypothesisWithLifecycle,
    event: HypothesisLifecycleEvent
  ) => Partial<HypothesisWithLifecycle>;
}

/**
 * All valid state transitions.
 */
const TRANSITIONS: Record<HypothesisLifecycleEvent["type"], TransitionDef> = {
  LOCK_PREDICTION: {
    from: ["draft"],
    to: "active",
    guards: [hasUnlockedPredictions],
    action: (hypothesis) => ({
      // In real implementation, would lock specific prediction
      lockedPredictions: [...hypothesis.predictionsIfTrue.slice(0, 1)],
    }),
  },

  START_TESTING: {
    from: ["active", "supported"],
    to: "testing",
    guards: [hasLockedPredictions, hasFalsificationConditions],
    action: () => ({}),
  },

  RECORD_SUPPORT: {
    from: ["testing"],
    to: "supported",
    guards: [],
    action: (_hypothesis, event) => ({
      confidence: (event as { type: "RECORD_SUPPORT"; confidence: number }).confidence,
    }),
  },

  RECORD_FALSIFICATION: {
    from: ["testing"],
    to: "falsified",
    guards: [hasRequiredFields],
    action: (_hypothesis, event) => ({
      falsificationReason: (event as { type: "RECORD_FALSIFICATION"; reason: string }).reason,
      confidence: 0,
    }),
  },

  CREATE_SUCCESSOR: {
    from: ["active", "testing", "supported"],
    to: "superseded",
    guards: [hasRequiredFields],
    action: (_hypothesis, event) => ({
      successorId: (event as { type: "CREATE_SUCCESSOR"; successorId: string }).successorId,
    }),
  },

  PAUSE: {
    from: ["active"],
    to: "dormant",
    guards: [],
    action: () => ({}),
  },

  RESUME: {
    from: ["dormant"],
    to: "active",
    guards: [],
    action: () => ({
      lastActivityAt: new Date(),
    }),
  },

  REACTIVATE: {
    from: ["dormant"],
    to: "draft",
    guards: [],
    action: (hypothesis) => ({
      lockedPredictions: [],
      lastActivityAt: new Date(),
      // Reset state-specific fields
      successorId: undefined,
      falsificationReason: undefined,
      // Keep evolution chain intact
      parentVersion: hypothesis.id,
    }),
  },

  ABANDON: {
    from: ["draft", "dormant"],
    to: "falsified",
    guards: [],
    action: (_hypothesis, event) => ({
      falsificationReason:
        (event as { type: "ABANDON"; reason: string }).reason || "Abandoned by user",
      falsificationLearning: "Hypothesis was abandoned before testing",
      confidence: 0,
    }),
  },
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Attempt a state transition on a hypothesis.
 *
 * @param hypothesis - The hypothesis to transition
 * @param event - The triggering event
 * @returns Result indicating success/failure and new state
 */
export function transitionHypothesis(
  hypothesis: HypothesisWithLifecycle,
  event: HypothesisLifecycleEvent
): LifecycleTransitionResult {
  const transition = TRANSITIONS[event.type];

  if (!transition) {
    return {
      success: false,
      newState: hypothesis.state,
      hypothesis,
      error: `Unknown event type: ${event.type}`,
    };
  }

  // Check if transition is valid from current state
  if (!transition.from.includes(hypothesis.state)) {
    return {
      success: false,
      newState: hypothesis.state,
      hypothesis,
      error: `Cannot ${event.type} from state '${hypothesis.state}'`,
    };
  }

  // Run guards
  for (const guard of transition.guards) {
    const result = guard(hypothesis, event);
    if (!result.valid) {
      return {
        success: false,
        newState: hypothesis.state,
        hypothesis,
        error: result.error,
      };
    }
  }

  // Apply transition
  const now = new Date();
  const updates = transition.action(hypothesis, event);

  const updated: HypothesisWithLifecycle = {
    ...hypothesis,
    ...updates,
    state: transition.to,
    stateEnteredAt: now,
    lastActivityAt: now,
    updatedAt: now,
  };

  // Generate side effects
  const sideEffects: LifecycleSideEffect[] = [];

  if (transition.to === "falsified") {
    sideEffects.push({
      type: "archive",
      payload: { hypothesisId: hypothesis.id, reason: "falsified" },
    });
  }

  if (transition.to === "superseded" && updated.successorId) {
    sideEffects.push({
      type: "create_successor_link",
      payload: { fromId: hypothesis.id, toId: updated.successorId },
    });
  }

  return {
    success: true,
    newState: transition.to,
    hypothesis: updated,
    sideEffects,
  };
}

/**
 * Get available transitions from current state.
 *
 * @param hypothesis - The hypothesis to check
 * @returns Array of available event types
 */
export function getAvailableTransitions(
  hypothesis: HypothesisWithLifecycle
): HypothesisLifecycleEvent["type"][] {
  return HYPOTHESIS_STATE_CONFIG[hypothesis.state].transitions;
}

/**
 * Check if a specific transition is available.
 *
 * @param hypothesis - The hypothesis to check
 * @param eventType - The event type to check
 * @returns Whether the transition is available
 */
export function canTransition(
  hypothesis: HypothesisWithLifecycle,
  eventType: HypothesisLifecycleEvent["type"]
): boolean {
  const transition = TRANSITIONS[eventType];
  if (!transition) return false;

  if (!transition.from.includes(hypothesis.state)) return false;

  // Run guards
  for (const guard of transition.guards) {
    const result = guard(hypothesis, { type: eventType } as HypothesisLifecycleEvent);
    if (!result.valid) return false;
  }

  return true;
}

/**
 * Check if hypothesis is in a terminal state.
 *
 * @param state - The state to check
 * @returns Whether the state is terminal
 */
export function isTerminalState(state: HypothesisState): boolean {
  return state === "falsified" || state === "superseded";
}

/**
 * Check if hypothesis is resolvable (can reach terminal state).
 *
 * @param state - The state to check
 * @returns Whether the hypothesis can be resolved
 */
export function isResolvable(state: HypothesisState): boolean {
  return !isTerminalState(state) && state !== "dormant";
}

/**
 * Check if hypothesis should auto-transition to dormant.
 *
 * @param hypothesis - The hypothesis to check
 * @param now - Current time (optional, defaults to Date.now())
 * @returns Whether the hypothesis should become dormant
 */
export function shouldBeDormant(
  hypothesis: HypothesisWithLifecycle,
  now: Date = new Date()
): boolean {
  if (hypothesis.state !== "active") return false;

  const daysSinceActivity =
    (now.getTime() - hypothesis.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceActivity >= hypothesis.dormancyThresholdDays;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new hypothesis with lifecycle tracking.
 *
 * @param card - The base HypothesisCard
 * @param options - Optional configuration
 * @returns A HypothesisWithLifecycle in draft state
 */
export function createHypothesisWithLifecycle(
  card: HypothesisCard,
  options: {
    dormancyThresholdDays?: number;
  } = {}
): HypothesisWithLifecycle {
  const now = new Date();

  return {
    ...card,
    state: "draft",
    stateEnteredAt: now,
    lockedPredictions: [],
    lastActivityAt: now,
    dormancyThresholdDays: options.dormancyThresholdDays ?? 30,
  };
}

/**
 * Upgrade an existing HypothesisCard to include lifecycle tracking.
 *
 * @param card - The existing HypothesisCard
 * @param currentState - The current state to assign
 * @returns A HypothesisWithLifecycle
 */
export function upgradeToLifecycle(
  card: HypothesisCard,
  currentState: HypothesisState = "draft"
): HypothesisWithLifecycle {
  const now = new Date();

  return {
    ...card,
    state: currentState,
    stateEnteredAt: now,
    lockedPredictions: [],
    lastActivityAt: card.updatedAt || now,
    dormancyThresholdDays: 30,
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a string is a valid HypothesisState.
 *
 * @param value - The value to check
 * @returns Whether the value is a valid HypothesisState
 */
export function isHypothesisState(value: unknown): value is HypothesisState {
  return (
    typeof value === "string" &&
    ["draft", "active", "testing", "supported", "falsified", "superseded", "dormant"].includes(
      value
    )
  );
}

/**
 * Check if an object is a HypothesisWithLifecycle.
 *
 * @param obj - The object to check
 * @returns Whether the object is a HypothesisWithLifecycle
 */
export function isHypothesisWithLifecycle(
  obj: unknown
): obj is HypothesisWithLifecycle {
  if (typeof obj !== "object" || obj === null) return false;

  const hyp = obj as Record<string, unknown>;

  // Check lifecycle-specific fields
  if (!isHypothesisState(hyp.state)) return false;
  if (!(hyp.stateEnteredAt instanceof Date)) return false;
  if (!Array.isArray(hyp.lockedPredictions)) return false;
  if (!(hyp.lastActivityAt instanceof Date)) return false;
  if (typeof hyp.dormancyThresholdDays !== "number") return false;

  return true;
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Get human-readable label for a state.
 *
 * @param state - The state
 * @returns Human-readable label
 */
export function getStateLabel(state: HypothesisState): string {
  return HYPOTHESIS_STATE_CONFIG[state].label;
}

/**
 * Get description for a state.
 *
 * @param state - The state
 * @returns State description
 */
export function getStateDescription(state: HypothesisState): string {
  return HYPOTHESIS_STATE_CONFIG[state].description;
}

/**
 * Get icon name for a state.
 *
 * @param state - The state
 * @returns Icon name
 */
export function getStateIcon(state: HypothesisState): string {
  return HYPOTHESIS_STATE_CONFIG[state].icon;
}

/**
 * Get color classes for a state.
 *
 * @param state - The state
 * @returns Color class object
 */
export function getStateColors(
  state: HypothesisState
): HypothesisStateConfig["color"] {
  return HYPOTHESIS_STATE_CONFIG[state].color;
}

/**
 * Check if hypothesis is editable in current state.
 *
 * @param state - The state
 * @returns Whether editable
 */
export function isStateEditable(state: HypothesisState): boolean {
  return HYPOTHESIS_STATE_CONFIG[state].editable;
}

/**
 * Check if hypothesis is deletable in current state.
 *
 * @param state - The state
 * @returns Whether deletable
 */
export function isStateDeletable(state: HypothesisState): boolean {
  return HYPOTHESIS_STATE_CONFIG[state].deletable;
}

// ============================================================================
// Lifecycle Statistics
// ============================================================================

/**
 * Statistics about hypothesis lifecycle.
 */
export interface LifecycleStats {
  totalHypotheses: number;
  byState: Record<HypothesisState, number>;
  avgDaysInDraft: number;
  avgDaysToResolution: number;
  falsificationRate: number;
  supersessionRate: number;
}

/**
 * Calculate lifecycle statistics for a set of hypotheses.
 *
 * @param hypotheses - The hypotheses to analyze
 * @returns Lifecycle statistics
 */
export function calculateLifecycleStats(
  hypotheses: HypothesisWithLifecycle[]
): LifecycleStats {
  const byState: Record<HypothesisState, number> = {
    draft: 0,
    active: 0,
    testing: 0,
    supported: 0,
    falsified: 0,
    superseded: 0,
    dormant: 0,
  };

  let totalDaysInDraft = 0;
  let draftCount = 0;
  let totalDaysToResolution = 0;
  let resolvedCount = 0;
  let falsifiedCount = 0;
  let supersededCount = 0;

  for (const h of hypotheses) {
    byState[h.state]++;

    // Calculate time in draft
    if (h.state !== "draft") {
      const daysInDraft =
        (h.stateEnteredAt.getTime() - h.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      totalDaysInDraft += daysInDraft;
      draftCount++;
    }

    // Calculate time to resolution
    if (isTerminalState(h.state)) {
      const daysToResolution =
        (h.stateEnteredAt.getTime() - h.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      totalDaysToResolution += daysToResolution;
      resolvedCount++;

      if (h.state === "falsified") falsifiedCount++;
      if (h.state === "superseded") supersededCount++;
    }
  }

  return {
    totalHypotheses: hypotheses.length,
    byState,
    avgDaysInDraft: draftCount > 0 ? totalDaysInDraft / draftCount : 0,
    avgDaysToResolution: resolvedCount > 0 ? totalDaysToResolution / resolvedCount : 0,
    falsificationRate:
      hypotheses.length > 0 ? falsifiedCount / hypotheses.length : 0,
    supersessionRate:
      hypotheses.length > 0 ? supersededCount / hypotheses.length : 0,
  };
}
