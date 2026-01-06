# Brenner Protocol: Agent Delta Output Format v0.1

> **Status**: Draft specification
> **Purpose**: Define how agents express structured updates in message bodies
> **Depends on**: `artifact_delta_spec_v0.1.md`, `thread_subject_conventions_v0.1.md`

---

## Decision Summary

**Chosen format**: Fenced JSON blocks within markdown message bodies.

**Rationale**:
- **Machine-parseable**: JSON is unambiguous and universally parseable
- **Human-readable**: JSON in fenced blocks renders nicely in markdown viewers
- **Explicit structure**: Operations, targets, and payloads are clearly delimited
- **Compatible**: Aligns with `artifact_delta_spec_v0.1.md` delta structure

---

## Format Overview

When an agent contributes to a Brenner Protocol artifact, it posts a message to Agent Mail with:
1. Subject prefix `DELTA[role]:` (per `thread_subject_conventions_v0.1.md`)
2. Body containing one or more **delta blocks** in fenced JSON

### Message Structure

```markdown
# Delta Contribution

[Optional prose explaining the contribution - for human readers]

## Deltas

[One or more fenced JSON delta blocks]
```

---

## Delta Block Format

Each delta is a fenced JSON block with this structure:

~~~markdown
```delta
{
  "operation": "ADD" | "EDIT" | "KILL",
  "section": "<section_id>",
  "target_id": "<item_id>" | null,
  "payload": { ... },
  "rationale": "<brief explanation>"
}
```
~~~

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `operation` | string | Yes | One of: `ADD`, `EDIT`, `KILL` |
| `section` | string | Yes | Target section (see valid values below) |
| `target_id` | string \| null | Conditional | Item ID for EDIT/KILL; null for ADD |
| `payload` | object | Conditional | Content for ADD/EDIT; kill reason for KILL |
| `rationale` | string | Recommended | Why this change is being made |

### Valid Section Values

| Section ID | Description | ID Prefix |
|------------|-------------|-----------|
| `hypothesis_slate` | Candidate explanations | `H` |
| `predictions_table` | Discriminative predictions | `P` |
| `discriminative_tests` | Ranked decision experiments | `T` |
| `assumption_ledger` | Load-bearing assumptions | `A` |
| `anomaly_register` | Quarantined exceptions | `X` |
| `adversarial_critique` | Attacks on the framing | `C` |
| `research_thread` | Stable problem statement | `RT` (EDIT only) |

---

## Operation Examples

### ADD: New Hypothesis

~~~markdown
```delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "Epigenetic memory",
    "claim": "Cells use chromatin state inheritance for fate determination",
    "mechanism": "Histone modifications inherited through division encode positional memory",
    "anchors": ["inference"]
  },
  "rationale": "Adding alternative mechanism that doesn't fit the lineage/gradient dichotomy"
}
```
~~~

### ADD: New Discriminative Test

~~~markdown
```delta
{
  "operation": "ADD",
  "section": "discriminative_tests",
  "target_id": null,
  "payload": {
    "name": "Chromatin inheritance assay",
    "procedure": "Track H3K27me3 marks through division in transplanted cells. Score whether marks correlate with original or new position.",
    "discriminates": "H3 vs H1/H2",
    "expected_outcomes": {
      "H1": "Marks reflect lineage history",
      "H2": "Marks reflect position",
      "H3": "Marks persist independently of both"
    },
    "potency_check": "Verify mark detection sensitivity with known positive controls",
    "score": {
      "likelihood_ratio": 2,
      "cost": 2,
      "speed": 1,
      "ambiguity": 2
    }
  },
  "rationale": "Adding test that specifically targets the epigenetic memory hypothesis"
}
```
~~~

### ADD: New Prediction Row

~~~markdown
```delta
{
  "operation": "ADD",
  "section": "predictions_table",
  "target_id": null,
  "payload": {
    "condition": "Epigenetic mark inhibitor treatment",
    "predictions": {
      "H1": "No effect (lineage counting unaffected)",
      "H2": "No effect (gradient reading unaffected)",
      "H3": "Fate determination disrupted"
    }
  },
  "rationale": "Adding prediction that discriminates H3 from H1/H2"
}
```
~~~

### EDIT: Update Test Potency Check

~~~markdown
```delta
{
  "operation": "EDIT",
  "section": "discriminative_tests",
  "target_id": "T1",
  "payload": {
    "potency_check": "Include late-transplant control (both H1 and H2 predict no change) AND verify cell viability post-transplant via vital dye"
  },
  "rationale": "Adding cell viability check to strengthen potency control"
}
```
~~~

### EDIT: Add Anchors to Hypothesis

~~~markdown
```delta
{
  "operation": "EDIT",
  "section": "hypothesis_slate",
  "target_id": "H2",
  "payload": {
    "anchors": ["§161", "§205", "§212"]
  },
  "rationale": "Adding additional transcript anchors from review"
}
```
~~~

Note: For array fields like `anchors`, the default behavior is to **merge** (add new items). To **replace** the entire array:

~~~markdown
```delta
{
  "operation": "EDIT",
  "section": "hypothesis_slate",
  "target_id": "H2",
  "payload": {
    "anchors": ["§205", "§212"],
    "anchors_replace": true
  },
  "rationale": "Replacing anchor list (§161 was incorrect citation)"
}
```
~~~

### KILL: Supersede Hypothesis

~~~markdown
```delta
{
  "operation": "KILL",
  "section": "hypothesis_slate",
  "target_id": "H2",
  "payload": {
    "reason": "Subsumed by H4 (epigenetic memory) which explains gradient-like behavior as a special case of inherited chromatin state"
  },
  "rationale": "H4 incorporates H2 as special case; maintaining both is redundant"
}
```
~~~

### EDIT: Research Thread (Rare)

~~~markdown
```delta
{
  "operation": "EDIT",
  "section": "research_thread",
  "target_id": "RT",
  "payload": {
    "context": "Updated context with reference to recent scRNA-seq findings"
  },
  "rationale": "Incorporating new experimental context from literature review"
}
```
~~~

---

## Multiple Deltas in One Message

Agents may contribute multiple deltas in a single message. Each delta is a separate fenced block:

~~~markdown
# Delta Contribution

Adding H4 hypothesis and corresponding test T4.

## Deltas

```delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "Epigenetic memory",
    "claim": "Cells use chromatin state inheritance",
    "mechanism": "Histone marks encode positional memory",
    "anchors": ["inference"]
  },
  "rationale": "Introducing alternative to lineage/gradient dichotomy"
}
```

```delta
{
  "operation": "ADD",
  "section": "discriminative_tests",
  "target_id": null,
  "payload": {
    "name": "Chromatin mark tracking",
    "procedure": "Monitor H3K27me3 in transplanted cells",
    "discriminates": "H4 vs H1/H2",
    "expected_outcomes": {
      "H1": "Marks follow lineage",
      "H2": "Marks follow position",
      "H4": "Marks persist independently"
    },
    "potency_check": "Positive control with known stable marks"
  },
  "rationale": "Test specifically targeting the new hypothesis"
}
```
~~~

---

## Cross-Session References

Items can reference items from other sessions to enable research programs that span multiple Brenner Loop sessions. This provides:

1. **Hypothesis Genealogy** - Track how ideas evolve across sessions
2. **Research Continuity** - Understand "where did we leave off?"
3. **Credit Attribution** - Track which session/agent first proposed an idea
4. **Avoiding Duplicate Work** - Prevent re-proposing killed hypotheses

### Reference Format

```json
{
  "references": [
    {
      "session": "RS-20251230-bio-rrp",
      "item": "H2",
      "relation": "refines"
    }
  ]
}
```

### Reference Relation Types

| Relation | Description | Example Use |
|----------|-------------|-------------|
| `extends` | This item builds on the referenced item | H4 extends H2 with additional mechanism |
| `refines` | This item is a more precise version | H3 refines H1 with specific predictions |
| `refutes` | This item contradicts the referenced item | H5 refutes H2 based on T3 results |
| `informed_by` | This item was influenced by (looser coupling) | T4 informed by X2 anomaly from prior session |
| `supersedes` | This item replaces the referenced item | H6 supersedes H1 entirely |
| `replicates` | This item re-tests the referenced item | T5 replicates T2 with improved potency check |

### Example: Cross-Session Hypothesis Refinement

```delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "Refined vesicle hypothesis",
    "claim": "Vesicle formation requires both pH gradient and coat proteins",
    "mechanism": "pH change triggers coat protein binding, enabling budding",
    "anchors": ["§127", "§128"],
    "references": [
      { "session": "RS-20251228-initial", "item": "H2", "relation": "refines" },
      { "session": "RS-20251228-initial", "item": "T3", "relation": "informed_by" }
    ]
  },
  "rationale": "Refining H2 based on T3 results from prior session"
}
```

### Reference Validation

The artifact compiler SHOULD:
1. Log warnings for references to non-existent sessions/items (soft fail)
2. Track reference chains for hypothesis genealogy visualization
3. Prevent circular reference chains (A→B→C→A)

---

## Payload Schemas by Section

### hypothesis_slate (ADD/EDIT)

```json
{
  "name": "string (short name)",
  "claim": "string (one-sentence claim)",
  "mechanism": "string (how it works)",
  "anchors": ["§n", ...] | ["inference"],
  "third_alternative": true | false,  // Only for third alternative hypothesis
  "references": [                      // Optional cross-session references
    {
      "session": "RS-20251230-example",
      "item": "H2",
      "relation": "refines"
    }
  ]
}
```

### predictions_table (ADD/EDIT)

```json
{
  "condition": "string (observable condition)",
  "predictions": {
    "H1": "string (outcome)",
    "H2": "string (outcome)",
    ...
  },
  "references": [                // Optional cross-session references
    {
      "session": "RS-20251230-example",
      "item": "P1",
      "relation": "extends"
    }
  ]
}
```

### discriminative_tests (ADD/EDIT)

```json
{
  "name": "string (test name)",
  "procedure": "string (what you do)",
  "discriminates": "string (e.g., 'H1 vs H2')",
  "expected_outcomes": {
    "H1": "string",
    "H2": "string",
    ...
  },
  "potency_check": "string (how you verify assay worked)",
  "feasibility": "string (optional)",
  "score": {
    "likelihood_ratio": 0-3,
    "cost": 0-3,
    "speed": 0-3,
    "ambiguity": 0-3
  },
  "references": [                      // Optional cross-session references
    {
      "session": "RS-20251230-example",
      "item": "T2",
      "relation": "replicates"
    }
  ]
}
```

### assumption_ledger (ADD/EDIT)

```json
{
  "name": "string (assumption name)",
  "statement": "string (what we assume)",
  "load": "string (what breaks if wrong)",
  "test": "string (how to check)",
  "status": "unchecked" | "verified" | "falsified",
  "scale_check": true | false,  // Flag for physics/scale checks
  "references": [                // Optional cross-session references
    {
      "session": "RS-20251230-example",
      "item": "A1",
      "relation": "refines"
    }
  ]
}
```

### anomaly_register (ADD/EDIT)

```json
{
  "name": "string (anomaly name)",
  "observation": "string (what was observed)",
  "conflicts_with": ["H1", "A2", ...],
  "status": "active" | "resolved" | "deferred",
  "resolution_plan": "string",
  "references": [                // Optional cross-session references
    {
      "session": "RS-20251230-example",
      "item": "X1",
      "relation": "informed_by"
    }
  ]
}
```

### adversarial_critique (ADD/EDIT)

```json
{
  "name": "string (critique name)",
  "attack": "string (how framing could be wrong)",
  "evidence": "string (what would confirm this)",
  "current_status": "string (how seriously we take it)",
  "real_third_alternative": true | false,
  "references": [                // Optional cross-session references
    {
      "session": "RS-20251230-example",
      "item": "C1",
      "relation": "extends"
    }
  ]
}
```

### KILL payload (all sections)

```json
{
  "reason": "string (why this item is being killed)"
}
```

---

## Parsing Rules

The orchestrator/compiler MUST:

1. **Identify delta blocks**: Find all fenced code blocks with language tag `delta`
2. **Parse JSON**: Validate each block as valid JSON
3. **Validate structure**: Check required fields per operation type
4. **Assign IDs**: For ADD operations, assign next available ID in section
5. **Apply in order**: Process deltas in message order (or by timestamp if from multiple messages)
6. **Handle conflicts**: Per `artifact_delta_spec_v0.1.md` conflict resolution rules

### Error Handling

| Error | Behavior |
|-------|----------|
| Invalid JSON | Reject entire delta block; log warning |
| Missing required field | Reject delta block; log warning |
| Invalid target_id | Reject delta block; log error |
| Section limit exceeded | Reject ADD; log warning |

---

## Common Failure Modes

This section documents **high-frequency errors** observed in real pilot sessions. Each failure mode includes symptoms, why it happens, and how to fix it.

### Failure Mode 1: Inline JSON (Missing `delta` Fence)

**Severity**: 🔴 Critical — Compilation silently drops the delta

**What it looks like**:

```
Here's my hypothesis:

{ "operation": "ADD", "section": "hypothesis_slate", ... }
```

**Why it breaks**: The delta parser only extracts code blocks with the `delta` language tag. Inline JSON is treated as prose and ignored entirely.

**How to fix**: Wrap ALL delta JSON in fenced code blocks with the `delta` tag:

~~~markdown
```delta
{ "operation": "ADD", "section": "hypothesis_slate", ... }
```
~~~

**Prevention**: Use the remediation template below. If you accidentally posted inline JSON, resend the entire message with proper fencing.

---

### Failure Mode 2: Wrong Section Name

**Severity**: 🟠 High — Delta is rejected

**What it looks like**:

```delta
{
  "operation": "ADD",
  "section": "hypotheses",  // ❌ Wrong! Should be "hypothesis_slate"
  ...
}
```

**Valid section names**:
- `hypothesis_slate` (not "hypotheses" or "hypothesis")
- `predictions_table` (not "predictions")
- `discriminative_tests` (not "tests")
- `assumption_ledger` (not "assumptions")
- `anomaly_register` (not "anomalies")
- `adversarial_critique` (not "critiques")
- `research_thread` (EDIT only)

**How to fix**: Use exact section names from the table above.

---

### Failure Mode 3: Missing target_id on EDIT/KILL

**Severity**: 🟠 High — Delta is rejected

**What it looks like**:

```delta
{
  "operation": "EDIT",
  "section": "hypothesis_slate",
  "target_id": null,  // ❌ Must specify item ID for EDIT/KILL
  "payload": { "claim": "Updated claim" }
}
```

**Why it breaks**: EDIT and KILL operations require a specific target. The compiler doesn't know which item to modify.

**How to fix**: Always specify `target_id` for EDIT and KILL:

```delta
{
  "operation": "EDIT",
  "section": "hypothesis_slate",
  "target_id": "H2",  // ✅ Specify the item ID
  "payload": { "claim": "Updated claim" }
}
```

---

### Failure Mode 4: Invalid JSON Syntax

**Severity**: 🟠 High — Entire block is rejected

**Common causes**:
- Trailing commas: `{ "key": "value", }` ❌
- Single quotes: `{ 'key': 'value' }` ❌ (JSON requires double quotes)
- Unquoted keys: `{ key: "value" }` ❌
- Comments in JSON: `{ "key": "value" // comment }` ❌

**How to fix**: Validate JSON before submitting. Use an IDE with JSON validation or paste into a JSON validator.

---

### Failure Mode 5: Empty Payload on ADD

**Severity**: 🟡 Medium — Delta may be rejected or produce incomplete item

**What it looks like**:

```delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {}  // ❌ Empty payload
}
```

**Required payload fields by section**:
- `hypothesis_slate`: `name`, `claim`, `mechanism`, `anchors`
- `discriminative_tests`: `name`, `procedure`, `discriminates`, `expected_outcomes`
- `predictions_table`: `condition`, `predictions`
- `assumption_ledger`: `name`, `statement`, `load`, `test`, `status`
- `anomaly_register`: `name`, `observation`, `conflicts_with`, `status`
- `adversarial_critique`: `name`, `attack`, `evidence`, `current_status`

---

## Remediation Template

When you've made a formatting mistake, use this template to resend your contribution correctly:

~~~markdown
# Corrected Delta Contribution

[I'm resending this contribution with proper delta formatting.]

## Deltas

```delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "[Your hypothesis name]",
    "claim": "[One-sentence claim]",
    "mechanism": "[How it works]",
    "anchors": ["§n"] // or ["inference"]
  },
  "rationale": "[Why this is worth considering]"
}
```
~~~

**Key checklist before sending**:
- [ ] JSON is inside triple-backtick fence with `delta` language tag
- [ ] Section name matches exactly (e.g., `hypothesis_slate` not `hypotheses`)
- [ ] ADD has `target_id: null`; EDIT/KILL has specific target ID
- [ ] All required payload fields are present
- [ ] JSON is valid (no trailing commas, double quotes only, no comments)

---

## Alternatives Considered

### Option A: Strict Markdown Sections

```markdown
### DELTA: ADD hypothesis_slate

**Name**: Epigenetic memory
**Claim**: Cells use chromatin state inheritance
...
```

**Rejected because**: Ambiguous parsing (markdown headers can appear in prose), field ordering matters, harder to validate.

### Option B: JSON Patch (RFC 6902)

```json
[
  { "op": "add", "path": "/hypothesis_slate/-", "value": {...} }
]
```

**Rejected because**: Path syntax is error-prone, less readable for humans, overkill for our use case.

### Option C: YAML Blocks

```yaml
operation: ADD
section: hypothesis_slate
...
```

**Rejected because**: YAML is more error-prone (indentation sensitivity), less universal parsing support.

---

## Relationship to Other Specs

| Spec | Relationship |
|------|--------------|
| `artifact_schema_v0.1.md` | Defines the artifact sections and item IDs we target |
| `artifact_delta_spec_v0.1.md` | Defines merge semantics; this spec defines agent output format |
| `thread_subject_conventions_v0.1.md` | Defines `DELTA[role]:` subject prefix used with this format |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.2 | 2026-01-05 | Added "Common Failure Modes" section and remediation template (brenner_bot-1fvd) |
| 0.1.1 | 2026-01-01 | Added cross-session references support: `references` field in all payload schemas, reference relation types, validation rules |
| 0.1 | 2025-12-30 | Initial draft |
