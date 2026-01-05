/**
 * Agent Prompts Module
 *
 * This module provides the system prompts for the multi-agent tribunal system.
 * Each agent has a distinct role in evaluating and refining hypotheses.
 *
 * @module brenner-loop/agents
 */

// ============================================================================
// Agent Role Types
// ============================================================================

/**
 * The available agent roles in the tribunal system
 */
export type TribunalAgentRole =
  | "devils_advocate"
  | "experiment_designer"
  | "statistician"
  | "brenner_channeler"
  | "synthesis";

/**
 * Configuration for a tribunal agent
 */
export interface TribunalAgentConfig {
  /** Unique identifier for the role */
  role: TribunalAgentRole;
  /** Display name for UI */
  displayName: string;
  /** Short description of the agent's purpose */
  description: string;
  /** Emoji icon for the agent */
  icon: string;
  /** Color theme for UI (Tailwind color) */
  color: string;
  /** Path to the prompt markdown file */
  promptPath: string;
}

// ============================================================================
// Agent Configurations
// ============================================================================

/**
 * Configuration for all tribunal agents
 */
export const TRIBUNAL_AGENTS: Record<TribunalAgentRole, TribunalAgentConfig> = {
  devils_advocate: {
    role: "devils_advocate",
    displayName: "Devil's Advocate",
    description: "Finds holes, steelmans alternatives, challenges assumptions",
    icon: "\u{1F534}", // Red circle
    color: "red",
    promptPath: "prompts/devils-advocate.md",
  },
  experiment_designer: {
    role: "experiment_designer",
    displayName: "Experiment Designer",
    description: "Proposes concrete, feasible study protocols",
    icon: "\u{1F7E2}", // Green circle
    color: "green",
    promptPath: "prompts/experiment-designer.md",
  },
  statistician: {
    role: "statistician",
    displayName: "Statistician",
    description: "Provides quantitative rigor (effect sizes, power, uncertainty)",
    icon: "\u{1F4CA}", // Bar chart
    color: "blue",
    promptPath: "prompts/statistician.md",
  },
  brenner_channeler: {
    role: "brenner_channeler",
    displayName: "Brenner Channeler",
    description: "Channels Sydney Brenner's voice and thinking style",
    icon: "\u{1F7E1}", // Yellow circle
    color: "yellow",
    promptPath: "prompts/brenner-channeler.md",
  },
  synthesis: {
    role: "synthesis",
    displayName: "Synthesis",
    description: "Integrates agent outputs into coherent assessment",
    icon: "\u{26A1}", // Lightning
    color: "purple",
    promptPath: "prompts/synthesis.md",
  },
};

// ============================================================================
// Prompt Loading
// ============================================================================

/**
 * Cache for loaded prompts
 */
const promptCache: Map<TribunalAgentRole, string> = new Map();

/**
 * Load a prompt file for an agent role.
 * In a browser environment, this fetches from the public directory.
 * In a Node environment, this reads from the filesystem.
 *
 * @param role - The agent role to load the prompt for
 * @returns The prompt content as a string
 */
export async function loadPrompt(role: TribunalAgentRole): Promise<string> {
  // Check cache first
  const cached = promptCache.get(role);
  if (cached) {
    return cached;
  }

  const config = TRIBUNAL_AGENTS[role];
  if (!config) {
    throw new Error(`Unknown agent role: ${role}`);
  }

  // For now, we'll return placeholder content
  // In production, this would fetch from the filesystem or API
  const prompt = await fetchPromptContent(config.promptPath);
  promptCache.set(role, prompt);
  return prompt;
}

/**
 * Fetch prompt content from the appropriate source.
 *
 * TODO: Implement actual prompt loading when Agent Mail integration is built.
 * This stub returns a placeholder - the actual prompts are in the prompts/ directory.
 */
async function fetchPromptContent(promptPath: string): Promise<string> {
  // TODO(xlk2.2): Implement actual prompt loading via:
  // - Server: fs.readFile for the markdown files
  // - Client: fetch from API route that serves prompt content
  // For now, return the path as a placeholder
  return `[Prompt at: ${promptPath}]`;
}

/**
 * Clear the prompt cache (useful for development)
 */
export function clearPromptCache(): void {
  promptCache.clear();
}

// ============================================================================
// Agent Order & Display
// ============================================================================

/**
 * The order in which agents should be invoked for a tribunal session
 */
export const TRIBUNAL_ORDER: readonly TribunalAgentRole[] = [
  "devils_advocate",
  "experiment_designer",
  "statistician",
  "brenner_channeler",
  "synthesis",
] as const;

/**
 * Get display information for all agents in tribunal order
 */
export function getTribunalAgentsInOrder(): TribunalAgentConfig[] {
  return TRIBUNAL_ORDER.map((role) => TRIBUNAL_AGENTS[role]);
}

/**
 * Get a specific agent's configuration
 */
export function getAgentConfig(
  role: TribunalAgentRole
): TribunalAgentConfig | undefined {
  return TRIBUNAL_AGENTS[role];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * All valid tribunal agent role values (derived from TRIBUNAL_AGENTS keys)
 */
const VALID_TRIBUNAL_ROLES = Object.keys(TRIBUNAL_AGENTS) as TribunalAgentRole[];

/**
 * Check if a string is a valid tribunal agent role
 */
export function isTribunalAgentRole(value: unknown): value is TribunalAgentRole {
  return (
    typeof value === "string" &&
    VALID_TRIBUNAL_ROLES.includes(value as TribunalAgentRole)
  );
}

// ============================================================================
// Agent Personas (beads njiu, oytk)
// ============================================================================

export type {
  // Phase & invocation types
  PersonaPhaseGroup,
  SessionPhase, // Deprecated alias for PersonaPhaseGroup
  InvocationTrigger,

  // Behavior & interaction types
  AgentBehavior,
  InteractionPattern,
  ToneCalibration,
  ModelConfig,

  // Main persona type
  AgentPersona,
} from "./agent-personas";

export {
  // Phase mapping
  mapSessionPhaseToPersonaGroup,

  // Individual personas
  DEVILS_ADVOCATE_PERSONA,
  EXPERIMENT_DESIGNER_PERSONA,
  STATISTICIAN_PERSONA,
  BRENNER_CHANNELER_PERSONA,
  SYNTHESIS_PERSONA,

  // Registry
  AGENT_PERSONAS,

  // Utility functions
  getPersona,
  getActivePersonasForPhase,
  getPersonasForTrigger,
  shouldInvokePersona,
  getBehaviorsByPriority,
  buildSystemPromptContext,
  getInteractionExamples,
  getModelConfig,
} from "./agent-personas";

// ============================================================================
// Agent Dispatch (bead xlk2.2)
// ============================================================================

export type {
  // Task types
  AgentTaskStatus,
  AgentTask,
  TribunalAgentResponse,
  OperatorResults,
  AgentDispatch,
  CreateDispatchOptions,
  PollOptions,
} from "./dispatch";

export {
  // Constants
  DEFAULT_DISPATCH_ROLES,
  DISPATCH_SUBJECT_PREFIX,
  FALLBACK_BRENNER_QUOTES,

  // Core functions
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
} from "./dispatch";

// ============================================================================
// Heuristic Synthesis (bead xlk2.4)
// ============================================================================

export type {
  SynthesisStrength,
  RecommendationPriority,
  SynthesisInputResponse,
  ConsensusPoint,
  ConflictPoint,
  Recommendation,
  AppliedPrinciple,
  SynthesisResult,
  SynthesisOptions,
} from "./synthesis";

export { synthesizeResponses } from "./synthesis";
