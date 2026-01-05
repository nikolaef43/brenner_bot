/**
 * Tutorial Data Module
 *
 * Centralized content and data for all tutorial paths.
 * Exports step metadata, code examples, troubleshooting, and prompts.
 *
 * @module tutorial-data
 */

// Prompt templates for Agent-Assisted path
export {
  AGENT_ONBOARDING_PROMPT,
  INPUT_GENERATION_PROMPT,
  BRENNER_LOOP_PROMPT,
  ARTIFACT_REVISION_PROMPT,
  PROMPT_REGISTRY,
  getAllPrompts,
  getPromptsByTag,
  getPromptsForStep,
  fillPromptVariables,
  getAllTags,
} from "./prompts";
export type { PromptTemplate, PromptVariable } from "./prompts";

// Agent-Assisted path content
export {
  // Path metadata
  AGENT_ASSISTED_PATH,
  // Code blocks
  AA_CODE_BLOCKS,
  // Troubleshooting
  AA_TROUBLESHOOTING,
  // Checkpoints
  AA_CHECKPOINTS,
  // Review checklist
  REVIEW_CHECKLIST_GROUPS,
  ALL_CHECKLIST_ITEMS,
  // Verification (Step 4)
  VERIFICATION_QUESTIONS,
  OPERATOR_CHECKS,
  STEP_4_SUCCESS_CRITERIA,
  // Comparison data (Step 1)
  DIRECT_PROMPTING_TRAITS,
  AGENT_ASSISTED_TRAITS,
  HUMAN_PROVIDES,
  AGENT_PROVIDES,
  HIGH_LEVERAGE_REASONS,
  // Next steps (Step 8)
  AA_NEXT_STEPS,
  // Individual steps
  AA_STEP_1,
  AA_STEP_2,
  AA_STEP_3,
  AA_STEP_4,
  AA_STEP_5,
  AA_STEP_6,
  AA_STEP_7,
  AA_STEP_8,
  // Helper functions
  getAllAgentAssistedSteps,
  getAgentAssistedStep,
  getAgentAssistedStepMeta,
  getAACodeBlock,
  getAACodeBlocksForStep,
  getAATotalEstimatedTime,
  getChecklistGroup,
  getChecklistItem,
  getChecklistItemCount,
} from "./agent-assisted";
export type {
  AgentAssistedStepData,
  ChecklistItem,
  ChecklistGroup,
  VerificationQuestion,
  OperatorCheck,
} from "./agent-assisted";

// Quick Start path content
export {
  // Path metadata
  QUICK_START_PATH,
  // Code blocks
  CODE_BLOCKS,
  // Troubleshooting
  TROUBLESHOOTING,
  // Checkpoints
  CHECKPOINTS,
  // Individual steps
  STEP_1,
  STEP_2,
  STEP_3,
  STEP_4,
  STEP_5,
  STEP_6,
  STEP_7,
  // Step 7 data
  ARTIFACT_SECTIONS,
  BRENNER_OPERATORS,
  // Step 1 data
  TWO_AXIOMS,
  ARTIFACT_PREVIEW_ITEMS,
  // Step 7 next steps
  NEXT_STEPS,
  // Helper functions
  getAllQuickStartSteps,
  getQuickStartStep,
  getQuickStartStepMeta,
  getCodeBlock,
  getCodeBlocksForStep,
  getTotalEstimatedTime,
} from "./quick-start";
export type { QuickStartStepData, ArtifactSectionData } from "./quick-start";
