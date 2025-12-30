# Agent Mail Integration Contracts v0.1

> **Status**: Draft specification
> **Purpose**: Document Agent Mail MCP contracts Brenner Bot relies on
> **Depends on**: MCP Agent Mail server (`github.com/Dicklesworthstone/mcp_agent_mail`)

---

## Overview

Brenner Bot uses Agent Mail as its coordination substrate for multi-agent research workflows. This document specifies:

1. Which MCP tools we call and their required parameters
2. Which resources we read (with URI templates)
3. Encoding and error-handling gotchas
4. Fail-soft vs fail-closed behavior by context

---

## Connection Configuration

Agent Mail is accessed via HTTP-based MCP (JSON-RPC 2.0 over HTTP POST).

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_MAIL_BASE_URL` | `http://127.0.0.1:8765` | Server host:port |
| `AGENT_MAIL_PATH` | `/mcp/` | MCP endpoint path |
| `AGENT_MAIL_BEARER_TOKEN` | (none) | Optional Bearer auth |

### Endpoint Construction

```
{AGENT_MAIL_BASE_URL}{AGENT_MAIL_PATH}
Example: http://127.0.0.1:8765/mcp/
```

---

## Required Tools

### Core Session Setup

These tools are called in sequence to establish an agent session:

#### 1. `health_check`

Check if the server is ready before sending messages.

```json
{
  "method": "tools/call",
  "params": {
    "name": "health_check",
    "arguments": {}
  }
}
```

**Response**: `{ "status": "ready" }` on success.

#### 2. `ensure_project`

Create or verify the project exists. MUST be called before any other project-scoped operations.

```json
{
  "method": "tools/call",
  "params": {
    "name": "ensure_project",
    "arguments": {
      "human_key": "/data/projects/brenner_bot"
    }
  }
}
```

**Parameters**:
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `human_key` | string | Yes | **Absolute path** to working directory |

**Response**: Returns `{ slug, human_key, created_at }`.

**Critical**: `human_key` MUST be an absolute path (e.g., `/data/projects/brenner_bot`), NOT a relative path or arbitrary slug.

#### 3. `register_agent`

Register the current agent identity within the project.

```json
{
  "method": "tools/call",
  "params": {
    "name": "register_agent",
    "arguments": {
      "project_key": "/data/projects/brenner_bot",
      "name": "GreenDog",
      "program": "claude-code",
      "model": "opus-4.5",
      "task_description": "Protocol kernel development"
    }
  }
}
```

**Parameters**:
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `project_key` | string | Yes | Absolute path (same as `human_key`) |
| `name` | string | No | Preferred name (server may assign different) |
| `program` | string | No | `claude-code`, `codex-cli`, `gemini-cli` |
| `model` | string | No | `opus-4.5`, `gpt-5.2`, `gemini-3` |
| `task_description` | string | No | Brief description of agent's focus |

**Response**: Returns assigned identity including `{ id, name, program, model, ... }`.

**Note**: The server may assign a different name than requested (e.g., `SilverPeak` → `ChartreuseStone`).

---

### Messaging

#### 4. `send_message`

Send a message to one or more recipients.

```json
{
  "method": "tools/call",
  "params": {
    "name": "send_message",
    "arguments": {
      "project_key": "/data/projects/brenner_bot",
      "sender_name": "GreenDog",
      "to": ["BlueMountain", "RedForest"],
      "subject": "KICKOFF: Cell fate investigation",
      "body_md": "# Research Session\n\n...",
      "thread_id": "RS-20251230-cell-fate",
      "ack_required": true
    }
  }
}
```

**Parameters**:
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `project_key` | string | Yes | Absolute path |
| `sender_name` | string | Yes | Must match registered agent name |
| `to` | string[] | Yes | List of recipient agent names |
| `subject` | string | Yes | Message subject (use prefix conventions) |
| `body_md` | string | Yes | Markdown message body |
| `thread_id` | string | No | Thread identifier (use thread conventions) |
| `ack_required` | boolean | No | Request explicit acknowledgement |
| `cc` | string[] | No | Carbon copy recipients |
| `bcc` | string[] | No | Blind carbon copy recipients |
| `importance` | string | No | `low`, `normal`, `high` |

**Subject convention**: Use prefixes from `thread_subject_conventions_v0.1.md`:
- `KICKOFF:`, `DELTA[role]:`, `COMPILED:`, `CRITIQUE:`, `ACK:`, `CLAIM:`, `INFO:`

#### 5. `reply_message`

Reply to an existing message (inherits thread).

```json
{
  "method": "tools/call",
  "params": {
    "name": "reply_message",
    "arguments": {
      "project_key": "/data/projects/brenner_bot",
      "message_id": "msg-uuid-123",
      "sender_name": "BlueMountain",
      "body_md": "## Response\n\n..."
    }
  }
}
```

#### 6. `fetch_inbox`

Retrieve messages for an agent without mutating read/ack state.

```json
{
  "method": "tools/call",
  "params": {
    "name": "fetch_inbox",
    "arguments": {
      "project_key": "/data/projects/brenner_bot",
      "agent_name": "GreenDog",
      "limit": 20,
      "unread_only": true
    }
  }
}
```

**Parameters**:
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `project_key` | string | Yes | Absolute path |
| `agent_name` | string | Yes | Agent whose inbox to fetch |
| `limit` | number | No | Max messages to return (default: 20) |
| `unread_only` | boolean | No | Filter to unread only |
| `urgent_only` | boolean | No | Filter to ack_required only |
| `thread_id` | string | No | Filter to specific thread |

#### 7. `mark_message_read`

Mark a message as read.

```json
{
  "method": "tools/call",
  "params": {
    "name": "mark_message_read",
    "arguments": {
      "project_key": "/data/projects/brenner_bot",
      "message_id": "msg-uuid-123",
      "agent_name": "GreenDog"
    }
  }
}
```

#### 8. `acknowledge_message`

Acknowledge a message (also marks as read).

```json
{
  "method": "tools/call",
  "params": {
    "name": "acknowledge_message",
    "arguments": {
      "project_key": "/data/projects/brenner_bot",
      "message_id": "msg-uuid-123",
      "agent_name": "GreenDog",
      "ack_body": "Received and understood"
    }
  }
}
```

---

### Search & Discovery

#### 9. `search_messages`

Full-text search over messages in a project.

```json
{
  "method": "tools/call",
  "params": {
    "name": "search_messages",
    "arguments": {
      "project_key": "/data/projects/brenner_bot",
      "query": "hypothesis slate",
      "limit": 10
    }
  }
}
```

**Note**: Supports SQLite FTS5 syntax (phrase search, boolean operators).

#### 10. `summarize_thread`

Get participants, key points, and action items for a thread.

```json
{
  "method": "tools/call",
  "params": {
    "name": "summarize_thread",
    "arguments": {
      "project_key": "/data/projects/brenner_bot",
      "thread_id": "RS-20251230-cell-fate"
    }
  }
}
```

---

### File Reservations

Advisory leases to prevent agents from clobbering each other's edits.

#### 11. `file_reservation_paths`

Request file reservations on paths/globs.

```json
{
  "method": "tools/call",
  "params": {
    "name": "file_reservation_paths",
    "arguments": {
      "project_key": "/data/projects/brenner_bot",
      "agent_name": "GreenDog",
      "paths": ["apps/web/src/**"],
      "ttl_seconds": 3600,
      "exclusive": true
    }
  }
}
```

**Parameters**:
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `paths` | string[] | Yes | Glob patterns relative to project |
| `ttl_seconds` | number | No | Lease duration (default: 600) |
| `exclusive` | boolean | No | Exclusive lock (default: false) |

**Response**: Granted reservations or `FILE_RESERVATION_CONFLICT` error.

#### 12. `release_file_reservations`

Release held reservations.

```json
{
  "method": "tools/call",
  "params": {
    "name": "release_file_reservations",
    "arguments": {
      "project_key": "/data/projects/brenner_bot",
      "agent_name": "GreenDog",
      "paths": ["apps/web/src/**"]
    }
  }
}
```

#### 13. `renew_file_reservations`

Extend expiry without reissuing.

```json
{
  "method": "tools/call",
  "params": {
    "name": "renew_file_reservations",
    "arguments": {
      "project_key": "/data/projects/brenner_bot",
      "agent_name": "GreenDog",
      "paths": ["apps/web/src/**"],
      "new_ttl_seconds": 3600
    }
  }
}
```

---

### Macro Helpers

Higher-level operations that combine multiple tool calls.

#### 14. `macro_start_session`

Boot a project session (ensure_project + register_agent + optional reservations).

```json
{
  "method": "tools/call",
  "params": {
    "name": "macro_start_session",
    "arguments": {
      "project_key": "/data/projects/brenner_bot",
      "agent_name": "GreenDog",
      "program": "claude-code",
      "model": "opus-4.5",
      "task_description": "Protocol development",
      "reserve_paths": ["apps/web/src/**"]
    }
  }
}
```

#### 15. `macro_prepare_thread`

Align an agent with an existing thread (register + summarize).

```json
{
  "method": "tools/call",
  "params": {
    "name": "macro_prepare_thread",
    "arguments": {
      "project_key": "/data/projects/brenner_bot",
      "agent_name": "GreenDog",
      "thread_id": "RS-20251230-cell-fate"
    }
  }
}
```

---

## Resource URIs

Resources are read via `resources/read` method with URI templates.

### Template Syntax

```
resource://{type}/{identifier}?project={encoded_path}&{params}
```

**Critical**: The `project` query parameter MUST be **URL-encoded**:
```
/data/projects/brenner_bot → %2Fdata%2Fprojects%2Fbrenner_bot
```

### Available Resources

#### `resource://agents/{project_slug}`

List agents in a project.

```json
{
  "method": "resources/read",
  "params": {
    "uri": "resource://agents/data-projects-brenner-bot"
  }
}
```

**Note**: Project slug is derived from the absolute path (lowercase, hyphenated).

#### `resource://inbox/{agent_name}`

Read agent's inbox.

```json
{
  "method": "resources/read",
  "params": {
    "uri": "resource://inbox/GreenDog?project=%2Fdata%2Fprojects%2Fbrenner_bot&limit=20"
  }
}
```

#### `resource://thread/{thread_id}`

Read a specific thread.

```json
{
  "method": "resources/read",
  "params": {
    "uri": "resource://thread/RS-20251230-cell-fate?project=%2Fdata%2Fprojects%2Fbrenner_bot&include_bodies=true"
  }
}
```

---

## URL Encoding Helper

Absolute paths in query parameters MUST be URL-encoded:

```typescript
function encodeProjectKey(path: string): string {
  return encodeURIComponent(path);
}

// Usage
const uri = `resource://inbox/${agentName}?project=${encodeProjectKey(projectPath)}&limit=20`;
```

**Examples**:
| Raw Path | Encoded |
|----------|---------|
| `/data/projects/brenner_bot` | `%2Fdata%2Fprojects%2Fbrenner_bot` |
| `/home/user/my project` | `%2Fhome%2Fuser%2Fmy%20project` |

---

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Agent 'X' not found` | Agent not registered | Call `register_agent` first |
| `FILE_RESERVATION_CONFLICT` | Another agent holds the path | Wait or adjust patterns |
| `Project not found` | `ensure_project` not called | Call `ensure_project` first |
| `Invalid project_key` | Relative path provided | Use absolute path |
| `Connection refused` | Server not running | Start Agent Mail server |

### SSE Responses

Some operations may return Server-Sent Events (SSE) streams. The client MUST:
1. Check `Content-Type` header for `text/event-stream`
2. Parse SSE format if streaming
3. Present actionable errors to the user

Current client implementation handles this by accepting both `application/json` and `text/event-stream` in the `Accept` header.

---

## Fail-Soft vs Fail-Closed

Behavior varies by context:

### Public Web (brennerbot.org)

**Fail-soft**: If Agent Mail is unavailable:
- Corpus browsing continues to work
- Lab mode features show "Agent Mail unavailable" gracefully
- No hard errors on public pages

### Lab Mode (authenticated)

**Fail-closed**: Agent Mail failures should:
- Show clear error messages
- Prevent session initiation
- Block kickoff sending

### CLI (`brenner.ts`)

**Fail-closed**: Agent Mail failures should:
- Return non-zero exit codes
- Print clear error messages to stderr
- Abort operations cleanly

---

## Request/Response Format

### JSON-RPC 2.0 Request

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": { ... }
  }
}
```

### JSON-RPC 2.0 Response (Success)

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "content": [ ... ],
    "structuredContent": { ... },
    "isError": false
  }
}
```

### JSON-RPC 2.0 Response (Error)

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "content": [
      { "type": "text", "text": "Error message" }
    ],
    "isError": true
  }
}
```

---

## Implementation Reference

### Web Client (`apps/web/src/lib/agentMail.ts`)

```typescript
class AgentMailClient {
  constructor(config?: Partial<AgentMailConfig>);
  toolsList(): Promise<JsonValue>;
  toolsCall(name: string, args: Record<string, JsonValue>): Promise<JsonValue>;
  resourcesRead(uri: string): Promise<JsonValue>;
}
```

### CLI Client (`brenner.ts`)

Duplicated implementation with same interface. See `brenner_bot-5so.3.1.2` for unification plan.

---

## Typical Workflow

1. **Health check**: `health_check` → verify server ready
2. **Ensure project**: `ensure_project` → get project slug
3. **Register agent**: `register_agent` → get assigned identity
4. **Reserve files** (optional): `file_reservation_paths` → prevent conflicts
5. **Send messages**: `send_message` → coordinate with other agents
6. **Fetch inbox**: `fetch_inbox` → check for responses
7. **Acknowledge**: `acknowledge_message` → confirm receipt
8. **Release reservations**: `release_file_reservations` → cleanup

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-30 | Initial draft |
