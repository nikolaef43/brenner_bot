/**
 * Brenner Protocol Session Kickoff
 *
 * Implements deterministic session kickoff with role-specific prompts.
 * Per brenner_bot-5so.3.2.1: "one command/click can start a session deterministically"
 *
 * Usage:
 * ```typescript
 * import { composeKickoffMessages, AGENT_ROLES, type KickoffConfig } from "./session-kickoff";
 *
 * const config: KickoffConfig = {
 *   threadId: "RS-20251230-cell-fate",
 *   researchQuestion: "How do cells choose between lineage and gradient-based fate determination?",
 *   context: "The Brenner transcript discusses...",
 *   excerpt: "§58: Brenner emphasized 'reduction to one dimension'...",
 *   recipients: ["Codex", "Opus", "Gemini"],
 * };
 *
 * const messages = composeKickoffMessages(config);
 * // Returns array of { to, subject, body, ackRequired } per recipient
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/** Agent role assignment for Brenner Protocol sessions */
export type AgentRole = "hypothesis_generator" | "test_designer" | "adversarial_critic";

/** Role configuration with model and operator info */
export interface RoleConfig {
  role: AgentRole;
  displayName: string;
  model: string;
  operators: string[];
  description: string;
}

/** Map of agent names to their assigned roles */
export const AGENT_ROLES: Record<string, RoleConfig> = {
  // Codex / GPT agents → Hypothesis Generator
  Codex: {
    role: "hypothesis_generator",
    displayName: "Hypothesis Generator",
    model: "GPT-5.2",
    operators: ["⊘ Level-Split", "⊕ Cross-Domain", "◊ Paradox-Hunt"],
    description: "Generate hypotheses by hunting paradoxes and importing cross-domain patterns",
  },
  "codex-cli": {
    role: "hypothesis_generator",
    displayName: "Hypothesis Generator",
    model: "GPT-5.2",
    operators: ["⊘ Level-Split", "⊕ Cross-Domain", "◊ Paradox-Hunt"],
    description: "Generate hypotheses by hunting paradoxes and importing cross-domain patterns",
  },

  // Claude / Opus agents → Test Designer
  Opus: {
    role: "test_designer",
    displayName: "Test Designer",
    model: "Claude Opus 4.5",
    operators: ["✂ Exclusion-Test", "⌂ Materialize", "⟂ Object-Transpose", "🎭 Potency-Check"],
    description: "Design discriminative tests with potency controls",
  },
  Claude: {
    role: "test_designer",
    displayName: "Test Designer",
    model: "Claude Opus 4.5",
    operators: ["✂ Exclusion-Test", "⌂ Materialize", "⟂ Object-Transpose", "🎭 Potency-Check"],
    description: "Design discriminative tests with potency controls",
  },
  "claude-code": {
    role: "test_designer",
    displayName: "Test Designer",
    model: "Claude Opus 4.5",
    operators: ["✂ Exclusion-Test", "⌂ Materialize", "⟂ Object-Transpose", "🎭 Potency-Check"],
    description: "Design discriminative tests with potency controls",
  },

  // Gemini agents → Adversarial Critic
  Gemini: {
    role: "adversarial_critic",
    displayName: "Adversarial Critic",
    model: "Gemini 3",
    operators: ["ΔE Exception-Quarantine", "† Theory-Kill", "⊞ Scale-Check"],
    description: "Attack the framing, check scale constraints, quarantine anomalies",
  },
  "gemini-cli": {
    role: "adversarial_critic",
    displayName: "Adversarial Critic",
    model: "Gemini 3",
    operators: ["ΔE Exception-Quarantine", "† Theory-Kill", "⊞ Scale-Check"],
    description: "Attack the framing, check scale constraints, quarantine anomalies",
  },
};

/** Default role for unknown agents */
export const DEFAULT_ROLE: RoleConfig = {
  role: "hypothesis_generator",
  displayName: "Research Collaborator",
  model: "Unknown",
  operators: ["⊘ Level-Split", "⊕ Cross-Domain"],
  description: "Contribute hypotheses and analysis",
};

/** Configuration for a session kickoff */
export interface KickoffConfig {
  /** Thread ID for the session (e.g., "RS-20251230-cell-fate") */
  threadId: string;
  /** One-sentence problem statement */
  researchQuestion: string;
  /** 2-4 sentences of essential background */
  context: string;
  /** Relevant transcript excerpt(s) with §n citations */
  excerpt: string;
  /** Optional MEMORY CONTEXT (cass-memory) section markdown (include header + provenance) */
  memoryContext?: string;
  /** List of agent names to receive kickoff */
  recipients: string[];
  /** Optional seed hypotheses */
  initialHypotheses?: string;
  /** Optional constraints (time bounds, scope limits) */
  constraints?: string;
  /** Optional specific requested outputs */
  requestedOutputs?: string;
}

/** A composed kickoff message ready to send */
export interface KickoffMessage {
  /** Recipient agent name */
  to: string;
  /** Message subject */
  subject: string;
  /** Message body (markdown) */
  body: string;
  /** Always true for KICKOFF messages */
  ackRequired: true;
  /** Role assigned to this agent */
  role: RoleConfig;
}

// ============================================================================
// Role Prompt Sections
// ============================================================================

/**
 * Get the role-specific system prompt section.
 * These are condensed versions of the prompts in role_prompts_v0.1.md
 */
function getRolePromptSection(role: RoleConfig): string {
  let promptSection: string;

  switch (role.role) {
    case "hypothesis_generator":
      promptSection = `## Your Role: ${role.displayName}

You generate candidate hypotheses by hunting for paradoxes, importing cross-domain patterns, and rigorously separating levels of explanation.

**Primary Operators**: ${role.operators.join(", ")}

**You MUST**:
1. Always include a "third alternative" hypothesis (both others could be wrong)
2. Never conflate different levels (program/interpreter, message/machine)
3. Cite transcript anchors (§n) when referencing Brenner's views
4. Output structured deltas, not narrative prose
5. Apply ⊘ Level-Split before proposing any mechanism

**Citation**: Use \`(§n)\` for Brenner quotes, \`[inference]\` for your reasoning.

**Output Format**: Use \`\`\`delta blocks with operation: "ADD", section: "hypothesis_slate"`;
      break;

    case "test_designer":
      promptSection = `## Your Role: ${role.displayName}

You convert hypotheses into discriminative tests—experiments designed to KILL models, not just collect data. Every test must include a potency check.

**Primary Operators**: ${role.operators.join(", ")}

**You MUST**:
1. Design tests that maximize "evidence per week" (likelihood ratio × speed / ambiguity)
2. Include a potency check for every test (chastity vs impotence control)
3. Score every test on the 4-dimension rubric (0-3 each)
4. Consider object transposition—is there a better experimental system?
5. Cite transcript anchors (§n) when referencing Brenner's experimental approach

**Scoring Rubric**: likelihood_ratio, cost, speed, ambiguity (0-3 each)

**Output Format**: Use \`\`\`delta blocks with operation: "ADD", section: "discriminative_tests"`;
      break;

    case "adversarial_critic":
      promptSection = `## Your Role: ${role.displayName}

You attack the current framing. You find what would make everything wrong. You check scale constraints and quarantine anomalies. You are the immune system against self-deception.

**Primary Operators**: ${role.operators.join(", ")}

**You MUST**:
1. Calculate actual numbers (scale checks) before accepting any mechanism
2. Quarantine anomalies explicitly—never sweep them under the carpet
3. Kill theories when they "go ugly"—don't let attachment persist
4. Propose real third alternatives, not just "both wrong"
5. Cite transcript anchors (§n) when invoking Brenner's epistemic hygiene

**Output Sections**: anomaly_register, adversarial_critique, assumption_ledger (for scale checks)

**Output Format**: Use \`\`\`delta blocks with appropriate section and operation`;
      break;

    default:
      promptSection = `## Your Role: ${role.displayName}

${role.description}

**Primary Operators**: ${role.operators.join(", ")}

**Output Format**: Use \`\`\`delta blocks per delta_output_format_v0.1.md`;
      break;
  }

  return promptSection;
}

// ============================================================================
// Message Composition
// ============================================================================

/**
 * Get the role configuration for an agent name.
 * Falls back to DEFAULT_ROLE for unknown agents.
 */
export function getAgentRole(agentName: string): RoleConfig {
  // Check exact match first
  if (agentName in AGENT_ROLES) {
    return AGENT_ROLES[agentName];
  }

  // Check lowercase match
  const lowerName = agentName.toLowerCase();
  for (const [key, config] of Object.entries(AGENT_ROLES)) {
    if (key.toLowerCase() === lowerName) {
      return config;
    }
  }

  // Check if name contains known keywords
  if (lowerName.includes("codex") || lowerName.includes("gpt")) {
    return AGENT_ROLES["Codex"];
  }
  if (lowerName.includes("claude") || lowerName.includes("opus")) {
    return AGENT_ROLES["Opus"];
  }
  if (lowerName.includes("gemini")) {
    return AGENT_ROLES["Gemini"];
  }

  return DEFAULT_ROLE;
}

const ROLE_DELTA_SUBJECT_TAG: Record<AgentRole, string> = {
  hypothesis_generator: "gpt",
  test_designer: "opus",
  adversarial_critic: "gemini",
};

/**
 * Compose the kickoff message body for a specific agent.
 */
function composeKickoffBody(config: KickoffConfig, role: RoleConfig): string {
  const sections: string[] = [];

  // Title
  sections.push(`# Brenner Protocol Session: ${config.threadId}`);
  sections.push("");

  // Role assignment
  sections.push(getRolePromptSection(role));
  sections.push("");

  // Research question (becomes RT in artifact)
  sections.push("## Research Question");
  sections.push(config.researchQuestion);
  sections.push("");

  // Context
  sections.push("## Context");
  sections.push(config.context);
  sections.push("");

  // Excerpt
  sections.push("## Transcript Excerpt");
  sections.push(config.excerpt);
  sections.push("");

  // Optional: Memory context (cass-memory)
  if (config.memoryContext) {
    sections.push(config.memoryContext.trim());
    sections.push("");
  }

  // Optional: Initial hypotheses
  if (config.initialHypotheses) {
    sections.push("## Initial Hypotheses (Seed)");
    sections.push(config.initialHypotheses);
    sections.push("");
  }

  // Optional: Constraints
  if (config.constraints) {
    sections.push("## Constraints");
    sections.push(config.constraints);
    sections.push("");
  }

  // Requested outputs
  sections.push("## Requested Outputs");
  if (config.requestedOutputs) {
    sections.push(config.requestedOutputs);
  } else {
    switch (role.role) {
      case "hypothesis_generator":
        sections.push("- 2-4 hypotheses including a third alternative");
        sections.push("- Each with claim, mechanism, and transcript anchors");
        break;
      case "test_designer":
        sections.push("- 2-3 discriminative tests for each hypothesis pair");
        sections.push("- Each with procedure, expected outcomes, potency check, and scores");
        break;
      case "adversarial_critic":
        sections.push("- Scale checks for any quantitative claims");
        sections.push("- Explicit anomaly quarantine for contradictions");
        sections.push("- At least one real third alternative critique");
        break;
    }
  }
  sections.push("");

  // Instructions
  sections.push("## Response Format");
  const deltaTag = ROLE_DELTA_SUBJECT_TAG[role.role];
  sections.push(`Reply to this thread with subject \`DELTA[${deltaTag}]: <description>\`.`);
  sections.push("(Role tags: hypotheses → `gpt`/`codex`; tests → `opus`/`claude`; critique → `gemini`.)");
  sections.push("Include your reasoning as prose, followed by `## Deltas` with your structured contributions.");
  sections.push("");

  return sections.join("\n");
}

/**
 * Compose kickoff messages for all recipients.
 * Each recipient gets a role-specific message.
 */
export function composeKickoffMessages(config: KickoffConfig): KickoffMessage[] {
  return config.recipients.map((recipient) => {
    const role = getAgentRole(recipient);
    const subject = `KICKOFF: [${config.threadId}] ${config.researchQuestion.slice(0, 60)}${config.researchQuestion.length > 60 ? "..." : ""}`;
    const body = composeKickoffBody(config, role);

    return {
      to: recipient,
      subject,
      body,
      ackRequired: true,
      role,
    };
  });
}

/**
 * Compose a single unified kickoff message (for simple cases).
 * This sends the same content to all recipients without role differentiation.
 */
export function composeUnifiedKickoff(config: KickoffConfig): {
  subject: string;
  body: string;
  ackRequired: true;
} {
  const sections: string[] = [];

  sections.push(`# Brenner Protocol Session: ${config.threadId}`);
  sections.push("");
  sections.push("## Research Question");
  sections.push(config.researchQuestion);
  sections.push("");
  sections.push("## Context");
  sections.push(config.context);
  sections.push("");
  sections.push("## Transcript Excerpt");
  sections.push(config.excerpt);
  sections.push("");

  if (config.memoryContext) {
    sections.push(config.memoryContext.trim());
    sections.push("");
  }

  if (config.initialHypotheses) {
    sections.push("## Initial Hypotheses");
    sections.push(config.initialHypotheses);
    sections.push("");
  }

  if (config.constraints) {
    sections.push("## Constraints");
    sections.push(config.constraints);
    sections.push("");
  }

  if (config.requestedOutputs) {
    sections.push("## Requested Outputs");
    sections.push(config.requestedOutputs);
    sections.push("");
  }

  const subject = `KICKOFF: [${config.threadId}] ${config.researchQuestion.slice(0, 60)}${config.researchQuestion.length > 60 ? "..." : ""}`;

  return {
    subject,
    body: sections.join("\n"),
    ackRequired: true,
  };
}
