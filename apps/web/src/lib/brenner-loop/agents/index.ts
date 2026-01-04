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
 * Fetch prompt content from the appropriate source
 */
async function fetchPromptContent(promptPath: string): Promise<string> {
  // In server context, we could read from filesystem
  // For now, return the path - actual loading will be implemented
  // when the Agent Mail integration is built
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
 * Check if a string is a valid tribunal agent role
 */
export function isTribunalAgentRole(value: unknown): value is TribunalAgentRole {
  return (
    typeof value === "string" &&
    ["devils_advocate", "experiment_designer", "brenner_channeler", "synthesis"].includes(value)
  );
}
