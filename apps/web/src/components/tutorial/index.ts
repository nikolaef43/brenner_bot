/**
 * Tutorial Component Library
 *
 * A comprehensive set of components for building interactive tutorials.
 * Adapted from ACFS patterns with brennerbot.org theming.
 *
 * Components:
 * - TutorialProgress: Step progress indicator (sidebar + mobile header)
 * - TutorialStep: Container for step content with navigation
 * - TutorialCodeBlock: Syntax highlighted code with copy button
 * - TutorialTip: Callout boxes (pro, warning, note, important)
 * - TutorialCheckpoint: Celebration milestone between steps
 * - TutorialPathCard: Card for selecting tutorial paths
 */

// Progress indicator
export {
  TutorialProgress,
  SidebarProgress,
  HeaderProgress,
} from "./TutorialProgress";
export type { TutorialProgressProps } from "./TutorialProgress";

// Step container
export { TutorialStep } from "./TutorialStep";
export type { TutorialStepProps } from "./TutorialStep";

// Code blocks
export { TutorialCodeBlock, InlineCode } from "./TutorialCodeBlock";
export type {
  TutorialCodeBlockProps,
  InlineCodeProps,
} from "./TutorialCodeBlock";

// Tips and callouts
export {
  TutorialTip,
  ProTip,
  Warning,
  Note,
  Important,
} from "./TutorialTip";
export type { TutorialTipProps } from "./TutorialTip";

// Checkpoints
export { TutorialCheckpoint } from "./TutorialCheckpoint";
export type { TutorialCheckpointProps } from "./TutorialCheckpoint";

// Path cards
export {
  TutorialPathCard,
  TutorialPathGrid,
} from "./TutorialPathCard";
export type {
  TutorialPathCardProps,
  TutorialPathGridProps,
  PathStatus,
} from "./TutorialPathCard";

// Prompt cards
export { PromptCard, PromptListItem } from "./PromptCard";
export type { PromptCardProps, PromptListItemProps } from "./PromptCard";

// Mobile desktop gate
export { MobileDesktopGate } from "./MobileDesktopGate";
export type { MobileDesktopGateProps } from "./MobileDesktopGate";

// Re-export types from lib
export type {
  TutorialPath,
  TutorialPathId,
  TutorialAccent,
  DifficultyLevel,
  TutorialStep as TutorialStepType,
  TutorialStepMeta,
  TroubleshootingItem,
  CheckpointData,
  CodeLanguage,
  CodeBlockData,
  CodeDiff,
  TipVariant,
  TutorialTipData,
  TutorialProgress as TutorialProgressType,
  TutorialProgressJSON,
  TutorialNavigation,
  TutorialLayoutVariant,
  TutorialLayoutProps,
} from "@/lib/tutorial-types";
