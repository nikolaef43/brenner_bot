/**
 * Agent Dispatch Module
 *
 * Implements the agent dispatch system for the Brenner Loop tribunal.
 * Agents are dispatched via Agent Mail to analyze hypotheses and provide
 * multi-perspective feedback.
 *
 * @module brenner-loop/agents/dispatch
 * @see brenner_bot-xlk2.2 (Implement Agent Dispatch via Agent Mail)
 */

import type { AgentMailMessage } from "../../agentMail";
import { AgentMailClient } from "../../agentMail";
import type { HypothesisCard } from "../hypothesis";
// NOTE: Import directly from agent-personas to avoid circular dependency with index.ts
// (index.ts re-exports from both agent-personas.ts and dispatch.ts)
import type { TribunalAgentRole } from "./index";
import { getPersona, buildSystemPromptContext } from "./agent-personas";
import type {
  LevelSplitResult,
  ExclusionTestResult,
  ObjectTransposeResult,
  ScaleCheckResult,
} from "../types";

// ============================================================================
// Types
// ============================================================================

/**
 * Status of an agent task
 */
export type AgentTaskStatus =
  | "pending"     // Not yet dispatched
  | "dispatched"  // Message sent, awaiting response
  | "received"    // Response received
  | "error";      // Error occurred

/**
 * A task representing a single agent's involvement
 */
export interface AgentTask {
  /** The agent's role */
  role: TribunalAgentRole;

  /** Current status */
  status: AgentTaskStatus;

  /** Agent Mail message ID for the dispatch */
  messageId?: number;

  /** When the task was dispatched */
  dispatchedAt?: string;

  /** The agent's response (if received) */
  response?: TribunalAgentResponse;

  /** Error message if status is "error" */
  error?: string;
}

/**
 * A response from a tribunal agent
 */
export interface TribunalAgentResponse {
  /** The agent's role */
  role: TribunalAgentRole;

  /** Response content (markdown) */
  content: string;

  /** When the response was received */
  receivedAt: string;

  /** Agent Mail message ID */
  messageId: number;

  /** The responding agent's name */
  agentName?: string;
}

/**
 * Operator results collected for context
 */
export interface OperatorResults {
  levelSplit?: LevelSplitResult[];
  exclusionTest?: ExclusionTestResult[];
  objectTranspose?: ObjectTransposeResult[];
  scaleCheck?: ScaleCheckResult[];
}

/**
 * The full dispatch state for a tribunal session
 */
export interface AgentDispatch {
  /** Session ID this dispatch belongs to */
  sessionId: string;

  /** Agent Mail thread ID for this tribunal */
  threadId: string;

  /** The hypothesis being analyzed */
  hypothesis: HypothesisCard;

  /** Operator results for context */
  operatorResults: OperatorResults;

  /** Tasks for each agent role */
  tasks: AgentTask[];

  /** All responses collected */
  responses: TribunalAgentResponse[];

  /** Timestamp when dispatch was created */
  createdAt: string;

  /** Whether the tribunal is complete */
  complete: boolean;
}

/**
 * Configuration for creating a new dispatch
 */
export interface CreateDispatchOptions {
  /** Session ID */
  sessionId: string;

  /** Hypothesis to analyze */
  hypothesis: HypothesisCard;

  /** Operator results for context */
  operatorResults?: OperatorResults;

  /** Agent Mail project key (absolute path) */
  projectKey: string;

  /** Sender agent name for dispatches */
  senderName: string;

  /** Which roles to dispatch to (defaults to all except synthesis) */
  roles?: TribunalAgentRole[];
}

/**
 * Options for polling for responses
 */
export interface PollOptions {
  /** Agent Mail project key */
  projectKey: string;

  /** Agent name to check inbox for */
  agentName: string;

  /** Maximum number of messages to fetch */
  limit?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default roles to dispatch to (synthesis comes after others complete)
 */
export const DEFAULT_DISPATCH_ROLES: TribunalAgentRole[] = [
  "devils_advocate",
  "experiment_designer",
  "brenner_channeler",
];

/**
 * Subject prefix for tribunal dispatch messages
 */
export const DISPATCH_SUBJECT_PREFIX = "TRIBUNAL[";

/**
 * Curated Brenner quotes for fallback when agents unavailable
 */
export const FALLBACK_BRENNER_QUOTES = [
  { quote: "You've got to really find out.", section: "§12" },
  { quote: "Exclusion is always a tremendously good thing in science.", section: "§58" },
  { quote: "The choice of the experimental object remains one of the most important things.", section: "§78" },
  { quote: "Both could be wrong, you know.", section: "§102" },
  { quote: "Before you fall in love with your hypothesis, try to kill it.", section: "§45" },
];

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Create a new agent dispatch for a tribunal session.
 * Initializes tasks for each role but does not send messages yet.
 */
export function createDispatch(options: CreateDispatchOptions): AgentDispatch {
  const roles = options.roles ?? DEFAULT_DISPATCH_ROLES;

  const tasks: AgentTask[] = roles.map((role) => ({
    role,
    status: "pending",
  }));

  return {
    sessionId: options.sessionId,
    threadId: "", // Will be set when first message is sent
    hypothesis: options.hypothesis,
    operatorResults: options.operatorResults ?? {},
    tasks,
    responses: [],
    createdAt: new Date().toISOString(),
    complete: false,
  };
}

/**
 * Generate a thread ID for a tribunal session
 */
export function generateThreadId(sessionId: string): string {
  const timestamp = Date.now().toString(36);
  return `TRIBUNAL-${sessionId}-${timestamp}`;
}

/**
 * Format a hypothesis for inclusion in agent prompts
 */
export function formatHypothesisForPrompt(hypothesis: HypothesisCard): string {
  const lines: string[] = [
    "## Hypothesis Under Review",
    "",
    `**ID**: ${hypothesis.id}`,
    "",
    `**Statement**: ${hypothesis.statement}`,
    "",
    `**Mechanism**: ${hypothesis.mechanism}`,
    "",
    `**Domain**: ${hypothesis.domain.length > 0 ? hypothesis.domain.join(", ") : "Not specified"}`,
    "",
  ];

  if (hypothesis.impossibleIfTrue && hypothesis.impossibleIfTrue.length > 0) {
    lines.push("**Would Falsify**:");
    hypothesis.impossibleIfTrue.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }

  if (hypothesis.predictionsIfTrue && hypothesis.predictionsIfTrue.length > 0) {
    lines.push("**Predictions if True**:");
    hypothesis.predictionsIfTrue.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }

  if (hypothesis.predictionsIfFalse && hypothesis.predictionsIfFalse.length > 0) {
    lines.push("**Predictions if False**:");
    hypothesis.predictionsIfFalse.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }

  if (hypothesis.confounds && hypothesis.confounds.length > 0) {
    lines.push("**Identified Confounds**:");
    hypothesis.confounds.forEach((c) => {
      lines.push(`- ${c.name}: ${c.description}`);
    });
    lines.push("");
  }

  if (hypothesis.assumptions && hypothesis.assumptions.length > 0) {
    lines.push("**Explicit Assumptions**:");
    hypothesis.assumptions.forEach((a) => lines.push(`- ${a}`));
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format operator results for inclusion in agent prompts
 */
export function formatOperatorResultsForPrompt(results: OperatorResults): string {
  const sections: string[] = [];

  if (results.levelSplit && results.levelSplit.length > 0) {
    sections.push("## Level Split Results (Σ)");
    results.levelSplit.forEach((r) => {
      sections.push(`- Applied at: ${r.appliedAt}`);
      if (r.conflationDetected) {
        sections.push(`- Conflation detected: ${r.conflationDescription ?? "Yes"}`);
      }
      r.levels.forEach((l) => {
        sections.push(`  - **${l.name}** (${l.levelType}): ${l.description}`);
      });
    });
    sections.push("");
  }

  if (results.exclusionTest && results.exclusionTest.length > 0) {
    sections.push("## Exclusion Test Results (⊘)");
    results.exclusionTest.forEach((r) => {
      r.designedTests.forEach((t) => {
        sections.push(`- **${t.name}**: ${t.procedure}`);
        sections.push(`  Could exclude: ${t.couldExclude.join(", ")}`);
      });
    });
    sections.push("");
  }

  if (results.objectTranspose && results.objectTranspose.length > 0) {
    sections.push("## Object Transpose Results (⟳)");
    results.objectTranspose.forEach((r) => {
      sections.push(`- Original system: ${r.originalSystem}`);
      if (r.selectedSystem) {
        sections.push(`- Selected alternative: ${r.selectedSystem}`);
        sections.push(`- Rationale: ${r.selectionRationale ?? "Not specified"}`);
      }
    });
    sections.push("");
  }

  if (results.scaleCheck && results.scaleCheck.length > 0) {
    sections.push("## Scale Check Results (⊙)");
    results.scaleCheck.forEach((r) => {
      sections.push(`- Plausible: ${r.plausible ? "Yes" : "No"}`);
      r.calculations.forEach((c) => {
        sections.push(`  - ${c.name}: ${c.result} ${c.units} → ${c.implication}`);
      });
      if (r.ruledOutByScale.length > 0) {
        sections.push(`- Ruled out by scale: ${r.ruledOutByScale.join(", ")}`);
      }
    });
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Build the full prompt body for an agent role
 */
export function buildAgentPrompt(
  role: TribunalAgentRole,
  hypothesis: HypothesisCard,
  operatorResults: OperatorResults
): string {
  const persona = getPersona(role);
  const systemContext = buildSystemPromptContext(role);
  const hypothesisContext = formatHypothesisForPrompt(hypothesis);
  const operatorContext = formatOperatorResultsForPrompt(operatorResults);

  const parts: string[] = [
    "# Tribunal Analysis Request",
    "",
    systemContext,
    "",
    "---",
    "",
    hypothesisContext,
  ];

  if (operatorContext.trim()) {
    parts.push("---", "", operatorContext);
  }

  parts.push(
    "---",
    "",
    "## Your Task",
    "",
    `As the ${persona.displayName}, please analyze this hypothesis according to your mandate.`,
    "",
    `${persona.corePurpose}`,
    "",
    "Provide your analysis in markdown format. Be specific and actionable.",
    ""
  );

  return parts.join("\n");
}

/**
 * Dispatch a single agent task via Agent Mail
 */
export async function dispatchAgentTask(
  client: AgentMailClient,
  dispatch: AgentDispatch,
  role: TribunalAgentRole,
  options: {
    projectKey: string;
    senderName: string;
    recipients: string[];
  }
): Promise<{ messageId: number } | { error: string }> {
  const promptBody = buildAgentPrompt(role, dispatch.hypothesis, dispatch.operatorResults);

  const subject = `${DISPATCH_SUBJECT_PREFIX}${role}]: ${dispatch.hypothesis.id}`;

  try {
    const result = await client.toolsCall("send_message", {
      project_key: options.projectKey,
      sender_name: options.senderName,
      to: options.recipients,
      subject,
      body_md: promptBody,
      thread_id: dispatch.threadId || null,
      importance: "normal",
      ack_required: false,
    });

    // Extract message ID from result
    if (result && typeof result === "object" && "deliveries" in result) {
      const deliveries = (result as { deliveries?: Array<{ payload?: { id?: number } }> }).deliveries;
      if (deliveries && deliveries.length > 0 && deliveries[0].payload?.id) {
        return { messageId: deliveries[0].payload.id };
      }
    }

    return { error: "Failed to extract message ID from response" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

/**
 * Dispatch all pending tasks in a tribunal
 */
export async function dispatchAllTasks(
  client: AgentMailClient,
  dispatch: AgentDispatch,
  options: {
    projectKey: string;
    senderName: string;
    recipients: string[];
  }
): Promise<AgentDispatch> {
  // Generate thread ID if not set
  if (!dispatch.threadId) {
    dispatch = {
      ...dispatch,
      threadId: generateThreadId(dispatch.sessionId),
    };
  }

  const updatedTasks: AgentTask[] = [];

  for (const task of dispatch.tasks) {
    if (task.status !== "pending") {
      updatedTasks.push(task);
      continue;
    }

    const result = await dispatchAgentTask(client, dispatch, task.role, options);

    if ("messageId" in result) {
      updatedTasks.push({
        ...task,
        status: "dispatched",
        messageId: result.messageId,
        dispatchedAt: new Date().toISOString(),
      });
    } else {
      updatedTasks.push({
        ...task,
        status: "error",
        error: result.error,
      });
    }
  }

  return {
    ...dispatch,
    tasks: updatedTasks,
  };
}

/**
 * Check for responses to dispatched tasks
 */
export async function pollForResponses(
  client: AgentMailClient,
  dispatch: AgentDispatch,
  options: PollOptions
): Promise<AgentDispatch> {
  if (!dispatch.threadId) {
    return dispatch;
  }

  try {
    const thread = await client.readThread({
      projectKey: options.projectKey,
      threadId: dispatch.threadId,
      includeBodies: true,
    });

    const newResponses: TribunalAgentResponse[] = [...dispatch.responses];
    const updatedTasks: AgentTask[] = [];

    for (const task of dispatch.tasks) {
      // Skip if already received or not dispatched
      if (task.status === "received" || task.status === "pending") {
        updatedTasks.push(task);
        continue;
      }

      // Look for responses to this task
      // TODO: This matching logic is fragile - a message with "re:" in subject would
      // match ANY task. Consider using reply_to field or stricter subject matching
      // (e.g., require the role name to appear in responses, or use thread structure).
      const responseMessage = thread.messages.find((msg: AgentMailMessage) => {
        // A response should be:
        // 1. Not the original dispatch message
        // 2. Have body content
        // 3. Related to this role (contains role name in subject)
        if (!msg.body_md) return false;
        if (msg.id === task.messageId) return false;

        // Check if this message is a response to our dispatch
        // Prefer role-specific matching, fall back to generic reply indicators
        const hasRoleName = msg.subject?.toLowerCase().includes(task.role.toLowerCase());
        const isGenericReply =
          msg.subject?.toLowerCase().includes("re:") ||
          msg.subject?.toLowerCase().includes("response");

        // Prioritize role-specific matches
        return hasRoleName || isGenericReply;
      });

      if (responseMessage && responseMessage.body_md) {
        const response: TribunalAgentResponse = {
          role: task.role,
          content: responseMessage.body_md,
          receivedAt: responseMessage.created_ts,
          messageId: responseMessage.id,
          agentName: responseMessage.from,
        };

        // Only add if not already in responses
        if (!newResponses.some((r) => r.messageId === response.messageId)) {
          newResponses.push(response);
        }

        updatedTasks.push({
          ...task,
          status: "received",
          response,
        });
      } else {
        updatedTasks.push(task);
      }
    }

    // Check if all tasks are complete
    const allReceived = updatedTasks.every(
      (t) => t.status === "received" || t.status === "error"
    );

    return {
      ...dispatch,
      tasks: updatedTasks,
      responses: newResponses,
      complete: allReceived,
    };
  } catch (err) {
    // Polling failed, return unchanged
    console.error("Failed to poll for responses:", err);
    return dispatch;
  }
}

/**
 * Check if tribunal agents are available (any registered in project)
 */
export async function checkAgentAvailability(
  client: AgentMailClient,
  projectKey: string
): Promise<{ available: boolean; agents: string[] }> {
  try {
    const result = await client.resourcesRead(`resource://agents/${projectKey}`);

    // Parse the response
    if (result && typeof result === "object" && "contents" in result) {
      const contents = (result as { contents?: Array<{ text?: string }> }).contents;
      if (contents && contents.length > 0 && contents[0].text) {
        const data = JSON.parse(contents[0].text) as {
          agents?: Array<{ name: string; program: string }>;
        };
        const agents = data.agents
          ?.filter((a) => a.program !== "brenner-cli") // Exclude orchestrator agents
          .map((a) => a.name) ?? [];

        return { available: agents.length > 0, agents };
      }
    }

    return { available: false, agents: [] };
  } catch {
    return { available: false, agents: [] };
  }
}

/**
 * Get fallback content when agents are unavailable.
 * Returns self-reflection questions and Brenner quotes to guide the user.
 *
 * @param _hypothesis - Reserved for future use (could customize questions based on hypothesis)
 */
export function getFallbackContent(_hypothesis: HypothesisCard): {
  status: "unavailable";
  quotes: typeof FALLBACK_BRENNER_QUOTES;
  selfReflectionQuestions: string[];
} {
  const selfReflectionQuestions = [
    "What would it take to convince you that your hypothesis is wrong?",
    "What is the strongest alternative explanation you can think of?",
    "What hidden assumptions are you making?",
    "If both leading theories are wrong, what would that look like?",
    "What is the simplest experiment that could rule out your hypothesis?",
  ];

  return {
    status: "unavailable",
    quotes: FALLBACK_BRENNER_QUOTES,
    selfReflectionQuestions,
  };
}

/**
 * Get the completion status of a dispatch
 */
export function getDispatchStatus(dispatch: AgentDispatch): {
  pending: number;
  dispatched: number;
  received: number;
  errors: number;
  total: number;
  complete: boolean;
} {
  const counts = {
    pending: 0,
    dispatched: 0,
    received: 0,
    errors: 0,
    total: dispatch.tasks.length,
    complete: dispatch.complete,
  };

  for (const task of dispatch.tasks) {
    switch (task.status) {
      case "pending":
        counts.pending++;
        break;
      case "dispatched":
        counts.dispatched++;
        break;
      case "received":
        counts.received++;
        break;
      case "error":
        counts.errors++;
        break;
    }
  }

  return counts;
}
