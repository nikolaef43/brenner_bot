/**
 * Thread/Session Status Computation
 *
 * Provides comprehensive, deterministic visibility into Brenner Protocol sessions:
 * - Session lifecycle phase tracking (7 distinct phases)
 * - Per-role completion status with contributor tracking
 * - Per-participant status with detailed agent info
 * - Pending acknowledgement tracking
 * - Compiled artifact detection with version extraction
 * - Rich statistics and formatted summaries
 *
 * Used by both web UI and CLI for consistent status display.
 *
 * @example
 * ```typescript
 * import { computeThreadStatus, formatThreadStatusSummary } from "./thread-status";
 *
 * // From AgentMailThread
 * const status = computeThreadStatus(thread);
 *
 * // Or from raw messages
 * const status = computeThreadStatus(messages);
 *
 * // Check completion
 * if (status.isComplete) { ... }
 *
 * // Get formatted summary
 * console.log(formatThreadStatusSummary(status));
 * ```
 *
 * @see brenner_bot-5so.3.3.2
 */

import type { AgentMailMessage, AgentMailThread } from "./agentMail";
import { getAgentRole, type AgentRole, type RoleConfig } from "./session-kickoff";

// ============================================================================
// Types
// ============================================================================

/** Brenner Protocol role types */
export type BrennerRole = AgentRole;

/** All recognized message types based on subject line patterns */
export type MessageType =
  | "kickoff"
  | "delta"
  | "compiled"
  | "critique"
  | "ack"
  | "claim"
  | "handoff"
  | "blocked"
  | "question"
  | "info"
  | "unknown";

/** Session lifecycle phases */
export type SessionPhase =
  | "not_started"        // No KICKOFF message found
  | "awaiting_responses" // KICKOFF sent, awaiting DELTAs
  | "partially_complete" // Some roles have responded
  | "awaiting_compilation" // All roles responded, no COMPILED yet
  | "compiled"           // COMPILED message exists
  | "in_critique"        // CRITIQUE messages after COMPILED
  | "closed";            // Thread explicitly closed

/** Status of a single participant/agent in the session */
export interface ParticipantStatus {
  /** Agent name */
  agentName: string;
  /** Assigned role configuration */
  role: RoleConfig;
  /** Whether this agent has responded with a DELTA */
  hasResponded: boolean;
  /** Count of messages from this agent */
  messageCount: number;
  /** Count of messages from this agent requiring ack */
  pendingAcksFromAgent: number;
  /** Timestamp of latest response */
  lastResponseAt: string | null;
  /** Whether this agent acknowledged the kickoff (if required) */
  acknowledgedKickoff: boolean;
}

/** Status of a specific role within a session */
export interface RoleStatus {
  /** The role type */
  role: BrennerRole;
  /** Display name for the role */
  displayName: string;
  /** Whether this role has at least one DELTA */
  completed: boolean;
  /** Agent names assigned to this role */
  agents: string[];
  /** Agent names that have contributed DELTAs */
  contributors: string[];
  /** Total messages from agents in this role */
  totalMessages: number;
  /** Latest DELTA message from this role */
  latestDelta: AgentMailMessage | null;
  /** Timestamp of latest contribution */
  lastUpdated: string | null;
  /** Whether all agents in this role have acknowledged */
  allAcknowledged: boolean;
}

/** Status of pending acknowledgements */
export interface AckStatus {
  /** Messages that require acknowledgement */
  pendingMessages: AgentMailMessage[];
  /** Count of agents who haven't acked */
  pendingCount: number;
  /** Agent names who haven't acknowledged yet */
  awaitingFrom: string[];
}

/** Information about a compiled artifact */
export interface ArtifactInfo {
  /** Message ID containing the artifact */
  messageId: number;
  /** The full message object */
  message: AgentMailMessage;
  /** Subject line */
  subject: string;
  /** Who compiled/sent it */
  from: string;
  /** Extracted version number (if present, e.g., "v3" → 3) */
  version: number | null;
  /** Agents that contributed DELTAs before this compilation */
  contributors: string[];
  /** Timestamp of compilation */
  compiledAt: string;
}

/** Complete thread/session status */
export interface ThreadStatus {
  /** Thread ID */
  threadId: string | null;
  /** Current session phase */
  phase: SessionPhase;
  /** Whether all expected roles have contributed */
  isComplete: boolean;
  /** Total messages in thread */
  messageCount: number;
  /** Per-participant status */
  participants: ParticipantStatus[];
  /** Per-role status (keyed by role type) */
  roles: Record<BrennerRole, RoleStatus>;
  /** Aggregated role status list (for iteration) */
  roleList: RoleStatus[];
  /** Acknowledgement tracking */
  acks: AckStatus;
  /** Latest compiled artifact (if any) */
  latestArtifact: ArtifactInfo | null;
  /** KICKOFF message (if found) */
  kickoff: AgentMailMessage | null;
  /** Summary statistics */
  stats: {
    totalDeltas: number;
    totalCritiques: number;
    totalAcks: number;
    respondedRoleCount: number;
    totalRoleCount: number;
  };
  /** Human-readable one-line summary */
  summary: string;
}

/** Parsed subject line information */
export interface ParsedSubject {
  type: MessageType;
  role?: BrennerRole;
  shorthand?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Map of subject prefix patterns to role shorthand */
const ROLE_SHORTHAND_MAP: Record<string, BrennerRole> = {
  opus: "test_designer",
  claude: "test_designer",
  gpt: "hypothesis_generator",
  codex: "hypothesis_generator",
  gemini: "adversarial_critic",
  human: "hypothesis_generator",
};

/** Regex patterns for parsing subject lines */
const SUBJECT_PATTERNS: Record<string, RegExp> = {
  kickoff: /^KICKOFF:/i,
  delta: /^DELTA\[(\w+)\]:/i,
  compiled: /^COMPILED:/i,
  critique: /^CRITIQUE:/i,
  ack: /^ACK:/i,
  claim: /^CLAIM:/i,
  handoff: /^HANDOFF:/i,
  blocked: /^BLOCKED:/i,
  question: /^QUESTION:/i,
  info: /^INFO:/i,
};

/** All Brenner Protocol roles */
const ALL_ROLES: BrennerRole[] = ["hypothesis_generator", "test_designer", "adversarial_critic"];

/** Role display names */
const ROLE_DISPLAY_NAMES: Record<BrennerRole, string> = {
  hypothesis_generator: "Hypothesis Generator",
  test_designer: "Test Designer",
  adversarial_critic: "Adversarial Critic",
};

// ============================================================================
// Parsing Helpers
// ============================================================================

/**
 * Parse a subject line to extract message type and role information.
 */
export function parseSubjectType(subject: string): ParsedSubject {
  const trimmed = subject.trim();

  // Check DELTA first (has role info embedded)
  const deltaMatch = trimmed.match(SUBJECT_PATTERNS.delta);
  if (deltaMatch) {
    const shorthand = deltaMatch[1].toLowerCase();
    const role = ROLE_SHORTHAND_MAP[shorthand];
    return { type: "delta", role, shorthand };
  }

  // Check other patterns
  for (const [type, pattern] of Object.entries(SUBJECT_PATTERNS)) {
    if (type === "delta") continue;
    if (pattern.test(trimmed)) {
      return { type: type as MessageType };
    }
  }

  // Also check for ARTIFACT keyword (legacy)
  if (/ARTIFACT/i.test(trimmed)) {
    return { type: "compiled" };
  }

  return { type: "unknown" };
}

/**
 * Extract version number from a COMPILED subject line.
 * @example "COMPILED: v3 artifact" → 3
 * @example "COMPILED: Final version" → null
 */
export function extractVersion(subject: string): number | null {
  const match = subject.match(/\bv(\d+)\b/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Infer role from an agent's program name.
 */
export function inferRoleFromProgram(program?: string): BrennerRole | null {
  if (!program) return null;
  const lower = program.toLowerCase();
  if (lower.includes("claude") || lower.includes("opus")) return "test_designer";
  if (lower.includes("codex") || lower.includes("gpt")) return "hypothesis_generator";
  if (lower.includes("gemini")) return "adversarial_critic";
  return null;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Normalize input to messages array.
 */
function normalizeInput(input: AgentMailThread | AgentMailMessage[]): {
  threadId: string | null;
  messages: AgentMailMessage[];
} {
  if (Array.isArray(input)) {
    const threadId = input.length > 0 ? input[0].thread_id ?? null : null;
    return { threadId, messages: input };
  }
  return { threadId: input.thread_id, messages: input.messages };
}

/**
 * Initialize empty role status for all roles.
 */
function initializeRoleStatuses(): Record<BrennerRole, RoleStatus> {
  const roles: Record<BrennerRole, RoleStatus> = {} as Record<BrennerRole, RoleStatus>;
  for (const role of ALL_ROLES) {
    roles[role] = {
      role,
      displayName: ROLE_DISPLAY_NAMES[role],
      completed: false,
      agents: [],
      contributors: [],
      totalMessages: 0,
      latestDelta: null,
      lastUpdated: null,
      allAcknowledged: true,
    };
  }
  return roles;
}

/**
 * Determine session phase based on current state.
 */
function determinePhase(
  hasKickoff: boolean,
  hasCompiled: boolean,
  hasCritiqueAfterCompiled: boolean,
  completedRoleCount: number,
  expectedRoleCount: number
): SessionPhase {
  if (!hasKickoff) return "not_started";
  if (hasCompiled) {
    return hasCritiqueAfterCompiled ? "in_critique" : "compiled";
  }
  if (completedRoleCount === 0) return "awaiting_responses";
  if (completedRoleCount < expectedRoleCount) return "partially_complete";
  return "awaiting_compilation";
}

/**
 * Generate a one-line summary.
 */
function generateSummary(status: Omit<ThreadStatus, "summary">): string {
  const parts: string[] = [];

  // Role completion
  parts.push(`${status.stats.respondedRoleCount}/${status.stats.totalRoleCount} roles`);

  // Pending acks
  if (status.acks.pendingCount > 0) {
    parts.push(`${status.acks.pendingCount} pending acks`);
  }

  // Phase
  parts.push(status.phase.replace(/_/g, " "));

  // Artifact
  if (status.latestArtifact) {
    const version = status.latestArtifact.version ? `v${status.latestArtifact.version}` : "";
    parts.push(`artifact${version}`);
  }

  return parts.join(" | ");
}

// ============================================================================
// Main Computation
// ============================================================================

/**
 * Compute comprehensive thread/session status.
 *
 * @param input - Either an AgentMailThread or array of AgentMailMessage
 * @param options - Optional configuration
 * @returns Complete thread status
 */
export function computeThreadStatus(
  input: AgentMailThread | AgentMailMessage[],
  options?: {
    /** Expected roles that should respond (defaults to all three) */
    expectedRoles?: BrennerRole[];
  }
): ThreadStatus {
  const { threadId, messages } = normalizeInput(input);
  const expectedRoles = options?.expectedRoles ?? ALL_ROLES;

  // Initialize tracking structures
  const roles = initializeRoleStatuses();
  const participantMap = new Map<string, ParticipantStatus>();

  let kickoff: AgentMailMessage | null = null;
  let latestCompiled: AgentMailMessage | null = null;
  let totalDeltas = 0;
  let totalCritiques = 0;
  let totalAcks = 0;

  // Sort messages by timestamp
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.created_ts).getTime() - new Date(b.created_ts).getTime()
  );

  // Track who has acked
  const ackedBy = new Set<string>();

  // Process each message
  for (const msg of sortedMessages) {
    const sender = msg.from ?? "unknown";
    const parsed = parseSubjectType(msg.subject);

    // Get or create participant status
    if (!participantMap.has(sender)) {
      participantMap.set(sender, {
        agentName: sender,
        role: getAgentRole(sender),
        hasResponded: false,
        messageCount: 0,
        pendingAcksFromAgent: 0,
        lastResponseAt: null,
        acknowledgedKickoff: false,
      });
    }
    const participant = participantMap.get(sender)!;
    participant.messageCount++;

    // Track pending acks from this agent
    if (msg.ack_required) {
      participant.pendingAcksFromAgent++;
    }

    // Update role tracking - add agent to role's agent list
    const agentRole = participant.role.role;
    if (!roles[agentRole].agents.includes(sender)) {
      roles[agentRole].agents.push(sender);
    }
    roles[agentRole].totalMessages++;

    switch (parsed.type) {
      case "kickoff":
        if (!kickoff) {
          kickoff = msg;
        }
        break;

      case "delta":
        totalDeltas++;
        participant.hasResponded = true;
        participant.lastResponseAt = msg.created_ts;

        // Determine role from DELTA shorthand or fall back to agent role
        const deltaRole = parsed.role ?? agentRole;
        const roleStatus = roles[deltaRole];
        roleStatus.completed = true;
        if (!roleStatus.contributors.includes(sender)) {
          roleStatus.contributors.push(sender);
        }
        if (!roleStatus.latestDelta || new Date(msg.created_ts) > new Date(roleStatus.latestDelta.created_ts)) {
          roleStatus.latestDelta = msg;
          roleStatus.lastUpdated = msg.created_ts;
        }
        break;

      case "compiled":
        if (!latestCompiled || new Date(msg.created_ts) > new Date(latestCompiled.created_ts)) {
          latestCompiled = msg;
        }
        break;

      case "critique":
        totalCritiques++;
        break;

      case "ack":
        totalAcks++;
        ackedBy.add(sender);
        participant.acknowledgedKickoff = true;
        break;

      default:
        // Other message types (question, info, etc.) count as responses
        if (parsed.type !== "unknown") {
          participant.hasResponded = true;
          participant.lastResponseAt = msg.created_ts;
        }
    }
  }

  // Update role acknowledgement status
  for (const role of ALL_ROLES) {
    const roleAgents = roles[role].agents;
    roles[role].allAcknowledged = roleAgents.length === 0 || roleAgents.every((a) => ackedBy.has(a));
  }

  // Compute pending acks
  const awaitingFrom: string[] = [];
  if (kickoff?.ack_required) {
    const recipients = new Set([...(kickoff.to ?? []), ...(kickoff.cc ?? [])]);
    for (const recipient of recipients) {
      if (!ackedBy.has(recipient)) {
        awaitingFrom.push(recipient);
      }
    }
  }

  // Determine phase
  const completedRoles = expectedRoles.filter((r) => roles[r].completed);
  const hasCritiqueAfterCompiled = latestCompiled
    ? sortedMessages.some(
        (m) =>
          parseSubjectType(m.subject).type === "critique" &&
          new Date(m.created_ts).getTime() > new Date(latestCompiled!.created_ts).getTime()
      )
    : false;

  const phase = determinePhase(
    kickoff !== null,
    latestCompiled !== null,
    hasCritiqueAfterCompiled,
    completedRoles.length,
    expectedRoles.length
  );

  // Build artifact info
  let latestArtifact: ArtifactInfo | null = null;
  if (latestCompiled) {
    const compiledTime = new Date(latestCompiled.created_ts).getTime();
    const contributors = sortedMessages
      .filter(
        (m) =>
          parseSubjectType(m.subject).type === "delta" &&
          new Date(m.created_ts).getTime() < compiledTime &&
          m.from
      )
      .map((m) => m.from!)
      .filter((v, i, a) => a.indexOf(v) === i);

    latestArtifact = {
      messageId: latestCompiled.id,
      message: latestCompiled,
      subject: latestCompiled.subject,
      from: latestCompiled.from ?? "unknown",
      version: extractVersion(latestCompiled.subject),
      contributors,
      compiledAt: latestCompiled.created_ts,
    };
  }

  // Build result
  const participants = Array.from(participantMap.values());
  const roleList = ALL_ROLES.map((r) => roles[r]);
  const isComplete = expectedRoles.every((r) => roles[r].completed);

  const statusWithoutSummary = {
    threadId,
    phase,
    isComplete,
    messageCount: messages.length,
    participants,
    roles,
    roleList,
    acks: {
      pendingMessages: kickoff?.ack_required && awaitingFrom.length > 0 ? [kickoff] : [],
      pendingCount: awaitingFrom.length,
      awaitingFrom,
    },
    latestArtifact,
    kickoff,
    stats: {
      totalDeltas,
      totalCritiques,
      totalAcks,
      respondedRoleCount: completedRoles.length,
      totalRoleCount: expectedRoles.length,
    },
  };

  return {
    ...statusWithoutSummary,
    summary: generateSummary(statusWithoutSummary),
  };
}

// ============================================================================
// Formatting
// ============================================================================

/** Phase emoji indicators */
const PHASE_EMOJI: Record<SessionPhase, string> = {
  not_started: "⬜",
  awaiting_responses: "🟡",
  partially_complete: "🟠",
  awaiting_compilation: "🔵",
  compiled: "🟢",
  in_critique: "🟣",
  closed: "⬛",
};

/**
 * Format thread status as a detailed multi-line summary.
 */
export function formatThreadStatusSummary(status: ThreadStatus): string {
  const lines: string[] = [];

  // Header
  lines.push(`${PHASE_EMOJI[status.phase]} Thread: ${status.threadId ?? "(no thread)"}`);
  lines.push(`Phase: ${status.phase.replace(/_/g, " ")}`);
  lines.push("");

  // Role completion
  lines.push("Roles:");
  for (const roleStatus of status.roleList) {
    const icon = roleStatus.completed ? "✅" : "⏳";
    const contributors =
      roleStatus.contributors.length > 0
        ? ` (${roleStatus.contributors.join(", ")})`
        : roleStatus.agents.length > 0
          ? ` [${roleStatus.agents.join(", ")}]`
          : "";
    lines.push(`  ${icon} ${roleStatus.displayName}${contributors}`);
  }
  lines.push("");

  // Pending acks
  if (status.acks.pendingCount > 0) {
    lines.push(`⚠️  Awaiting ACK from: ${status.acks.awaitingFrom.join(", ")}`);
    lines.push("");
  }

  // Artifact info
  if (status.latestArtifact) {
    const version = status.latestArtifact.version ? `v${status.latestArtifact.version}` : "latest";
    lines.push(`📄 Compiled artifact: ${version}`);
    lines.push(`   From: ${status.latestArtifact.from}`);
    lines.push(`   Contributors: ${status.latestArtifact.contributors.join(", ") || "none"}`);
    lines.push(`   Compiled at: ${status.latestArtifact.compiledAt}`);
    lines.push("");
  }

  // Stats
  const { totalDeltas, totalCritiques, totalAcks } = status.stats;
  lines.push(`📊 Stats: ${totalDeltas} deltas, ${totalCritiques} critiques, ${totalAcks} acks, ${status.messageCount} total`);
  lines.push(`👥 Participants: ${status.participants.map((p) => p.agentName).join(", ") || "none"}`);

  return lines.join("\n");
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if a thread needs attention (pending acks or incomplete).
 */
export function threadNeedsAttention(status: ThreadStatus): boolean {
  return (
    status.acks.pendingCount > 0 ||
    (status.phase !== "compiled" && status.phase !== "closed" && status.phase !== "not_started")
  );
}

/**
 * Get roles that are still pending.
 */
export function getPendingRoles(status: ThreadStatus): BrennerRole[] {
  return status.roleList.filter((r) => !r.completed).map((r) => r.role);
}

/**
 * Check if a thread is waiting for a specific role.
 */
export function isWaitingForRole(input: AgentMailThread | AgentMailMessage[], role: BrennerRole): boolean {
  const status = computeThreadStatus(input);
  return !status.roles[role].completed;
}

/**
 * Get the agents who haven't responded yet.
 */
export function getPendingAgents(input: AgentMailThread | AgentMailMessage[]): string[] {
  const status = computeThreadStatus(input);
  return status.participants.filter((p) => !p.hasResponded).map((p) => p.agentName);
}

/**
 * Get the agents who have pending acknowledgements.
 */
export function getAgentsWithPendingAcks(input: AgentMailThread | AgentMailMessage[]): string[] {
  const status = computeThreadStatus(input);
  return status.acks.awaitingFrom;
}

/**
 * Compute a minimal status summary for list views.
 */
export function computeThreadStatusSummary(input: AgentMailThread | AgentMailMessage[]): {
  threadId: string | null;
  phase: SessionPhase;
  respondedRoleCount: number;
  totalRoleCount: number;
  pendingAcks: number;
  hasArtifact: boolean;
  isComplete: boolean;
  summary: string;
} {
  const status = computeThreadStatus(input);
  return {
    threadId: status.threadId,
    phase: status.phase,
    respondedRoleCount: status.stats.respondedRoleCount,
    totalRoleCount: status.stats.totalRoleCount,
    pendingAcks: status.acks.pendingCount,
    hasArtifact: status.latestArtifact !== null,
    isComplete: status.isComplete,
    summary: status.summary,
  };
}
