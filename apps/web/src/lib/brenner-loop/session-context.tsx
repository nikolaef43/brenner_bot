/**
 * Session Context Provider & Hooks
 *
 * React context and hooks for accessing and manipulating session state
 * throughout the Brenner Loop UI.
 *
 * Features:
 * - Centralized session state management via useReducer
 * - Auto-save to localStorage with debouncing
 * - Hydration from storage on mount
 * - Loading/error state handling
 * - Cross-tab synchronization
 *
 * @see brenner_bot-1v26.3 (bead)
 * @module brenner-loop/session-context
 */

"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import type { Session, SessionPhase, HypothesisCard } from "./types";
import {
  createSession,
  createHypothesisCard,
  generateSessionId,
  isValidTransition,
} from "./types";
import { sessionStorage, onStorageChange, StorageError } from "./storage";

// ============================================================================
// Types
// ============================================================================

/**
 * The public context value exposed to consumers.
 */
export interface SessionContextValue {
  /** Current session (null if none loaded) */
  session: Session | null;

  /** Whether a session is currently loading */
  isLoading: boolean;

  /** Current error (if any) */
  error: Error | null;

  /** Whether there are unsaved changes */
  isDirty: boolean;

  // === Session Actions ===

  /** Create a new session with an initial hypothesis statement */
  createNewSession(initialHypothesis: string): Promise<Session>;

  /** Load an existing session by ID */
  loadSession(id: string): Promise<void>;

  /** Explicitly save the current session */
  saveSession(): Promise<void>;

  /** Close the current session (unloads from context) */
  closeSession(): void;

  /** Delete a session by ID */
  deleteSession(id: string): Promise<void>;

  // === Hypothesis Actions ===

  /** Update the primary hypothesis */
  updateHypothesis(updates: Partial<HypothesisCard>): void;

  /** Add a new alternative hypothesis */
  addAlternativeHypothesis(hypothesis: HypothesisCard): void;

  /** Remove an alternative hypothesis */
  removeAlternativeHypothesis(id: string): void;

  /** Set the primary hypothesis (swaps with current primary) */
  setPrimaryHypothesis(id: string): void;

  // === Phase Actions ===

  /** Advance to the next available phase */
  advancePhase(): void;

  /** Go to a specific phase (if valid transition) */
  goToPhase(phase: SessionPhase): void;

  // === Computed Values ===

  /** Whether we can advance to the next phase */
  canAdvance: boolean;

  /** Phases available from the current phase */
  availablePhases: SessionPhase[];

  /** The primary hypothesis card (convenience accessor) */
  primaryHypothesis: HypothesisCard | null;
}

/**
 * Internal state for the session reducer.
 */
interface SessionState {
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  isDirty: boolean;
}

/**
 * Actions for the session reducer.
 */
type SessionAction =
  | { type: "LOADING" }
  | { type: "LOADED"; session: Session }
  | { type: "CREATED"; session: Session }
  | { type: "ERROR"; error: Error }
  | { type: "CLEAR_ERROR" }
  | { type: "CLOSED" }
  | { type: "SAVED" }
  | { type: "UPDATE_SESSION"; session: Session }
  | { type: "MARK_DIRTY" };

// ============================================================================
// Reducer
// ============================================================================

const initialState: SessionState = {
  session: null,
  isLoading: false,
  error: null,
  isDirty: false,
};

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "LOADING":
      return { ...state, isLoading: true, error: null };

    case "LOADED":
      return {
        ...state,
        session: action.session,
        isLoading: false,
        error: null,
        isDirty: false,
      };

    case "CREATED":
      return {
        ...state,
        session: action.session,
        isLoading: false,
        error: null,
        isDirty: true, // New session needs to be saved
      };

    case "ERROR":
      return { ...state, isLoading: false, error: action.error };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    case "CLOSED":
      return { ...initialState };

    case "SAVED":
      return { ...state, isDirty: false };

    case "UPDATE_SESSION":
      return {
        ...state,
        session: action.session,
        isDirty: true,
      };

    case "MARK_DIRTY":
      return { ...state, isDirty: true };

    default:
      return state;
  }
}

// ============================================================================
// Phase Transitions
// ============================================================================

/**
 * Ordered list of phases for linear progression.
 */
const PHASE_ORDER: SessionPhase[] = [
  "intake",
  "sharpening",
  "level_split",
  "exclusion_test",
  "object_transpose",
  "scale_check",
  "agent_dispatch",
  "synthesis",
  "evidence_gathering",
  "revision",
  "complete",
];

/**
 * Get the next phase in linear order (for advancePhase).
 */
function getNextPhase(current: SessionPhase): SessionPhase | null {
  const currentIndex = PHASE_ORDER.indexOf(current);
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
    return null;
  }
  return PHASE_ORDER[currentIndex + 1];
}

/**
 * Get all valid phases from the current phase.
 */
function getAvailablePhases(current: SessionPhase): SessionPhase[] {
  return PHASE_ORDER.filter((phase) => isValidTransition(current, phase));
}

// ============================================================================
// Context
// ============================================================================

const SessionContext = createContext<SessionContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

/** Debounce delay for auto-save (ms) */
const AUTO_SAVE_DELAY = 1000;

interface SessionProviderProps {
  children: ReactNode;
  /** Optional initial session ID to load on mount */
  initialSessionId?: string;
  /** Optional callback when session changes */
  onSessionChange?: (session: Session | null) => void;
}

/**
 * Provides session state and actions to child components.
 *
 * Features:
 * - Auto-saves changes to localStorage (debounced)
 * - Syncs across browser tabs
 * - Handles loading and error states
 */
export function SessionProvider({
  children,
  initialSessionId,
  onSessionChange,
}: SessionProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Track mounted state for async operations
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Notify on session change
  useEffect(() => {
    onSessionChange?.(state.session);
  }, [state.session, onSessionChange]);

  // -------------------------------------------------------------------------
  // Auto-Save
  // -------------------------------------------------------------------------

  const performSave = useCallback(async (session: Session) => {
    try {
      await sessionStorage.save(session);
      if (isMountedRef.current) {
        dispatch({ type: "SAVED" });
      }
    } catch (error) {
      console.error("Failed to auto-save session:", error);
      if (isMountedRef.current) {
        dispatch({
          type: "ERROR",
          error: error instanceof Error ? error : new Error("Failed to save session"),
        });
      }
    }
  }, []);

  // Debounced auto-save when session changes and is dirty
  useEffect(() => {
    if (!state.session || !state.isDirty) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule new save
    saveTimeoutRef.current = setTimeout(() => {
      if (state.session && state.isDirty) {
        performSave(state.session);
      }
    }, AUTO_SAVE_DELAY);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.session, state.isDirty, performSave]);

  // -------------------------------------------------------------------------
  // Cross-Tab Sync
  // -------------------------------------------------------------------------

  useEffect(() => {
    const unsubscribe = onStorageChange(async (event, sessionId) => {
      if (!isMountedRef.current) return;

      // If our current session was updated elsewhere, reload it
      if (
        event === "save" &&
        sessionId &&
        state.session?.id === sessionId &&
        !state.isDirty
      ) {
        try {
          const updated = await sessionStorage.load(sessionId);
          if (updated && isMountedRef.current) {
            dispatch({ type: "LOADED", session: updated });
          }
        } catch (error) {
          console.error("Failed to sync session from other tab:", error);
        }
      }

      // If our current session was deleted elsewhere
      if (event === "delete" && sessionId && state.session?.id === sessionId) {
        dispatch({ type: "CLOSED" });
      }

      // If storage was cleared
      if (event === "clear") {
        dispatch({ type: "CLOSED" });
      }
    });

    return unsubscribe;
  }, [state.session?.id, state.isDirty]);

  // -------------------------------------------------------------------------
  // Initial Load
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (initialSessionId) {
      dispatch({ type: "LOADING" });
      sessionStorage
        .load(initialSessionId)
        .then((session) => {
          if (isMountedRef.current) {
            if (session) {
              dispatch({ type: "LOADED", session });
            } else {
              dispatch({
                type: "ERROR",
                error: new Error(`Session not found: ${initialSessionId}`),
              });
            }
          }
        })
        .catch((error) => {
          if (isMountedRef.current) {
            dispatch({
              type: "ERROR",
              error: error instanceof Error ? error : new Error("Failed to load session"),
            });
          }
        });
    }
  }, [initialSessionId]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const createNewSession = useCallback(
    async (initialHypothesis: string): Promise<Session> => {
      dispatch({ type: "LOADING" });

      try {
        // Get existing session IDs to generate a unique one
        const existing = await sessionStorage.list();
        const existingIds = existing.map((s) => s.id);
        const sessionId = generateSessionId(existingIds);

        // Create hypothesis card
        const hypothesisId = `HC-${sessionId}-001-v1`;
        const hypothesis = createHypothesisCard({
          id: hypothesisId,
          statement: initialHypothesis,
          mechanism: "Mechanism to be defined",
          predictionsIfTrue: ["Prediction to be defined"],
          impossibleIfTrue: ["Falsification condition to be defined"],
          sessionId,
        });

        // Create session
        const session = createSession({ id: sessionId });
        session.primaryHypothesisId = hypothesisId;
        session.hypothesisCards[hypothesisId] = hypothesis;

        // Save immediately
        await sessionStorage.save(session);

        if (isMountedRef.current) {
          dispatch({ type: "CREATED", session });
        }

        return session;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to create session");
        if (isMountedRef.current) {
          dispatch({ type: "ERROR", error: err });
        }
        throw err;
      }
    },
    []
  );

  const loadSession = useCallback(async (id: string): Promise<void> => {
    dispatch({ type: "LOADING" });

    try {
      const session = await sessionStorage.load(id);
      if (!session) {
        throw new StorageError(`Session not found: ${id}`, "SESSION_NOT_FOUND");
      }

      if (isMountedRef.current) {
        dispatch({ type: "LOADED", session });
      }
    } catch (error) {
      if (isMountedRef.current) {
        dispatch({
          type: "ERROR",
          error: error instanceof Error ? error : new Error("Failed to load session"),
        });
      }
      throw error;
    }
  }, []);

  const saveSession = useCallback(async (): Promise<void> => {
    if (!state.session) return;

    try {
      await sessionStorage.save(state.session);
      if (isMountedRef.current) {
        dispatch({ type: "SAVED" });
      }
    } catch (error) {
      if (isMountedRef.current) {
        dispatch({
          type: "ERROR",
          error: error instanceof Error ? error : new Error("Failed to save session"),
        });
      }
      throw error;
    }
  }, [state.session]);

  const closeSession = useCallback((): void => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    dispatch({ type: "CLOSED" });
  }, []);

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    try {
      await sessionStorage.delete(id);

      // If we deleted the current session, close it
      if (state.session?.id === id && isMountedRef.current) {
        dispatch({ type: "CLOSED" });
      }
    } catch (error) {
      if (isMountedRef.current) {
        dispatch({
          type: "ERROR",
          error: error instanceof Error ? error : new Error("Failed to delete session"),
        });
      }
      throw error;
    }
  }, [state.session?.id]);

  // -------------------------------------------------------------------------
  // Hypothesis Actions
  // -------------------------------------------------------------------------

  const updateHypothesis = useCallback(
    (updates: Partial<HypothesisCard>): void => {
      if (!state.session) return;

      const primaryId = state.session.primaryHypothesisId;
      const currentHypothesis = state.session.hypothesisCards[primaryId];
      if (!currentHypothesis) return;

      const updatedHypothesis: HypothesisCard = {
        ...currentHypothesis,
        ...updates,
        updatedAt: new Date(),
      };

      const updatedSession: Session = {
        ...state.session,
        hypothesisCards: {
          ...state.session.hypothesisCards,
          [primaryId]: updatedHypothesis,
        },
        updatedAt: new Date().toISOString(),
      };

      dispatch({ type: "UPDATE_SESSION", session: updatedSession });
    },
    [state.session]
  );

  const addAlternativeHypothesis = useCallback(
    (hypothesis: HypothesisCard): void => {
      if (!state.session) return;

      const updatedSession: Session = {
        ...state.session,
        alternativeHypothesisIds: [
          ...state.session.alternativeHypothesisIds,
          hypothesis.id,
        ],
        hypothesisCards: {
          ...state.session.hypothesisCards,
          [hypothesis.id]: hypothesis,
        },
        updatedAt: new Date().toISOString(),
      };

      dispatch({ type: "UPDATE_SESSION", session: updatedSession });
    },
    [state.session]
  );

  const removeAlternativeHypothesis = useCallback(
    (id: string): void => {
      if (!state.session) return;

      // Don't allow removing the primary hypothesis
      if (id === state.session.primaryHypothesisId) return;

      const { [id]: removed, ...remainingCards } = state.session.hypothesisCards;
      void removed;

      const updatedSession: Session = {
        ...state.session,
        alternativeHypothesisIds: state.session.alternativeHypothesisIds.filter(
          (hid) => hid !== id
        ),
        hypothesisCards: remainingCards,
        archivedHypothesisIds: [...state.session.archivedHypothesisIds, id],
        updatedAt: new Date().toISOString(),
      };

      dispatch({ type: "UPDATE_SESSION", session: updatedSession });
    },
    [state.session]
  );

  const setPrimaryHypothesis = useCallback(
    (id: string): void => {
      if (!state.session) return;

      // Check if the hypothesis exists
      if (!state.session.hypothesisCards[id]) return;

      const currentPrimaryId = state.session.primaryHypothesisId;

      // Move current primary to alternatives (if it exists)
      let newAlternatives = state.session.alternativeHypothesisIds.filter(
        (hid) => hid !== id
      );
      if (currentPrimaryId && currentPrimaryId !== id) {
        newAlternatives = [...newAlternatives, currentPrimaryId];
      }

      const updatedSession: Session = {
        ...state.session,
        primaryHypothesisId: id,
        alternativeHypothesisIds: newAlternatives,
        updatedAt: new Date().toISOString(),
      };

      dispatch({ type: "UPDATE_SESSION", session: updatedSession });
    },
    [state.session]
  );

  // -------------------------------------------------------------------------
  // Phase Actions
  // -------------------------------------------------------------------------

  const advancePhase = useCallback((): void => {
    if (!state.session) return;

    const nextPhase = getNextPhase(state.session.phase);
    if (!nextPhase) return;

    // Verify it's a valid transition
    if (!isValidTransition(state.session.phase, nextPhase)) return;

    const updatedSession: Session = {
      ...state.session,
      phase: nextPhase,
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: "UPDATE_SESSION", session: updatedSession });
  }, [state.session]);

  const goToPhase = useCallback(
    (phase: SessionPhase): void => {
      if (!state.session) return;

      // Verify it's a valid transition
      if (!isValidTransition(state.session.phase, phase)) return;

      const updatedSession: Session = {
        ...state.session,
        phase,
        updatedAt: new Date().toISOString(),
      };

      dispatch({ type: "UPDATE_SESSION", session: updatedSession });
    },
    [state.session]
  );

  // -------------------------------------------------------------------------
  // Computed Values
  // -------------------------------------------------------------------------

  const canAdvance = useMemo((): boolean => {
    if (!state.session) return false;
    const nextPhase = getNextPhase(state.session.phase);
    return nextPhase !== null && isValidTransition(state.session.phase, nextPhase);
  }, [state.session]);

  const availablePhases = useMemo((): SessionPhase[] => {
    if (!state.session) return [];
    return getAvailablePhases(state.session.phase);
  }, [state.session]);

  const primaryHypothesis = useMemo((): HypothesisCard | null => {
    if (!state.session) return null;
    return state.session.hypothesisCards[state.session.primaryHypothesisId] ?? null;
  }, [state.session]);

  // -------------------------------------------------------------------------
  // Context Value
  // -------------------------------------------------------------------------

  const value = useMemo(
    (): SessionContextValue => ({
      session: state.session,
      isLoading: state.isLoading,
      error: state.error,
      isDirty: state.isDirty,

      createNewSession,
      loadSession,
      saveSession,
      closeSession,
      deleteSession,

      updateHypothesis,
      addAlternativeHypothesis,
      removeAlternativeHypothesis,
      setPrimaryHypothesis,

      advancePhase,
      goToPhase,

      canAdvance,
      availablePhases,
      primaryHypothesis,
    }),
    [
      state,
      createNewSession,
      loadSession,
      saveSession,
      closeSession,
      deleteSession,
      updateHypothesis,
      addAlternativeHypothesis,
      removeAlternativeHypothesis,
      setPrimaryHypothesis,
      advancePhase,
      goToPhase,
      canAdvance,
      availablePhases,
      primaryHypothesis,
    ]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access the full session context.
 *
 * @throws Error if used outside SessionProvider
 */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

/**
 * Access just the primary hypothesis.
 *
 * Convenience hook that extracts the primary hypothesis from the session.
 *
 * @returns The primary HypothesisCard or null
 */
export function useHypothesis(): HypothesisCard | null {
  const { primaryHypothesis } = useSession();
  return primaryHypothesis;
}

/**
 * Access the current session phase.
 *
 * @returns The current phase or "intake" if no session
 */
export function useCurrentPhase(): SessionPhase {
  const { session } = useSession();
  return session?.phase ?? "intake";
}

/**
 * Navigation controls for session phases.
 *
 * @returns Object with navigation methods and state
 */
export function usePhaseNavigation(): {
  /** Go to the next phase */
  next: () => void;
  /** Go to the previous phase (if valid) */
  prev: () => void;
  /** Whether we can advance to the next phase */
  canNext: boolean;
  /** Whether we can go back to the previous phase */
  canPrev: boolean;
  /** Current phase index (0-10) */
  currentIndex: number;
  /** Total number of phases */
  totalPhases: number;
  /** Go to a specific phase */
  goTo: (phase: SessionPhase) => void;
} {
  const { session, advancePhase, goToPhase, canAdvance, availablePhases } =
    useSession();

  const currentIndex = session ? PHASE_ORDER.indexOf(session.phase) : 0;
  const prevPhase = currentIndex > 0 ? PHASE_ORDER[currentIndex - 1] : null;

  // Can go back if the previous phase is in available phases
  // Note: this is a simplification; in practice, going backwards may have different rules
  const canPrev = prevPhase !== null && availablePhases.includes(prevPhase);

  const prev = useCallback(() => {
    if (prevPhase && canPrev) {
      goToPhase(prevPhase);
    }
  }, [prevPhase, canPrev, goToPhase]);

  return {
    next: advancePhase,
    prev,
    canNext: canAdvance,
    canPrev,
    currentIndex,
    totalPhases: PHASE_ORDER.length,
    goTo: goToPhase,
  };
}

// ============================================================================
// Exports
// ============================================================================

export { SessionContext, PHASE_ORDER };
