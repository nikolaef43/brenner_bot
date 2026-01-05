/**
 * Undo/Redo Manager for Brenner Loop Sessions
 *
 * Implements the Command Pattern for undoable session actions.
 * Supports keyboard shortcuts (Ctrl+Z/Cmd+Z) and UI controls.
 *
 * @see brenner_bot-sedg (Undo/Redo System)
 */

import type { Session, SessionPhase, EvidenceEntry } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * Unique identifier for commands
 */
export type CommandId = string;

/**
 * Types of undoable commands
 */
export type CommandType =
  | "update_confidence"
  | "set_primary_hypothesis"
  | "add_alternative_hypothesis"
  | "archive_hypothesis"
  | "restore_hypothesis"
  | "record_evidence"
  | "update_prediction"
  | "phase_transition"
  | "update_notes"
  | "add_tag"
  | "remove_tag";

/**
 * Base interface for all undoable commands
 */
export interface SessionCommand<T = unknown> {
  /** Unique command ID */
  id: CommandId;

  /** Type of command */
  type: CommandType;

  /** When the command was executed */
  timestamp: string;

  /** Human-readable description for UI */
  description: string;

  /** Data needed to execute the command */
  executeData: T;

  /** Data needed to undo the command */
  undoData: T;
}

/**
 * Confidence update command data
 */
export interface ConfidenceUpdateData {
  hypothesisId: string;
  confidence: number;
  reason: string;
  evidenceId?: string;
}

/**
 * Hypothesis state change command data
 */
export interface HypothesisStateData {
  hypothesisId: string;
  /** For archive operations, the reason */
  reason?: string;
  /** For set primary, the previous primary ID */
  previousPrimaryId?: string;
}

/**
 * Evidence record command data
 */
export interface EvidenceRecordData {
  evidence: EvidenceEntry;
}

/**
 * Prediction update command data
 */
export interface PredictionUpdateData {
  predictionId: string;
  field: string;
  value: unknown;
}

/**
 * Phase transition command data
 */
export interface PhaseTransitionData {
  phase: SessionPhase;
}

/**
 * Notes update command data
 */
export interface NotesUpdateData {
  notes: string;
}

/**
 * Tag command data
 */
export interface TagData {
  tag: string;
}

// ============================================================================
// Command Type Guards
// ============================================================================

export function isConfidenceCommand(
  cmd: SessionCommand
): cmd is SessionCommand<ConfidenceUpdateData> {
  return cmd.type === "update_confidence";
}

export function isHypothesisStateCommand(
  cmd: SessionCommand
): cmd is SessionCommand<HypothesisStateData> {
  return (
    cmd.type === "set_primary_hypothesis" ||
    cmd.type === "add_alternative_hypothesis" ||
    cmd.type === "archive_hypothesis" ||
    cmd.type === "restore_hypothesis"
  );
}

export function isEvidenceCommand(
  cmd: SessionCommand
): cmd is SessionCommand<EvidenceRecordData> {
  return cmd.type === "record_evidence";
}

export function isPhaseCommand(
  cmd: SessionCommand
): cmd is SessionCommand<PhaseTransitionData> {
  return cmd.type === "phase_transition";
}

// ============================================================================
// Undo Stack State
// ============================================================================

/**
 * The undo manager state
 */
export interface UndoStack {
  /** Commands that can be undone (most recent last) */
  history: SessionCommand[];

  /** Commands that have been undone and can be redone */
  redoStack: SessionCommand[];

  /** Maximum number of commands to keep in history */
  maxHistory: number;
}

/**
 * Result of executing a command
 */
export interface ExecuteResult {
  success: boolean;
  session: Session;
  command?: SessionCommand;
  error?: string;
}

/**
 * Create a new empty undo stack
 */
export function createUndoStack(maxHistory = 50): UndoStack {
  return {
    history: [],
    redoStack: [],
    maxHistory,
  };
}

// ============================================================================
// Command Creation Helpers
// ============================================================================

/**
 * Generate a unique command ID
 */
export function generateCommandId(): CommandId {
  return `CMD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create an update confidence command
 */
export function createConfidenceCommand(
  hypothesisId: string,
  previousConfidence: number,
  newConfidence: number,
  reason: string,
  evidenceId?: string
): SessionCommand<ConfidenceUpdateData> {
  return {
    id: generateCommandId(),
    type: "update_confidence",
    timestamp: new Date().toISOString(),
    description: `Update confidence: ${previousConfidence}% → ${newConfidence}%`,
    executeData: {
      hypothesisId,
      confidence: newConfidence,
      reason,
      evidenceId,
    },
    undoData: {
      hypothesisId,
      confidence: previousConfidence,
      reason: `Undo: ${reason}`,
      evidenceId,
    },
  };
}

/**
 * Create a set primary hypothesis command
 */
export function createSetPrimaryCommand(
  newPrimaryId: string,
  previousPrimaryId: string
): SessionCommand<HypothesisStateData> {
  return {
    id: generateCommandId(),
    type: "set_primary_hypothesis",
    timestamp: new Date().toISOString(),
    description: `Set primary hypothesis`,
    executeData: {
      hypothesisId: newPrimaryId,
      previousPrimaryId,
    },
    undoData: {
      hypothesisId: previousPrimaryId,
      previousPrimaryId: newPrimaryId,
    },
  };
}

/**
 * Create an archive hypothesis command
 */
export function createArchiveCommand(
  hypothesisId: string,
  reason: string
): SessionCommand<HypothesisStateData> {
  return {
    id: generateCommandId(),
    type: "archive_hypothesis",
    timestamp: new Date().toISOString(),
    description: `Archive hypothesis`,
    executeData: {
      hypothesisId,
      reason,
    },
    undoData: {
      hypothesisId,
    },
  };
}

/**
 * Create a restore hypothesis command
 */
export function createRestoreCommand(
  hypothesisId: string
): SessionCommand<HypothesisStateData> {
  return {
    id: generateCommandId(),
    type: "restore_hypothesis",
    timestamp: new Date().toISOString(),
    description: `Restore hypothesis from archive`,
    executeData: {
      hypothesisId,
    },
    undoData: {
      hypothesisId,
    },
  };
}

/**
 * Create a record evidence command
 */
export function createEvidenceCommand(
  evidence: EvidenceEntry
): SessionCommand<EvidenceRecordData> {
  return {
    id: generateCommandId(),
    type: "record_evidence",
    timestamp: new Date().toISOString(),
    description: `Record evidence: ${evidence.observation.slice(0, 40)}...`,
    executeData: { evidence },
    undoData: { evidence },
  };
}

/**
 * Create a phase transition command
 */
export function createPhaseCommand(
  previousPhase: SessionPhase,
  newPhase: SessionPhase
): SessionCommand<PhaseTransitionData> {
  return {
    id: generateCommandId(),
    type: "phase_transition",
    timestamp: new Date().toISOString(),
    description: `Phase: ${previousPhase} → ${newPhase}`,
    executeData: { phase: newPhase },
    undoData: { phase: previousPhase },
  };
}

/**
 * Create a notes update command
 */
export function createNotesCommand(
  previousNotes: string,
  newNotes: string
): SessionCommand<NotesUpdateData> {
  return {
    id: generateCommandId(),
    type: "update_notes",
    timestamp: new Date().toISOString(),
    description: "Update session notes",
    executeData: { notes: newNotes },
    undoData: { notes: previousNotes },
  };
}

/**
 * Create an add tag command
 */
export function createAddTagCommand(tag: string): SessionCommand<TagData> {
  return {
    id: generateCommandId(),
    type: "add_tag",
    timestamp: new Date().toISOString(),
    description: `Add tag: ${tag}`,
    executeData: { tag },
    undoData: { tag },
  };
}

/**
 * Create a remove tag command
 */
export function createRemoveTagCommand(tag: string): SessionCommand<TagData> {
  return {
    id: generateCommandId(),
    type: "remove_tag",
    timestamp: new Date().toISOString(),
    description: `Remove tag: ${tag}`,
    executeData: { tag },
    undoData: { tag },
  };
}

// ============================================================================
// Command Execution
// ============================================================================

/**
 * Apply a command to a session (execute direction)
 */
export function applyCommand(
  session: Session,
  command: SessionCommand
): Session {
  const updatedAt = new Date().toISOString();
  const updatedAtDate = new Date(updatedAt);

  switch (command.type) {
    case "update_confidence": {
      const data = command.executeData as ConfidenceUpdateData;
      const card = session.hypothesisCards[data.hypothesisId];
      if (!card) return session;

      return {
        ...session,
        updatedAt,
        hypothesisCards: {
          ...session.hypothesisCards,
          [data.hypothesisId]: {
            ...card,
            confidence: data.confidence,
            updatedAt: updatedAtDate,
          },
        },
      };
    }

    case "set_primary_hypothesis": {
      const data = command.executeData as HypothesisStateData;
      const previousPrimary = session.primaryHypothesisId;

      // Move previous primary to alternatives, set new primary
      return {
        ...session,
        updatedAt,
        primaryHypothesisId: data.hypothesisId,
        alternativeHypothesisIds: [
          previousPrimary,
          ...session.alternativeHypothesisIds.filter(
            (id) => id !== data.hypothesisId
          ),
        ],
      };
    }

    case "archive_hypothesis": {
      const data = command.executeData as HypothesisStateData;

      return {
        ...session,
        updatedAt,
        alternativeHypothesisIds: session.alternativeHypothesisIds.filter(
          (id) => id !== data.hypothesisId
        ),
        archivedHypothesisIds: [
          ...session.archivedHypothesisIds,
          data.hypothesisId,
        ],
      };
    }

    case "restore_hypothesis": {
      const data = command.executeData as HypothesisStateData;

      return {
        ...session,
        updatedAt,
        archivedHypothesisIds: session.archivedHypothesisIds.filter(
          (id) => id !== data.hypothesisId
        ),
        alternativeHypothesisIds: [
          ...session.alternativeHypothesisIds,
          data.hypothesisId,
        ],
      };
    }

    case "record_evidence": {
      const data = command.executeData as EvidenceRecordData;

      return {
        ...session,
        updatedAt,
        evidenceLedger: [...session.evidenceLedger, data.evidence],
      };
    }

    case "phase_transition": {
      const data = command.executeData as PhaseTransitionData;

      return {
        ...session,
        updatedAt,
        phase: data.phase,
      };
    }

    case "update_notes": {
      const data = command.executeData as NotesUpdateData;

      return {
        ...session,
        updatedAt,
        notes: data.notes,
      };
    }

    case "add_tag": {
      const data = command.executeData as TagData;
      const currentTags = session.tags ?? [];

      return {
        ...session,
        updatedAt,
        tags: [...currentTags, data.tag],
      };
    }

    case "remove_tag": {
      const data = command.executeData as TagData;
      const currentTags = session.tags ?? [];

      return {
        ...session,
        updatedAt,
        tags: currentTags.filter((t) => t !== data.tag),
      };
    }

    default:
      return session;
  }
}

/**
 * Reverse a command (undo direction)
 */
export function reverseCommand(
  session: Session,
  command: SessionCommand
): Session {
  const updatedAt = new Date().toISOString();
  const updatedAtDate = new Date(updatedAt);

  switch (command.type) {
    case "update_confidence": {
      const data = command.undoData as ConfidenceUpdateData;
      const card = session.hypothesisCards[data.hypothesisId];
      if (!card) return session;

      return {
        ...session,
        updatedAt,
        hypothesisCards: {
          ...session.hypothesisCards,
          [data.hypothesisId]: {
            ...card,
            confidence: data.confidence,
            updatedAt: updatedAtDate,
          },
        },
      };
    }

    case "set_primary_hypothesis": {
      const data = command.undoData as HypothesisStateData;
      const demotedPrimary = data.previousPrimaryId ?? session.primaryHypothesisId;

      // Swap back
      return {
        ...session,
        updatedAt,
        primaryHypothesisId: data.hypothesisId,
        alternativeHypothesisIds: [
          demotedPrimary,
          ...session.alternativeHypothesisIds.filter(
            (id) => id !== data.hypothesisId && id !== demotedPrimary
          ),
        ],
      };
    }

    case "archive_hypothesis": {
      // Undo archive = restore
      const data = command.undoData as HypothesisStateData;

      return {
        ...session,
        updatedAt,
        archivedHypothesisIds: session.archivedHypothesisIds.filter(
          (id) => id !== data.hypothesisId
        ),
        alternativeHypothesisIds: [
          ...session.alternativeHypothesisIds,
          data.hypothesisId,
        ],
      };
    }

    case "restore_hypothesis": {
      // Undo restore = archive again
      const data = command.undoData as HypothesisStateData;

      return {
        ...session,
        updatedAt,
        alternativeHypothesisIds: session.alternativeHypothesisIds.filter(
          (id) => id !== data.hypothesisId
        ),
        archivedHypothesisIds: [
          ...session.archivedHypothesisIds,
          data.hypothesisId,
        ],
      };
    }

    case "record_evidence": {
      const data = command.undoData as EvidenceRecordData;

      return {
        ...session,
        updatedAt,
        evidenceLedger: session.evidenceLedger.filter(
          (e) => e.id !== data.evidence.id
        ),
      };
    }

    case "phase_transition": {
      const data = command.undoData as PhaseTransitionData;

      return {
        ...session,
        updatedAt,
        phase: data.phase,
      };
    }

    case "update_notes": {
      const data = command.undoData as NotesUpdateData;

      return {
        ...session,
        updatedAt,
        notes: data.notes,
      };
    }

    case "add_tag": {
      // Undo add = remove
      const data = command.undoData as TagData;
      const currentTags = session.tags ?? [];

      return {
        ...session,
        updatedAt,
        tags: currentTags.filter((t) => t !== data.tag),
      };
    }

    case "remove_tag": {
      // Undo remove = add back
      const data = command.undoData as TagData;
      const currentTags = session.tags ?? [];

      return {
        ...session,
        updatedAt,
        tags: [...currentTags, data.tag],
      };
    }

    default:
      return session;
  }
}

// ============================================================================
// Stack Operations
// ============================================================================

/**
 * Execute a command and push it to the undo stack
 */
export function executeCommand(
  session: Session,
  stack: UndoStack,
  command: SessionCommand
): { session: Session; stack: UndoStack } {
  const newSession = applyCommand(session, command);

  // Clear redo stack when new command is executed
  const newHistory = [...stack.history, command];

  // Trim history if over max
  const trimmedHistory =
    newHistory.length > stack.maxHistory
      ? newHistory.slice(newHistory.length - stack.maxHistory)
      : newHistory;

  return {
    session: newSession,
    stack: {
      ...stack,
      history: trimmedHistory,
      redoStack: [], // Clear redo on new action
    },
  };
}

/**
 * Undo the last command
 */
export function undo(
  session: Session,
  stack: UndoStack
): { session: Session; stack: UndoStack } | null {
  if (stack.history.length === 0) {
    return null;
  }

  const command = stack.history[stack.history.length - 1];
  const newSession = reverseCommand(session, command);

  return {
    session: newSession,
    stack: {
      ...stack,
      history: stack.history.slice(0, -1),
      redoStack: [...stack.redoStack, command],
    },
  };
}

/**
 * Redo the last undone command
 */
export function redo(
  session: Session,
  stack: UndoStack
): { session: Session; stack: UndoStack } | null {
  if (stack.redoStack.length === 0) {
    return null;
  }

  const command = stack.redoStack[stack.redoStack.length - 1];
  const newSession = applyCommand(session, command);

  return {
    session: newSession,
    stack: {
      ...stack,
      history: [...stack.history, command],
      redoStack: stack.redoStack.slice(0, -1),
    },
  };
}

/**
 * Check if undo is available
 */
export function canUndo(stack: UndoStack): boolean {
  return stack.history.length > 0;
}

/**
 * Check if redo is available
 */
export function canRedo(stack: UndoStack): boolean {
  return stack.redoStack.length > 0;
}

/**
 * Get the description of the next undo action
 */
export function getNextUndoDescription(stack: UndoStack): string | null {
  if (stack.history.length === 0) return null;
  return stack.history[stack.history.length - 1].description;
}

/**
 * Get the description of the next redo action
 */
export function getNextRedoDescription(stack: UndoStack): string | null {
  if (stack.redoStack.length === 0) return null;
  return stack.redoStack[stack.redoStack.length - 1].description;
}

/**
 * Get recent history for display
 */
export function getRecentHistory(
  stack: UndoStack,
  limit = 10
): SessionCommand[] {
  return stack.history.slice(-limit).reverse();
}

/**
 * Clear all undo/redo history
 */
export function clearHistory(stack: UndoStack): UndoStack {
  return {
    ...stack,
    history: [],
    redoStack: [],
  };
}

// ============================================================================
// Serialization (for localStorage persistence)
// ============================================================================

/**
 * Serialize undo stack for storage
 */
export function serializeUndoStack(stack: UndoStack): string {
  return JSON.stringify({
    history: stack.history,
    redoStack: stack.redoStack,
    maxHistory: stack.maxHistory,
  });
}

/**
 * Deserialize undo stack from storage
 */
export function deserializeUndoStack(data: string): UndoStack | null {
  try {
    const parsed = JSON.parse(data);
    if (
      !Array.isArray(parsed.history) ||
      !Array.isArray(parsed.redoStack) ||
      typeof parsed.maxHistory !== "number"
    ) {
      return null;
    }
    return {
      history: parsed.history,
      redoStack: parsed.redoStack,
      maxHistory: parsed.maxHistory,
    };
  } catch {
    return null;
  }
}
