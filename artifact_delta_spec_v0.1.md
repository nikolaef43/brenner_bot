# Brenner Protocol: Artifact Delta & Merge Specification v0.1

> **Status**: Draft specification
> **Purpose**: Define how multi-agent outputs update artifacts deterministically
> **Depends on**: `artifact_schema_v0.1.md`

---

## Overview

When multiple agents collaborate on a Brenner Protocol artifact, each agent emits **deltas** (structured changes) rather than producing complete artifact rewrites. This specification defines:

1. Delta types and their semantics
2. Conflict resolution policy
3. Ordering and merge rules

The goal: a deterministic merge function that produces identical results regardless of which agent's delta is processed first (commutative where possible, with explicit ordering where necessary).

---

## Delta Types

Every delta operation is one of three types:

| Type | Meaning | When to use |
|------|---------|-------------|
| `ADD` | Create a new item | Adding hypotheses, tests, assumptions, etc. |
| `EDIT` | Modify an existing item | Updating claims, adding anchors, fixing errors |
| `KILL` | Mark an item as removed | Superseded hypotheses, invalidated tests |

### Important: KILL vs DELETE

- **KILL** marks an item as logically removed but preserves it in the artifact (strikethrough + reason)
- Items are NEVER physically deleted from the artifact
- This preserves audit trail and allows recovery

---

## Delta Structure

Each delta is a JSON object with the following fields:

```json
{
  "delta_id": "d-<uuid>",
  "timestamp": "2025-12-30T00:00:00Z",
  "agent": "PurpleMountain",
  "operation": "ADD" | "EDIT" | "KILL",
  "target_id": "H3" | null,
  "section": "hypothesis_slate" | "predictions_table" | ...,
  "payload": { ... },
  "rationale": "Brief explanation of why this change"
}
```

### Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| `delta_id` | Yes | Unique identifier for this delta |
| `timestamp` | Yes | ISO-8601 timestamp when delta was created |
| `agent` | Yes | Name of the contributing agent |
| `operation` | Yes | One of: ADD, EDIT, KILL |
| `target_id` | ADD: No, EDIT/KILL: Yes | The item ID being modified |
| `section` | Yes | Which section this affects (see valid values below) |
| `payload` | ADD/EDIT: Yes, KILL: Optional | The content being added or the fields being edited |
| `rationale` | Recommended | Why this change is being made |

### Valid Section Values

| Section ID | Description | ID Prefix |
|------------|-------------|-----------|
| `research_thread` | The stable problem statement | `RT` |
| `hypothesis_slate` | Candidate explanations | `H` |
| `predictions_table` | Discriminative predictions | `P` |
| `discriminative_tests` | Ranked decision experiments | `T` |
| `assumption_ledger` | Load-bearing assumptions | `A` |
| `anomaly_register` | Quarantined exceptions | `X` |
| `adversarial_critique` | Attacks on the framing | `C` |

---

## Operation Semantics

### ADD

Creates a new item in the specified section.

```json
{
  "operation": "ADD",
  "target_id": null,
  "section": "hypothesis_slate",
  "payload": {
    "claim": "Cells use a hybrid coordinate system",
    "mechanism": "Both lineage and gradient signals are integrated",
    "anchors": ["§161", "§205"]
  }
}
```

**Rules**:
- `target_id` MUST be null (ID will be assigned by merge)
- The merge function assigns the next available ID in sequence (e.g., H4 if H1-H3 exist)
- Section constraints are validated (e.g., hypothesis slate cannot exceed 6 items)

### EDIT

Modifies specific fields of an existing item.

```json
{
  "operation": "EDIT",
  "target_id": "H2",
  "section": "hypothesis_slate",
  "payload": {
    "anchors": ["§161", "§205", "§212"]
  }
}
```

**Rules**:
- `target_id` MUST reference an existing, non-killed item
- Only fields in `payload` are updated; other fields remain unchanged
- For array fields (anchors, labels), new values are merged with existing values by default
- To replace instead of merge, include `"replace": true` in the payload alongside the array field

### KILL

Marks an item as logically removed.

```json
{
  "operation": "KILL",
  "target_id": "H2",
  "section": "hypothesis_slate",
  "payload": {
    "reason": "Superseded by H4 which incorporates this as a special case"
  }
}
```

**Rules**:
- `target_id` MUST reference an existing, non-killed item
- The item is NOT removed from the artifact
- In the rendered artifact, killed items appear with strikethrough and the kill reason
- Killed items cannot be edited; to restore a killed item, create a new ADD with the same content

---

## Conflict Resolution Policy

### Definition: Conflict

Two deltas **conflict** if:
1. They target the same `target_id`, AND
2. They modify the same field within `payload`, AND
3. They set that field to different values

### Resolution Hierarchy

When conflicts occur, they are resolved in this order:

1. **Timestamp ordering**: Later timestamp wins (last-write-wins for simple fields)
2. **Agent priority**: If timestamps are identical, use agent priority order (if defined)
3. **Additive merge**: For array fields (anchors, labels), union all values instead of replacing
4. **Explicit conflict marker**: If no resolution is possible, mark the field as `CONFLICT` and require human review

### Conflict-Free Operations

The following operations are conflict-free by design:

| Operation | Why it's conflict-free |
|-----------|----------------------|
| ADD + ADD | Each gets a unique new ID |
| ADD + EDIT | Different target IDs |
| ADD + KILL | Different target IDs |
| EDIT field A + EDIT field B | Different fields, both apply |
| KILL + KILL (same target) | Idempotent, both succeed |

### Conflicting Operations

| Scenario | Resolution |
|----------|------------|
| EDIT + EDIT (same field, different values) | Last-write-wins by timestamp |
| EDIT + KILL | KILL takes precedence (can't edit killed items) |
| KILL + EDIT | KILL takes precedence |
| ADD exceeds section limit | Second ADD is rejected with error |

---

## Ordering Rules

### Delta Processing Order

Deltas are processed in **timestamp order** (oldest first). This ensures:
1. Earlier decisions are respected
2. Later decisions can build on earlier state
3. The same set of deltas always produces the same result

### ID Assignment Order

When multiple ADDs are processed:
1. Sort by timestamp
2. Assign IDs in timestamp order
3. Example: Two agents add hypotheses at t1 and t2 → H4 (t1), H5 (t2)

### Merge Algorithm

```
function merge(base_artifact, deltas[]):
  sorted_deltas = sort_by_timestamp(deltas)

  for delta in sorted_deltas:
    if delta.operation == "ADD":
      next_id = get_next_id(base_artifact, delta.section)
      delta.target_id = next_id
      base_artifact = apply_add(base_artifact, delta)

    elif delta.operation == "EDIT":
      if is_killed(base_artifact, delta.target_id):
        log_warning("Skipping edit of killed item", delta)
        continue
      base_artifact = apply_edit(base_artifact, delta)

    elif delta.operation == "KILL":
      if is_killed(base_artifact, delta.target_id):
        continue  # idempotent
      base_artifact = apply_kill(base_artifact, delta)

  return base_artifact
```

---

## Section-Specific Rules

### Research Thread (RT)

- **Single item**: There is exactly ONE research thread
- **EDIT only**: ADDs are invalid; only EDIT is allowed
- **Stability**: Edits should be rare and require strong justification

### Hypothesis Slate (H)

- **Limit**: Maximum 6 items (including third alternative)
- **Third alternative**: At least one hypothesis MUST be labeled "Third Alternative"
- **KILL constraint**: Cannot kill the last third alternative without adding a replacement

### Predictions Table (P)

- **Scoped IDs**: Predictions are scoped to hypotheses (P1.H1, P1.H2)
- **Auto-update on H KILL**: When a hypothesis is killed, predictions referencing it are marked "N/A"

### Discriminative Tests (T)

- **Ranking**: Tests are ordered by score; ADDs insert at correct rank position
- **Re-ranking**: EDITs that change score trigger automatic re-ordering

### Assumption Ledger (A)

- **Scale check requirement**: At least one assumption must be a scale/physics check
- **Status field**: Status can be: unchecked, verified, falsified

### Anomaly Register (X)

- **Empty allowed**: Section can be empty (rendered as "None registered")
- **Quarantine status**: active, resolved, deferred

### Adversarial Critique (C)

- **Minimum**: At least 2 critiques required
- **Real third alternative**: At least one must offer a specific alternative framing

---

## Delta Validation

Before applying, each delta is validated:

### Pre-conditions

| Check | Error if fails |
|-------|----------------|
| `target_id` exists (for EDIT/KILL) | `INVALID_TARGET` |
| `target_id` not killed (for EDIT) | `TARGET_KILLED` |
| Section not at limit (for ADD) | `SECTION_LIMIT_EXCEEDED` |
| Required fields present in payload | `MISSING_REQUIRED_FIELD` |
| Agent is registered contributor | `UNKNOWN_AGENT` |

### Post-conditions

| Check | Warning if fails |
|-------|------------------|
| Third alternative still exists after KILL | `NO_THIRD_ALTERNATIVE` |
| Scale check still exists after KILL | `NO_SCALE_CHECK` |
| Minimum item counts satisfied | `BELOW_MINIMUM` |

---

## Delta Encoding Examples

### Example 1: Adding a new hypothesis

```json
{
  "delta_id": "d-abc123",
  "timestamp": "2025-12-30T12:00:00Z",
  "agent": "RedCreek",
  "operation": "ADD",
  "target_id": null,
  "section": "hypothesis_slate",
  "payload": {
    "name": "Epigenetic memory",
    "claim": "Cells use chromatin state inheritance for fate determination",
    "mechanism": "Histone modifications inherited through division encode positional memory",
    "anchors": ["inference"]
  },
  "rationale": "Adding alternative mechanism that doesn't fit lineage/gradient dichotomy"
}
```

### Example 2: Editing a test's potency check

```json
{
  "delta_id": "d-def456",
  "timestamp": "2025-12-30T12:05:00Z",
  "agent": "PurpleMountain",
  "operation": "EDIT",
  "target_id": "T1",
  "section": "discriminative_tests",
  "payload": {
    "potency_check": "Include late-transplant control (both H1 and H2 predict no change) AND verify cell viability post-transplant via vital dye"
  },
  "rationale": "Adding cell viability check to strengthen potency control"
}
```

### Example 3: Killing a superseded hypothesis

```json
{
  "delta_id": "d-ghi789",
  "timestamp": "2025-12-30T12:10:00Z",
  "agent": "GreenDog",
  "operation": "KILL",
  "target_id": "H2",
  "section": "hypothesis_slate",
  "payload": {
    "reason": "Subsumed by H4 (epigenetic memory) which explains gradient-like behavior as a special case of inherited state"
  },
  "rationale": "H4 incorporates H2 as special case; maintaining both is redundant"
}
```

---

## Merge Output Format

After merging, the artifact includes:

1. **Contributor list** in metadata (all agents whose deltas were applied)
2. **Version increment** (integer version number)
3. **Killed items** rendered with strikethrough and reason
4. **Conflict markers** for any unresolved conflicts

### Killed Item Rendering

```markdown
### ~~H2: Gradient-dominant~~ [KILLED]
**Claim**: ~~Cell fate is determined by reading positional morphogen gradients.~~
**Killed by**: GreenDog (2025-12-30T12:10:00Z)
**Reason**: Subsumed by H4 (epigenetic memory) which explains gradient-like behavior as a special case of inherited state
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-30 | Initial draft |

---

## Implementation Notes

The merge function should be implemented as a pure function with these properties:

- **Deterministic**: Same inputs always produce same output
- **Commutative for ADDs**: ADD + ADD order doesn't matter (IDs assigned by timestamp)
- **Idempotent for KILLs**: Killing an already-killed item is a no-op
- **Testable**: Each operation type should have unit tests

Reference implementation: `apps/web/lib/artifact-merge.ts` (to be created)
