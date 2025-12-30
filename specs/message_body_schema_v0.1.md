# Brenner Protocol: Message Body Schema & ACK Semantics v0.1

> **Status**: Draft specification
> **Purpose**: Define message body structure per type and acknowledgement requirements
> **Depends on**: `thread_subject_conventions_v0.1.md`, `delta_output_format_v0.1.md`

---

## Overview

This specification defines:
1. Required body structure per message type (based on subject prefix)
2. When acknowledgement (`ack_required`) should be set
3. Machine-checkable validation rules for message bodies

---

## Message Types and Body Schemas

Each message type (identified by subject prefix) has a specific body structure.

### KICKOFF Messages

**Purpose**: Initiate a new research session or work item.

**Subject**: `KICKOFF: {description}`

**ACK Required**: Yes (ensures all agents received the kickoff)

**Body Schema**:
```markdown
# {Session/Work Title}

## Research Question
{One-sentence problem statement - will become the RT if this is a research session}

## Context
{2-4 sentences of essential background}

## Excerpt
{Relevant transcript excerpt(s) with §n citations}

## Initial Hypotheses (optional)
{Seed hypotheses if known, will be refined by agents}

## Constraints (optional)
{Time bounds, scope limits, specific focus areas}

## Requested Outputs
{What artifacts or deliverables are expected}
```

**Validation**:
| Field | Required | Check |
|-------|----------|-------|
| Research Question | Yes | Non-empty H1 or `## Research Question` |
| Context | Yes | `## Context` section present |
| Excerpt | Recommended | `## Excerpt` section with §n citations |

---

### DELTA Messages

**Purpose**: Agent contribution to an artifact.

**Subject**: `DELTA[role]: {description}`

**ACK Required**: No (deltas are merged, not acknowledged individually)

**Body Schema**:
```markdown
# Delta Contribution

{Optional prose explaining the contribution}

## Deltas

{One or more fenced `delta` blocks as specified in delta_output_format_v0.1.md}
```

**Validation**:
| Field | Required | Check |
|-------|----------|-------|
| Delta blocks | Yes | At least one ` ```delta ` block |
| Valid JSON | Yes | Each delta block parses as valid JSON |
| Operation type | Yes | `operation` is ADD/EDIT/KILL |

**Example**:
~~~markdown
# Delta Contribution

Adding third alternative hypothesis based on transcript §42.

## Deltas

```delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "Epigenetic memory",
    "claim": "Cells use chromatin state inheritance",
    "mechanism": "Histone marks encode fate memory",
    "anchors": ["§42"]
  },
  "rationale": "Transcript §42 suggests alternative mechanism"
}
```
~~~

---

### COMPILED Messages

**Purpose**: Orchestrator posting the merged artifact.

**Subject**: `COMPILED: {version description}`

**ACK Required**: No (informational)

**Body Schema**:
```markdown
# Compiled Artifact v{N}

## Summary
{Brief description of what changed in this version}

## Contributors
{List of agents whose deltas were merged}

## Statistics
- Hypotheses: {N}
- Predictions: {N}
- Tests: {N}
- Assumptions: {N}
- Anomalies: {N}
- Critiques: {N}

## Validation Status
{Linter results summary}

## Full Artifact
{Link or inline artifact content}
```

**Validation**:
| Field | Required | Check |
|-------|----------|-------|
| Version | Yes | `v{N}` in title or summary |
| Contributors | Yes | Non-empty contributors list |
| Statistics | Recommended | Section with counts |

---

### CRITIQUE Messages

**Purpose**: Adversarial feedback on current artifact state.

**Subject**: `CRITIQUE: {description}`

**ACK Required**: Yes (critiques require attention)

**Body Schema**:
```markdown
# Critique: {Title}

## Target
{What is being critiqued - artifact ID, section, hypothesis, etc.}

## Attack
{The substantive challenge}

## Evidence
{Why this critique should be taken seriously}

## Proposed Resolution (optional)
{Suggested fix or investigation}

## Severity
{Critical | Major | Minor}
```

**Validation**:
| Field | Required | Check |
|-------|----------|-------|
| Target | Yes | `## Target` section present |
| Attack | Yes | `## Attack` section present |
| Severity | Recommended | One of Critical/Major/Minor |

---

### ACK Messages

**Purpose**: Confirm receipt or completion.

**Subject**: `ACK: {original subject or summary}`

**ACK Required**: No (acknowledgements don't need acknowledgement)

**Body Schema**:
```markdown
# Acknowledgement

## Message ID
{ID of message being acknowledged}

## Status
{Received | Understood | Will Action | Completed}

## Notes (optional)
{Additional context or response}
```

**Validation**:
| Field | Required | Check |
|-------|----------|-------|
| Message ID | Recommended | Reference to original message |
| Status | Yes | One of defined status values |

---

### CLAIM Messages

**Purpose**: Agent claiming a task/bead for work.

**Subject**: `CLAIM: {bead ID or task description}`

**ACK Required**: No (claims are informational)

**Body Schema**:
```markdown
# Work Claim

## Item
{Bead ID: brenner_bot-xxx or task description}

## Agent
{Agent name claiming the work}

## Estimated Duration (optional)
{Expected completion timeframe}

## Approach (optional)
{Brief description of how agent will tackle this}
```

**Validation**:
| Field | Required | Check |
|-------|----------|-------|
| Item | Yes | `## Item` section with bead ID or description |
| Agent | Yes | `## Agent` section with agent name |

---

### HANDOFF Messages

**Purpose**: Transfer work between agents.

**Subject**: `HANDOFF: {bead ID or task} to {agent}`

**ACK Required**: Yes (handoffs must be acknowledged to confirm transfer)

**Body Schema**:
```markdown
# Work Handoff

## Item
{Bead ID or task being transferred}

## From
{Agent releasing the work}

## To
{Agent receiving the work}

## Reason
{Why handoff is occurring}

## State
{Current progress state}

## Files Modified
{List of files touched so far}

## Next Steps
{What the receiving agent should do next}
```

**Validation**:
| Field | Required | Check |
|-------|----------|-------|
| Item | Yes | Non-empty |
| From | Yes | Valid agent name |
| To | Yes | Valid agent name |
| State | Recommended | Description of current progress |

---

### BLOCKED Messages

**Purpose**: Report a blocker on a task.

**Subject**: `BLOCKED: {bead ID or task}`

**ACK Required**: Yes (blockers need attention)

**Body Schema**:
```markdown
# Work Blocked

## Item
{Bead ID or task that is blocked}

## Blocker
{Description of what is blocking progress}

## Type
{Dependency | Question | Resource | External}

## Attempted
{What was tried before declaring blocked}

## Needed
{What is required to unblock}
```

**Validation**:
| Field | Required | Check |
|-------|----------|-------|
| Item | Yes | Non-empty |
| Blocker | Yes | Non-empty description |
| Type | Recommended | One of defined types |

---

### QUESTION Messages

**Purpose**: Request clarification or input.

**Subject**: `QUESTION: {brief question}`

**ACK Required**: Yes (questions need answers)

**Body Schema**:
```markdown
# Question

## Context
{Background needed to understand the question}

## Question
{The specific question being asked}

## Options (if applicable)
{Possible answers if known}

## Impact
{What this affects / why answer matters}

## Urgency
{Blocking | Soon | Whenever}
```

**Validation**:
| Field | Required | Check |
|-------|----------|-------|
| Question | Yes | `## Question` section present |
| Urgency | Recommended | One of defined levels |

---

### INFO Messages

**Purpose**: Status updates, announcements, non-actionable information.

**Subject**: `INFO: {summary}`

**ACK Required**: No (informational only)

**Body Schema**:
```markdown
# Information

{Free-form markdown content}
```

**Validation**: No specific structure required. Should be informational, not actionable.

---

## ACK Semantics Summary

| Message Type | ACK Required | Rationale |
|--------------|--------------|-----------|
| KICKOFF | **Yes** | All agents must confirm session start |
| DELTA | No | Merged without individual confirmation |
| COMPILED | No | Informational broadcast |
| CRITIQUE | **Yes** | Challenges need attention |
| ACK | No | Acknowledgements don't need acknowledgement |
| CLAIM | No | Informational (work tracking) |
| HANDOFF | **Yes** | Transfer must be confirmed |
| BLOCKED | **Yes** | Blockers need resolution |
| QUESTION | **Yes** | Questions need answers |
| INFO | No | Informational only |

### ACK Workflow

1. Sender sets `ack_required: true` for messages needing confirmation
2. Each recipient sends `ACK:` response when message is processed
3. Sender can track acknowledgement status via inbox
4. Unacknowledged messages after timeout → escalate or resend

---

## Validation Implementation

### Pre-send Validation

Before sending, validate:
1. Subject has valid prefix
2. Body matches schema for message type
3. Required sections present
4. `ack_required` matches expected value for type

### Post-receive Validation

On receive, optionally validate:
1. Body structure matches type
2. References (bead IDs, agent names) are valid
3. Delta blocks parse correctly

### Error Responses

If validation fails:
```markdown
# Validation Error

## Message
{Original message ID}

## Errors
- {Error 1}
- {Error 2}

## Suggestion
{How to fix}
```

---

## Machine-Checkable Rules

| Rule ID | Check | Severity |
|---------|-------|----------|
| `MB-001` | Subject has valid prefix | Error |
| `MB-002` | KICKOFF has Research Question | Error |
| `MB-003` | KICKOFF has Context | Error |
| `MB-004` | DELTA has at least one delta block | Error |
| `MB-005` | Delta blocks parse as valid JSON | Error |
| `MB-006` | CRITIQUE has Target section | Error |
| `MB-007` | CRITIQUE has Attack section | Error |
| `MB-008` | HANDOFF has From/To agents | Error |
| `MB-009` | ACK messages don't set ack_required | Warning |
| `MB-010` | KICKOFF sets ack_required: true | Warning |
| `MB-011` | QUESTION sets ack_required: true | Warning |
| `MB-012` | BLOCKED sets ack_required: true | Warning |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-30 | Initial draft |
