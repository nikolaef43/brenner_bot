# Brenner Protocol: Thread & Subject Conventions v0.1

> **Status**: Draft specification
> **Purpose**: Define conventions for Agent Mail thread IDs and subject prefixes
> **Depends on**: `artifact_schema_v0.1.md`, `artifact_delta_spec_v0.1.md`

---

## Overview

When multiple agents coordinate via Agent Mail, consistent naming conventions for **thread IDs** and **message subjects** enable:

1. **Human scanability**: An operator can look at an inbox and understand what happened instantly
2. **Machine parseability**: An orchestrator can classify messages without brittle heuristics
3. **Cross-reference stability**: A thread ID is the global join-key connecting Agent Mail threads, ntm sessions, artifact files, and beads issues

---

## Thread ID Conventions

### Purpose

The **thread ID** is the primary key that ties together:
- Agent Mail conversation threads
- ntm tmux session names
- Compiled artifact file paths
- Beads issue references

All systems should use the **same thread ID** for the same unit of work.

### Engineering Work (Beads-Driven)

For development tasks tracked in beads, use the **bead ID** as the thread ID:

```
Thread ID = {bead_id}
Example:   brenner_bot-5so.1.4.1
```

**Rules**:
- Exact match to the beads issue ID
- Case-sensitive (preserve hyphen, dots, etc.)
- No additional prefixes or suffixes

**Rationale**:
- One-to-one mapping between tracked work and conversation
- Easy cross-reference between `bd show <id>` and Agent Mail thread

### Research Sessions (Human-Initiated)

For research sessions (Brenner Loop workflows), use a dated slug format:

```
Thread ID = RS-{YYYYMMDD}-{short-slug}
Example:   RS-20251230-cell-fate-dichotomy
```

**Components**:
| Part | Format | Purpose |
|------|--------|---------|
| `RS-` | Literal prefix | Identifies research session (vs engineering work) |
| `YYYYMMDD` | ISO date | Session start date for chronological sorting |
| `short-slug` | 2-5 lowercase words, hyphenated | Human-readable topic identifier |

**Rules**:
- Use lowercase letters, numbers, and hyphens only (no underscores or special characters)
- Slug should be 10-40 characters total
- Choose a memorable, descriptive slug (not generic like "session-1")
- Date is when the session was initiated, not modified

**Examples**:
```
RS-20251230-gradient-vs-lineage
RS-20251215-mRNA-decay-paradox
RS-20251102-c-elegans-coordinate-system
```

### Coordination & Meta-Threads

For agent coordination that isn't tied to a specific bead or research session:

```
Thread ID = COORD-{topic}
Example:   COORD-agent-handoff
           COORD-daily-sync
           COORD-file-reservations
```

**Rules**:
- Use for cross-cutting coordination only
- Not for actual research or development work
- Topic should be stable and reusable

---

## Subject Prefix Conventions

### Purpose

The **subject line** appears in inbox listings. A consistent prefix scheme enables:
- Instant visual classification
- Programmatic filtering/sorting
- Workflow state tracking

### Subject Format

```
SUBJECT = {PREFIX}: {description}
```

The prefix MUST be one of the defined values below. The description should be a brief, human-readable summary (under 80 characters).

### Defined Prefixes

| Prefix | Meaning | When to use |
|--------|---------|-------------|
| `KICKOFF` | Session initiation | Starting a new research session or major work item |
| `DELTA[role]` | Agent contribution | Agent posting structured updates (role = agent model shorthand) |
| `COMPILED` | Merged artifact | Orchestrator posting the compiled artifact |
| `CRITIQUE` | Adversarial feedback | Agent posting challenges to the current artifact |
| `ACK` | Acknowledgement | Confirming receipt of a message or completion of work |
| `CLAIM` | Work claim | Agent claiming a bead or task |
| `HANDOFF` | Work handoff | Transferring work between agents |
| `BLOCKED` | Work blocked | Reporting a blocker on a task |
| `QUESTION` | Clarification request | Asking for input from other agents or operator |
| `INFO` | Informational | Status updates, announcements, non-actionable info |

### Role Shorthand for DELTA

The `[role]` in `DELTA[role]` identifies the contributing agent's model:

| Shorthand | Model | Program |
|-----------|-------|---------|
| `opus` | opus-4.5 | claude-code |
| `gpt` | gpt-5.2 | codex-cli |
| `gemini` | gemini-3 | gemini-cli |
| `claude` | sonnet/haiku | claude-code (other models) |
| `human` | N/A | human operator |

**Examples**:
```
DELTA[opus]: Added H4 (epigenetic memory hypothesis)
DELTA[gpt]: Updated T1 potency check with viability assay
DELTA[gemini]: Added critique C3 re: dichotomy framing
DELTA[human]: Corrected §42 citation anchor
```

### Full Subject Examples

```
KICKOFF: Cell fate coordinate system investigation (RS-20251230-cell-fate)
DELTA[opus]: Added third alternative H3 + supporting predictions
DELTA[gpt]: Revised likelihood ratios for T1, T2 based on literature
COMPILED: v3 artifact with contributions from 3 agents
CRITIQUE: Challenging A2 (gradient stability assumption)
ACK: Received and integrated DELTA from RedCreek
CLAIM: Taking brenner_bot-5so.3.4.2 (delta parser implementation)
HANDOFF: Passing brenner_bot-5so.3.4.2 to RedLake due to session end
BLOCKED: Need artifact schema clarification before proceeding
QUESTION: Which test scoring rubric applies to meta-analyses?
INFO: Agent Mail server restarting at 02:00 UTC
```

---

## Validation Rules

### Thread ID Validation

| Check | Regex Pattern | Error |
|-------|---------------|-------|
| Engineering thread | `^[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$` | `INVALID_BEAD_ID` |
| Research thread | `^RS-\d{8}-[a-z0-9-]{2,40}$` | `INVALID_RS_THREAD_ID` |
| Coordination thread | `^COORD-[a-z0-9-]{2,30}$` | `INVALID_COORD_THREAD_ID` |

### Subject Validation

| Check | Pattern | Error |
|-------|---------|-------|
| Has valid prefix | `^(KICKOFF|DELTA\[[a-z]+\]|COMPILED|CRITIQUE|ACK|CLAIM|HANDOFF|BLOCKED|QUESTION|INFO):` | `INVALID_SUBJECT_PREFIX` |
| Has description | Prefix followed by non-empty text | `EMPTY_SUBJECT_DESCRIPTION` |
| Under length limit | Total length ≤ 120 characters | `SUBJECT_TOO_LONG` |

---

## Cross-Reference Contract

The thread ID MUST be usable as a key in all of these systems:

| System | How thread ID is used |
|--------|----------------------|
| **Agent Mail** | `thread_id` parameter in `send_message` |
| **ntm** | Session name: `ntm new {thread_id}` |
| **Artifact storage** | File path: `artifacts/{thread_id}.md` |
| **Beads** | Issue ID (for engineering work): `bd show {thread_id}` |
| **Compiled output** | YAML front matter: `session_id: "{thread_id}"` |

### Artifact storage layout (repo)

**Canonical path** (relative to repo root):

- `artifacts/{thread_id}.md`

**Rules**:

- `{thread_id}` is used verbatim as the filename. Therefore it MUST match the validation rules above and MUST NOT contain `/` or `..`.
- One thread/session = one artifact file. New compiled versions update the same file in place; version history lives in git and in Agent Mail `COMPILED` messages.
- Artifacts are written only by an explicit operator action (CLI/Web lab mode). No background or surprise persistence.

### ntm session naming

**Recommendation**: use the thread ID verbatim as the `ntm` session name:

- `ntm new {thread_id}`

**Rationale**:

- The thread ID is the global join key; reusing it as the session name avoids “where did we run this?” ambiguity.
- Operators can jump from Agent Mail → tmux session → artifact file without translation.

### Mapping table (examples)

| Work type | `thread_id` | `ntm` session name | Artifact path |
|-----------|-------------|--------------------|---------------|
| Engineering (beads) | `brenner_bot-5so.3.4.2` | `brenner_bot-5so.3.4.2` | `artifacts/brenner_bot-5so.3.4.2.md` |
| Research (Brenner Loop) | `RS-20251230-cell-fate` | `RS-20251230-cell-fate` | `artifacts/RS-20251230-cell-fate.md` |

### Example: Full Cross-Reference

For research session `RS-20251230-cell-fate`:
```
Agent Mail thread:  RS-20251230-cell-fate
ntm session:        RS-20251230-cell-fate
Artifact file:      artifacts/RS-20251230-cell-fate.md
Artifact metadata:  session_id: "RS-20251230-cell-fate"
```

For engineering work `brenner_bot-5so.3.4.2`:
```
Agent Mail thread:  brenner_bot-5so.3.4.2
ntm session:        brenner_bot-5so.3.4.2
Bead:               bd show brenner_bot-5so.3.4.2
Git commits:        Reference bead ID in commit message
```

---

## Inbox Scanability

With these conventions, an inbox listing becomes instantly parseable:

```
From           Subject                                          Thread
─────────────────────────────────────────────────────────────────────────────
RedCreek       KICKOFF: Cell fate dichotomy investigation       RS-20251230-cell-fate
PurpleMountain DELTA[opus]: Added H3 third alternative          RS-20251230-cell-fate
GreenDog       DELTA[gpt]: Updated test scores T1-T3            RS-20251230-cell-fate
Operator       COMPILED: v2 with 3 agent contributions          RS-20251230-cell-fate
RedLake        CRITIQUE: A2 stability assumption is weak        RS-20251230-cell-fate
ChartreuseStone CLAIM: Taking thread conventions bead           brenner_bot-5so.1.4.1
RedCreek       ACK: Confirming claim on 1.4.1                   brenner_bot-5so.1.4.1
```

**Visual parsing**:
- `KICKOFF` = new work starting (pay attention)
- `DELTA[*]` = agent contributions (review if interested)
- `COMPILED` = artifact ready for review
- `CRITIQUE` = challenges to address
- `CLAIM/ACK` = coordination updates

---

## Implementation Notes

### For Agents

When sending Agent Mail messages:
1. Determine the thread ID from context (bead ID or session ID)
2. Choose the appropriate subject prefix
3. Write a concise description after the prefix
4. Set `thread_id` in the `send_message` call

### For Orchestrator

When processing Agent Mail:
1. Parse subject prefix to determine message type
2. Parse `DELTA[role]` to identify contributing model
3. Route KICKOFF → session initialization
4. Route DELTA → merge into working artifact
5. Route COMPILED → render and distribute
6. Route CRITIQUE → queue for review

### For CLI (brenner)

The `orchestrate start` command should:
1. Generate appropriate thread ID (from bead or RS- format)
2. Use `KICKOFF:` subject prefix
3. Set the thread ID in all downstream operations

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-30 | Initial draft |
