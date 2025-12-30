# Brenner Protocol: Artifact Publish & Compile Messages v0.1

> **Status**: Draft specification
> **Purpose**: Define how compiled artifacts are posted, versioned, and referenced
> **Depends on**: `message_body_schema_v0.1.md`, `thread_subject_conventions_v0.1.md`, `artifact_schema_v0.1.md`

---

## Overview

This specification defines:
1. How compiled artifacts are published to Agent Mail threads
2. How artifact versions are tracked and referenced
3. The canonical "latest artifact" pointer mechanism
4. How follow-up rounds reference previous artifact versions

---

## Artifact Lifecycle

```
KICKOFF → DELTA[role]* → COMPILED v1 → CRITIQUE* → DELTA[role]* → COMPILED v2 → ...
```

1. **KICKOFF** initiates a session with a thread_id
2. **DELTA** messages contribute structured updates
3. **COMPILED** publishes the merged artifact (creates version N)
4. **CRITIQUE** challenges the current artifact
5. Cycle repeats for subsequent rounds

---

## COMPILED Message Extended Schema

Extends `message_body_schema_v0.1.md` COMPILED type with persistence semantics.

### Subject Format

```
COMPILED: v{N} {brief description}
```

**Examples**:
```
COMPILED: v1 initial artifact with 3 hypotheses
COMPILED: v2 integrated opus critique on H2
COMPILED: v3 added T4 viability assay from gpt delta
```

### Body Schema (Extended)

```markdown
# Compiled Artifact v{N}

## Metadata
- **Thread ID**: {thread_id}
- **Version**: v{N}
- **Previous Version**: v{N-1} (if applicable)
- **Compiled At**: {ISO 8601 timestamp}
- **Compiler**: {agent name or "operator"}

## Summary
{Brief description of what changed in this version}

## Contributors
| Agent | Delta Count | Items Added/Modified |
|-------|-------------|---------------------|
| {name} | {N} | H3, T2, C1 |
| ... | ... | ... |

## Changes from v{N-1}
{Diff summary - new items, modified items, killed items}

## Statistics
- Research Thread: 1
- Hypotheses: {N}
- Predictions: {N}
- Tests: {N}
- Assumptions: {N}
- Anomalies: {N}
- Critiques: {N}

## Validation Status
- Schema: {PASS | FAIL}
- Linter: {N warnings, M errors}
- Third Alternative: {Present | MISSING}

## Persistence
- **Artifact Path**: `artifacts/{thread_id}.md`
- **Git Commit**: {SHA} (if committed)
- **Status**: {Persisted | Pending | Draft}

## Full Artifact
{Inline artifact content OR link to persisted file}
```

### Validation

| Field | Required | Check |
|-------|----------|-------|
| Thread ID | Yes | Matches message thread_id |
| Version | Yes | Monotonic (v1, v2, v3...) |
| Compiled At | Yes | Valid ISO 8601 |
| Contributors | Yes | At least one contributor |
| Artifact Path | Yes | Matches `artifacts/{thread_id}.md` |
| Full Artifact | Yes | Either inline or link present |

---

## Version Tracking

### Version Numbering

- Versions are simple monotonic integers: v1, v2, v3, ...
- Version 1 is the first compiled artifact after KICKOFF
- Each COMPILED message increments the version by 1
- Versions are never skipped or reused

### Version History

The version history is the sequence of COMPILED messages in the thread:

```
Thread: RS-20251230-cell-fate
├── COMPILED: v1 (2025-12-30T10:00:00Z)
├── COMPILED: v2 (2025-12-30T11:30:00Z)
└── COMPILED: v3 (2025-12-30T14:00:00Z)  ← latest
```

### Git History

The artifact file is updated in place. Git history provides the full version chain:

```bash
# View artifact version history
git log --oneline -- artifacts/RS-20251230-cell-fate.md

# View specific version
git show HEAD~2:artifacts/RS-20251230-cell-fate.md
```

---

## Latest Artifact Pointer

### Problem

Given a thread_id, how do we find the current (latest) artifact state?

### Solution: Dual-Source Truth

1. **Agent Mail thread**: Latest COMPILED message contains the current artifact
2. **File system**: `artifacts/{thread_id}.md` contains the persisted version

### Query Methods

**Via Agent Mail** (canonical for in-progress sessions):
```
1. Fetch thread messages for thread_id
2. Filter for subject prefix "COMPILED:"
3. Sort by created_ts descending
4. First result = latest compiled artifact
```

**Via File System** (canonical for persisted sessions):
```
1. Read artifacts/{thread_id}.md
2. Parse YAML front matter for version metadata
```

### Artifact File Front Matter

The persisted artifact file MUST include YAML front matter with version tracking:

```yaml
---
session_id: "RS-20251230-cell-fate"
version: 3
compiled_at: "2025-12-30T14:00:00Z"
compiled_by: "operator"
contributors:
  - opus
  - gpt
  - gemini
agent_mail_message_id: 12345
---

# Research Thread
...
```

### Machine-Readable Latest Pointer

For programmatic access, use this query pattern:

```typescript
// Pseudo-code for getting latest artifact
async function getLatestArtifact(threadId: string): Promise<Artifact> {
  // Option 1: From Agent Mail (for active sessions)
  const messages = await fetchThread(threadId);
  const compiled = messages
    .filter(m => m.subject.startsWith("COMPILED:"))
    .sort((a, b) => b.created_ts - a.created_ts)[0];

  if (compiled) {
    return parseArtifact(compiled.body_md);
  }

  // Option 2: From file system (for persisted sessions)
  const filePath = `artifacts/${threadId}.md`;
  if (await fileExists(filePath)) {
    return parseArtifactFile(filePath);
  }

  throw new Error(`No artifact found for thread ${threadId}`);
}
```

---

## Referencing Artifacts in Follow-Up Rounds

### CRITIQUE Messages

When critiquing a specific artifact version:

```markdown
# Critique: Challenging H2 mechanism assumption

## Target
- **Artifact Version**: v2
- **Item**: H2 (Gradient-based coordinate system)
- **Section**: Mechanism field

## Attack
The proposed gradient reading mechanism assumes instantaneous signal integration...
```

### DELTA Messages (Subsequent Rounds)

When contributing deltas after an artifact exists:

```markdown
# Delta Contribution

**Base Version**: v2
**Action**: Response to C1 critique

## Deltas

```delta
{
  "operation": "EDIT",
  "section": "hypothesis_slate",
  "target_id": "H2",
  "payload": {
    "mechanism": "Cells integrate concentration fields over time window τ (addressing C1)"
  },
  "rationale": "Response to C1 critique re: integration timing"
}
```
```

### KICKOFF Messages (Round 2+)

For multi-round sessions, subsequent kickoffs reference the current artifact:

```markdown
# Round 2 Kickoff

## Current State
- **Base Artifact**: v2
- **Open Critiques**: C1, C2
- **Focus Area**: Addressing H2 mechanism concerns

## Research Question
{Same RT or refined version}

## Requested Outputs
- Address C1 and C2 critiques
- Propose revised mechanism for H2 or kill H2
- Generate new discriminative test if H2 survives
```

---

## Persistence Semantics

### When to Persist

Artifacts are persisted (written to file system) on:

1. **Explicit operator command**: `brenner compile --persist`
2. **Session completion**: When operator marks session complete
3. **Version milestone**: Every N versions (configurable)

Artifacts are NOT automatically persisted after every COMPILED message.

### Persistence States

| State | Agent Mail | File System | Git |
|-------|------------|-------------|-----|
| Draft | COMPILED message exists | Not written | Not committed |
| Pending | COMPILED message exists | Written but uncommitted | `git status` shows modified |
| Persisted | COMPILED message exists | Written and committed | `git log` shows commit |

### Persistence Workflow

```bash
# 1. Compile artifact from Agent Mail thread
brenner compile RS-20251230-cell-fate

# 2. Review the compiled artifact (outputs to stdout or temp file)
# 3. Persist to file system
brenner compile RS-20251230-cell-fate --persist

# 4. Git commit (with structured message)
git add artifacts/RS-20251230-cell-fate.md
git commit -m "artifact(RS-20251230-cell-fate): v3 - integrated gpt viability assay"
```

### Persistence Message

After persisting, post an INFO message to the thread:

```
Subject: INFO: Artifact v3 persisted to repository

Body:
# Artifact Persisted

- **Path**: artifacts/RS-20251230-cell-fate.md
- **Git Commit**: abc1234
- **Status**: Committed and pushed
```

---

## Validation Rules

| Rule ID | Check | Severity |
|---------|-------|----------|
| `AP-001` | COMPILED subject matches `COMPILED: v{N} ...` | Error |
| `AP-002` | Version N > previous version in thread | Error |
| `AP-003` | Thread ID in body matches message thread_id | Error |
| `AP-004` | At least one contributor listed | Error |
| `AP-005` | Artifact path matches `artifacts/{thread_id}.md` | Error |
| `AP-006` | Full artifact present (inline or link) | Error |
| `AP-007` | Statistics section present | Warning |
| `AP-008` | Validation status section present | Warning |
| `AP-009` | CRITIQUE/DELTA references valid artifact version | Warning |
| `AP-010` | Front matter version matches COMPILED version | Error |

---

## Implementation Notes

### For Orchestrator/Compiler

1. Parse all DELTA messages since last COMPILED (or KICKOFF)
2. Merge deltas into current artifact state
3. Increment version number
4. Run artifact linter
5. Format COMPILED message body
6. Post to Agent Mail thread
7. Optionally persist to file system

### For CLI (brenner)

```bash
# Compile from thread (no persistence)
brenner compile <thread_id>

# Compile and persist
brenner compile <thread_id> --persist

# Compile, persist, and commit
brenner compile <thread_id> --persist --commit

# View latest artifact for thread
brenner artifact show <thread_id>

# List artifact versions
brenner artifact history <thread_id>
```

### For Web App

1. Display "Latest Artifact" card on session view
2. Show version history with diff viewer
3. Provide "Persist Artifact" button (lab mode only)
4. Link COMPILED messages to their artifact versions

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-30 | Initial draft |
