/**
 * Mutations Index
 *
 * Central export for all TanStack Query mutation hooks.
 * Mutations handle data modifications (POST, PUT, DELETE operations).
 */

export {
  useSessionMutation,
  isSessionMutationError,
  getSessionErrorMessage,
  SessionMutationError,
  type SessionKickoffInput,
  type SessionKickoffResult,
  type SessionKickoffError,
  type UseSessionMutationOptions,
} from "./useSessionMutation";
