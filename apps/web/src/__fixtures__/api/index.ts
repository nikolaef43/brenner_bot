/**
 * API Response Fixtures
 *
 * Realistic API response fixtures for testing HTTP clients,
 * error handling, and response parsing.
 *
 * Philosophy: NO mocks - use data that mirrors real API responses.
 */

// ============================================================================
// Types
// ============================================================================

export interface AgentMailMessage {
  id: number;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  body_md: string;
  importance: "low" | "normal" | "high" | "urgent";
  ack_required: boolean;
  created_ts: string;
  read_ts?: string;
  ack_ts?: string;
  thread_id?: string;
  attachments?: string[];
}

export interface AgentMailInbox {
  project: string;
  agent: string;
  count: number;
  messages: AgentMailMessage[];
}

export interface AgentMailThread {
  project: string;
  thread_id: string;
  messages: AgentMailMessage[];
}

export interface AgentProfile {
  id: number;
  name: string;
  program: string;
  model: string;
  task_description: string;
  inception_ts: string;
  last_active_ts: string;
  project_id: number;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: string | number;
  result?: T;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// ============================================================================
// Agent Mail Success Fixtures
// ============================================================================

/**
 * Agent Mail inbox with messages.
 */
export const agentMailInboxFixture: AgentMailInbox = {
  project: "/data/projects/brenner_bot",
  agent: "TestAgent",
  count: 3,
  messages: [
    {
      id: 1,
      subject: "KICKOFF: RS-20251230-role-prompting",
      from: "Operator",
      to: ["TestAgent", "OtherAgent"],
      body_md: `# Research Session Kickoff

## Research Question
Does role-separated prompting improve Brenner-style artifact quality?

## Excerpts
§103: "You've forgotten there's a third alternative."
§105: "Exclusion is always a tremendously good thing."

## Instructions
Please contribute hypothesis deltas following the Brenner Protocol.`,
      importance: "high",
      ack_required: true,
      created_ts: "2025-12-30T22:30:00Z",
      thread_id: "RS-20251230-role-prompting",
    },
    {
      id: 2,
      subject: "Re: RS-20251230-role-prompting",
      from: "OtherAgent",
      to: ["TestAgent"],
      body_md: `I've added my hypothesis delta. Please review.`,
      importance: "normal",
      ack_required: false,
      created_ts: "2025-12-30T22:45:00Z",
      thread_id: "RS-20251230-role-prompting",
    },
    {
      id: 3,
      subject: "Hello from PinkHill",
      from: "PinkHill",
      to: ["TestAgent"],
      body_md: `Just introducing myself. I'm working on testing infrastructure.`,
      importance: "low",
      ack_required: false,
      created_ts: "2025-12-30T23:00:00Z",
    },
  ],
};

/**
 * Empty inbox.
 */
export const emptyInboxFixture: AgentMailInbox = {
  project: "/data/projects/brenner_bot",
  agent: "NewAgent",
  count: 0,
  messages: [],
};

/**
 * Thread with conversation.
 */
export const agentMailThreadFixture: AgentMailThread = {
  project: "/data/projects/brenner_bot",
  thread_id: "RS-20251230-role-prompting",
  messages: [
    {
      id: 1,
      subject: "KICKOFF: RS-20251230-role-prompting",
      from: "Operator",
      to: ["Agent1", "Agent2", "Agent3"],
      body_md: "Research session kickoff message...",
      importance: "high",
      ack_required: true,
      created_ts: "2025-12-30T22:30:00Z",
      thread_id: "RS-20251230-role-prompting",
    },
    {
      id: 5,
      subject: "Re: RS-20251230-role-prompting",
      from: "Agent1",
      to: ["Operator"],
      body_md: "My hypothesis delta contribution...",
      importance: "normal",
      ack_required: false,
      created_ts: "2025-12-30T22:35:00Z",
      thread_id: "RS-20251230-role-prompting",
    },
    {
      id: 8,
      subject: "Re: RS-20251230-role-prompting",
      from: "Agent2",
      to: ["Operator"],
      body_md: "My test delta contribution...",
      importance: "normal",
      ack_required: false,
      created_ts: "2025-12-30T22:40:00Z",
      thread_id: "RS-20251230-role-prompting",
    },
    {
      id: 12,
      subject: "Re: RS-20251230-role-prompting",
      from: "Agent3",
      to: ["Operator"],
      body_md: "My critique delta contribution...",
      importance: "normal",
      ack_required: false,
      created_ts: "2025-12-30T22:45:00Z",
      thread_id: "RS-20251230-role-prompting",
    },
    {
      id: 15,
      subject: "COMPILED: RS-20251230-role-prompting",
      from: "Operator",
      to: ["Agent1", "Agent2", "Agent3"],
      body_md: "Compiled artifact attached...",
      importance: "high",
      ack_required: true,
      created_ts: "2025-12-30T23:00:00Z",
      thread_id: "RS-20251230-role-prompting",
    },
  ],
};

/**
 * Agent profile response.
 */
export const agentProfileFixture: AgentProfile = {
  id: 137,
  name: "PinkHill",
  program: "claude-code",
  model: "opus-4.5",
  task_description: "Testing infrastructure implementation",
  inception_ts: "2025-12-31T03:54:34Z",
  last_active_ts: "2025-12-31T03:54:34Z",
  project_id: 8,
};

/**
 * List of agents response.
 */
export const agentListFixture: AgentProfile[] = [
  agentProfileFixture,
  {
    id: 135,
    name: "FuchsiaCastle",
    program: "codex-cli",
    model: "gpt-5.2",
    task_description: "Science Mode v0 beads",
    inception_ts: "2025-12-31T03:50:03Z",
    last_active_ts: "2025-12-31T03:53:28Z",
    project_id: 8,
  },
  {
    id: 136,
    name: "LilacBear",
    program: "claude-code",
    model: "opus-4.5",
    task_description: "Bug hunting and beads work",
    inception_ts: "2025-12-31T03:50:28Z",
    last_active_ts: "2025-12-31T03:51:27Z",
    project_id: 8,
  },
];

// ============================================================================
// Agent Mail Error Fixtures
// ============================================================================

/**
 * Agent not found error.
 */
export const agentNotFoundErrorFixture: JsonRpcError = {
  code: -32000,
  message: "Agent 'UnknownAgent' not found in project",
  data: { agent_name: "UnknownAgent", project_key: "/data/projects/brenner_bot" },
};

/**
 * Project not found error.
 */
export const projectNotFoundErrorFixture: JsonRpcError = {
  code: -32001,
  message: "Project not found",
  data: { project_key: "/nonexistent/path" },
};

/**
 * File reservation conflict error.
 */
export const fileReservationConflictErrorFixture: JsonRpcError = {
  code: -32002,
  message: "FILE_RESERVATION_CONFLICT: Path already reserved by another agent",
  data: {
    path: "apps/web/src/lib/artifact-merge.ts",
    holder: "OtherAgent",
    expires_at: "2025-12-31T04:00:00Z",
  },
};

/**
 * Rate limit error.
 */
export const rateLimitErrorFixture: JsonRpcError = {
  code: -32003,
  message: "Rate limit exceeded. Please wait before retrying.",
  data: { retry_after_seconds: 60 },
};

// ============================================================================
// HTTP Error Fixtures
// ============================================================================

/**
 * 400 Bad Request.
 */
export const error400Fixture = {
  status: 400,
  error: "Bad Request",
  message: "Invalid request body: missing required field 'subject'",
  details: {
    field: "subject",
    constraint: "required",
  },
};

/**
 * 401 Unauthorized.
 */
export const error401Fixture = {
  status: 401,
  error: "Unauthorized",
  message: "Invalid or expired authentication token",
};

/**
 * 403 Forbidden.
 */
export const error403Fixture = {
  status: 403,
  error: "Forbidden",
  message: "You do not have permission to access this resource",
  requiredRole: "admin",
};

/**
 * 404 Not Found.
 */
export const error404Fixture = {
  status: 404,
  error: "Not Found",
  message: "The requested resource was not found",
  path: "/api/sessions/nonexistent-id",
};

/**
 * 409 Conflict.
 */
export const error409Fixture = {
  status: 409,
  error: "Conflict",
  message: "Resource already exists with this ID",
  existingId: "session-001",
};

/**
 * 422 Unprocessable Entity.
 */
export const error422Fixture = {
  status: 422,
  error: "Unprocessable Entity",
  message: "Validation failed",
  validationErrors: [
    { field: "research_question", message: "Must be at least 10 characters" },
    { field: "excerpts", message: "Must include at least one excerpt" },
  ],
};

/**
 * 429 Too Many Requests.
 */
export const error429Fixture = {
  status: 429,
  error: "Too Many Requests",
  message: "Rate limit exceeded",
  retryAfter: 60,
};

/**
 * 500 Internal Server Error.
 */
export const error500Fixture = {
  status: 500,
  error: "Internal Server Error",
  message: "An unexpected error occurred",
  requestId: "req-abc123",
};

/**
 * 502 Bad Gateway.
 */
export const error502Fixture = {
  status: 502,
  error: "Bad Gateway",
  message: "Agent Mail server is unavailable",
};

/**
 * 503 Service Unavailable.
 */
export const error503Fixture = {
  status: 503,
  error: "Service Unavailable",
  message: "Service is temporarily unavailable. Please try again later.",
  retryAfter: 300,
};

/**
 * 504 Gateway Timeout.
 */
export const error504Fixture = {
  status: 504,
  error: "Gateway Timeout",
  message: "Request timed out while waiting for Agent Mail response",
};

// ============================================================================
// JSON-RPC Response Fixtures
// ============================================================================

/**
 * Successful JSON-RPC response.
 */
export const jsonRpcSuccessFixture: JsonRpcResponse<{ ok: true }> = {
  jsonrpc: "2.0",
  id: "1",
  result: { ok: true },
};

/**
 * JSON-RPC error response.
 */
export const jsonRpcErrorFixture: JsonRpcResponse = {
  jsonrpc: "2.0",
  id: "1",
  error: agentNotFoundErrorFixture,
};

/**
 * JSON-RPC parse error.
 */
export const jsonRpcParseErrorFixture: JsonRpcResponse = {
  jsonrpc: "2.0",
  id: null as unknown as string,
  error: {
    code: -32700,
    message: "Parse error: Invalid JSON",
  },
};

/**
 * JSON-RPC method not found.
 */
export const jsonRpcMethodNotFoundFixture: JsonRpcResponse = {
  jsonrpc: "2.0",
  id: "1",
  error: {
    code: -32601,
    message: "Method not found: unknown_method",
  },
};
