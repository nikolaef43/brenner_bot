/**
 * Brenner Loop Components
 *
 * UI components for the Brenner Loop research methodology system.
 */

export { HypothesisCard, HypothesisCardList } from "./HypothesisCard";
export type { HypothesisCardProps, HypothesisCardMode } from "./HypothesisCard";

export { HypothesisIntake } from "./HypothesisIntake";
export type { HypothesisIntakeProps } from "./HypothesisIntake";

export { HypothesisArena } from "./HypothesisArena";
export type { HypothesisArenaProps } from "./HypothesisArena";

export { ComparisonView } from "./ComparisonView";
export type { ComparisonViewProps } from "./ComparisonView";

export { HypothesisDiff } from "./HypothesisDiff";
export type { HypothesisDiffProps } from "./HypothesisDiff";

export { PredictionMatrix } from "./PredictionMatrix";
export type { PredictionMatrixProps } from "./PredictionMatrix";

export { ErrorBoundary } from "./ErrorBoundary";
export type { ErrorBoundaryProps } from "./ErrorBoundary";

export { ErrorRecoveryModal } from "./ErrorRecoveryModal";
export type { ErrorRecoveryModalProps } from "./ErrorRecoveryModal";

export { AgentProgress } from "./AgentProgress";
export type { AgentProgressProps } from "./AgentProgress";

export {
  PredictionLock,
  PredictionLockItem,
  UnlockedPredictionItem,
} from "./PredictionLock";
export type { PredictionLockProps } from "./PredictionLock";

export { SessionDashboard, PhaseTimeline, BrennerQuote, PhaseContent, PHASE_CONFIG } from "./SessionDashboard";
export type { SessionDashboardProps } from "./SessionDashboard";

export { SessionList } from "./SessionList";
export type { SessionListProps } from "./SessionList";

export { SessionCard } from "./SessionCard";
export type { SessionCardProps } from "./SessionCard";

export { HypothesisGraveyard } from "./HypothesisGraveyard";
export type { HypothesisGraveyardProps } from "./HypothesisGraveyard";

export { FalsificationCeremony } from "./FalsificationCeremony";
export type { FalsificationCeremonyProps, FalsificationCeremonyResult } from "./FalsificationCeremony";

export { DomainSelector, CompactDomainSelector } from "./DomainSelector";
export type { DomainSelectorProps, CompactDomainSelectorProps } from "./DomainSelector";
