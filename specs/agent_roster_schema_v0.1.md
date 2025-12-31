# Brenner Protocol: Agent Roster Schema v0.1

> **Status**: Draft specification
> **Purpose**: Define canonical representation of agent-to-role mappings for multi-agent sessions
> **Depends on**: `role_prompts_v0.1.md`, `agent_mail_contracts_v0.1.md`

---

## Overview

An **agent roster** maps Agent Mail identity names (e.g., `BlueLake`, `PurpleMountain`) to Brenner Protocol roles. This explicit mapping replaces the heuristic string-matching approach (checking if names contain "Codex", "Claude", etc.) that fails for real Agent Mail identities.

### Why This Matters

The Brenner Loop relies on **division of labor**:
- Hypothesis Generator: hunts paradoxes, imports cross-domain patterns
- Test Designer: designs discriminative tests with potency controls
- Adversarial Critic: attacks framing, checks scale constraints

Without explicit role assignment, all agents receive the same prompt or incorrect role prompts, losing the multi-model advantage.

---

## Core Types

### AgentRole

The three canonical roles in the Brenner Protocol:

```typescript
type AgentRole =
  | "hypothesis_generator"  // Primary: Codex/GPT
  | "test_designer"         // Primary: Opus/Claude
  | "adversarial_critic";   // Primary: Gemini
```

### RosterEntry

A single agent-to-role mapping:

```typescript
interface RosterEntry {
  /** Agent Mail identity name (e.g., "BlueLake"). REQUIRED. */
  agentName: string;

  /** Assigned role for this session. REQUIRED. */
  role: AgentRole;

  /** CLI tool used to run this agent. Optional. */
  program?: "codex-cli" | "claude-code" | "gemini-cli" | string;

  /** Model identifier (human-readable). Optional. */
  model?: string;

  /** Free-form notes for audit trail. Optional. */
  notes?: string;
}
```

### Roster

A complete roster for a session:

```typescript
interface Roster {
  /** List of agent-to-role mappings. At least one entry required. */
  entries: RosterEntry[];

  /** Mode indicator. Default: "role_separated". */
  mode?: "role_separated" | "unified";

  /** Human-readable name for this roster. Optional. */
  name?: string;

  /** When this roster was created/last modified. Optional. */
  createdAt?: string;  // ISO 8601
}
```

### RosterPreset

A saved roster configuration for reuse:

```typescript
interface RosterPreset {
  /** Unique identifier for this preset. REQUIRED. */
  id: string;

  /** Display name. REQUIRED. */
  name: string;

  /** Description of when to use this preset. Optional. */
  description?: string;

  /** The roster entries. REQUIRED. */
  entries: Omit<RosterEntry, "agentName">[];

  /** Placeholder names that get replaced at runtime. Optional. */
  placeholderNames?: string[];
}
```

---

## Roster Modes

### Role-Separated Mode (Default)

Each recipient gets a role-specific prompt. This is the standard Brenner Protocol approach.

```typescript
const roster: Roster = {
  mode: "role_separated",
  entries: [
    { agentName: "BlueLake", role: "hypothesis_generator", program: "codex-cli" },
    { agentName: "PurpleMountain", role: "test_designer", program: "claude-code" },
    { agentName: "GreenValley", role: "adversarial_critic", program: "gemini-cli" },
  ],
};
```

### Unified Mode

All recipients get the same prompt (no role differentiation). Useful for simple sessions or when using a single powerful model.

```typescript
const roster: Roster = {
  mode: "unified",
  entries: [
    { agentName: "BlueLake", role: "hypothesis_generator" },  // Role ignored in unified mode
    { agentName: "PurpleMountain", role: "hypothesis_generator" },
  ],
};
```

---

## Edge Cases and Rules

### Rule 1: No Duplicate Agents

Each `agentName` may appear at most once in a roster. Attempting to add the same agent twice is an error.

```typescript
// ERROR: BlueLake appears twice
const invalid: Roster = {
  entries: [
    { agentName: "BlueLake", role: "hypothesis_generator" },
    { agentName: "BlueLake", role: "test_designer" },  // INVALID
  ],
};
```

### Rule 2: Duplicate Roles ARE Allowed

Multiple agents may share the same role (for "more brains" mode):

```typescript
// VALID: Two hypothesis generators
const valid: Roster = {
  entries: [
    { agentName: "BlueLake", role: "hypothesis_generator" },
    { agentName: "RedSky", role: "hypothesis_generator" },  // OK
    { agentName: "PurpleMountain", role: "test_designer" },
  ],
};
```

### Rule 3: Missing Mapping = Error

If a recipient is in the `recipients` list but not in the roster, the kickoff MUST fail with a clear error. No silent fallback to DEFAULT_ROLE.

```typescript
// ERROR: "GreenValley" in recipients but not in roster
composeKickoffMessages({
  recipients: ["BlueLake", "PurpleMountain", "GreenValley"],  // 3 recipients
  roster: {
    entries: [
      { agentName: "BlueLake", role: "hypothesis_generator" },
      { agentName: "PurpleMountain", role: "test_designer" },
      // GreenValley missing!
    ],
  },
  // ...
});
// → Error: "Missing roster entry for recipient: GreenValley"
```

### Rule 4: Extra Roster Entries Are Allowed

The roster may contain entries for agents not in the recipients list. This allows presets to be reused.

```typescript
// VALID: Roster has extra entries
composeKickoffMessages({
  recipients: ["BlueLake"],  // 1 recipient
  roster: {
    entries: [
      { agentName: "BlueLake", role: "hypothesis_generator" },
      { agentName: "PurpleMountain", role: "test_designer" },  // Extra, ignored
    ],
  },
});
// → OK: Only BlueLake gets a message
```

### Rule 5: Role Validation

The `role` field must be one of the three canonical roles. Unknown roles are errors.

```typescript
// ERROR: Invalid role
const invalid: RosterEntry = {
  agentName: "BlueLake",
  role: "researcher",  // INVALID - not a canonical role
};
```

---

## Loading Precedence

Roster configuration can come from multiple sources. The precedence order (highest to lowest):

1. **CLI flags** (`--roster`, `--agent-role`)
2. **Environment variables** (`BRENNER_ROSTER_*`)
3. **Session-specific config** (web form, API payload)
4. **Project config** (`brenner.config.ts` or `.brennerrc`)
5. **Preset lookup** (if `--preset` flag used)

### CLI Flag Examples

```bash
# Explicit per-agent mapping
brenner session start \
  --to BlueLake --role hypothesis_generator \
  --to PurpleMountain --role test_designer \
  --to GreenValley --role adversarial_critic

# Using a preset
brenner session start --preset default-3-agent \
  --to BlueLake --to PurpleMountain --to GreenValley

# Inline JSON roster
brenner session start --roster '[
  {"agentName":"BlueLake","role":"hypothesis_generator"},
  {"agentName":"PurpleMountain","role":"test_designer"}
]'
```

### Config File Example

```typescript
// brenner.config.ts
export default {
  roster: {
    presets: [
      {
        id: "default-3-agent",
        name: "Default 3-Agent Setup",
        description: "Standard Brenner Protocol with Codex/Opus/Gemini",
        entries: [
          { role: "hypothesis_generator", program: "codex-cli", model: "GPT-5.2" },
          { role: "test_designer", program: "claude-code", model: "Opus 4.5" },
          { role: "adversarial_critic", program: "gemini-cli", model: "Gemini 3" },
        ],
      },
    ],
    defaultPreset: "default-3-agent",
  },
};
```

---

## Serialization in Kickoff Messages

The roster MUST be serialized into the kickoff message body for audit purposes. This ensures reproducibility and allows future sessions to understand the role assignment.

### Format in Message Body

```markdown
## Session Configuration

**Roster Mode**: role_separated
**Roster Name**: Default 3-Agent Setup

| Agent | Role | Program | Model |
|-------|------|---------|-------|
| BlueLake | hypothesis_generator | codex-cli | GPT-5.2 |
| PurpleMountain | test_designer | claude-code | Opus 4.5 |
| GreenValley | adversarial_critic | gemini-cli | Gemini 3 |

---
```

### JSON in Artifact Metadata

```json
{
  "metadata": {
    "session_id": "RS-20251230-cell-fate",
    "roster": {
      "mode": "role_separated",
      "name": "Default 3-Agent Setup",
      "entries": [
        { "agentName": "BlueLake", "role": "hypothesis_generator", "program": "codex-cli" },
        { "agentName": "PurpleMountain", "role": "test_designer", "program": "claude-code" },
        { "agentName": "GreenValley", "role": "adversarial_critic", "program": "gemini-cli" }
      ]
    }
  }
}
```

---

## Validation Functions

### validateRoster

```typescript
function validateRoster(roster: Roster): ValidationResult {
  const errors: string[] = [];
  const seenAgents = new Set<string>();

  for (const entry of roster.entries) {
    // Check for duplicate agents
    if (seenAgents.has(entry.agentName)) {
      errors.push(`Duplicate agent in roster: ${entry.agentName}`);
    }
    seenAgents.add(entry.agentName);

    // Check role validity
    const validRoles = ["hypothesis_generator", "test_designer", "adversarial_critic"];
    if (!validRoles.includes(entry.role)) {
      errors.push(`Invalid role for ${entry.agentName}: ${entry.role}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### validateRosterCoverage

```typescript
function validateRosterCoverage(
  roster: Roster,
  recipients: string[]
): ValidationResult {
  const errors: string[] = [];
  const rosterAgents = new Set(roster.entries.map(e => e.agentName));

  for (const recipient of recipients) {
    if (!rosterAgents.has(recipient)) {
      errors.push(`Missing roster entry for recipient: ${recipient}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

## Backwards Compatibility

### Heuristic Fallback (Deprecated)

The existing `getAgentRole()` function that matches on substrings ("Codex" → hypothesis_generator) will be **deprecated** but remain available as a fallback for:
- Legacy sessions without explicit rosters
- Quick testing where roster setup is overhead

To use the fallback, set `roster.mode = "heuristic"` (not recommended for production):

```typescript
const legacyRoster: Roster = {
  mode: "heuristic" as any,  // DEPRECATED
  entries: [],  // Empty - uses substring matching
};
```

### Migration Path

1. **v0.1** (now): Add roster schema, make it optional, warn if not provided
2. **v0.2** (future): Make roster required for role_separated mode
3. **v1.0** (future): Remove heuristic fallback entirely

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-31 | Initial draft: core types, edge cases, loading precedence |
