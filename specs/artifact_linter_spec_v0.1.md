# Brenner Protocol: Artifact Linter Specification v0.1

> **Status**: Draft specification
> **Purpose**: Define machine-checkable rules for Brenner Protocol artifacts
> **Depends on**: `artifact_schema_v0.1.md`

---

## Overview

The artifact linter validates Brenner Protocol artifacts against structural and semantic rules. This specification defines:

1. Check definitions with unique rule IDs
2. Severity levels (error, warning, info)
3. Detection patterns (machine-checkable vs human-review)
4. Fix guidance for each rule

---

## Severity Levels

| Level | Code | Meaning | Behavior |
|-------|------|---------|----------|
| **Error** | `E` | Must fix before artifact is valid | Blocks compilation/publish |
| **Warning** | `W` | Should fix, may indicate quality issues | Allows compilation with notice |
| **Info** | `I` | Nice to have, style guidance | Informational only |

---

## Rule ID Format

```
{SEVERITY}{SECTION}-{NUMBER}
```

**Examples**:
- `EH-001`: Error in Hypothesis Slate, rule 1
- `WT-003`: Warning in Discriminative Tests, rule 3
- `IM-002`: Info in Metadata, rule 2

**Section Codes**:
| Code | Section |
|------|---------|
| `M` | Metadata |
| `S` | Structure (cross-section) |
| `R` | Research Thread |
| `H` | Hypothesis Slate |
| `P` | Predictions Table |
| `T` | Discriminative Tests |
| `A` | Assumption Ledger |
| `X` | Anomaly Register |
| `C` | Adversarial Critique |

---

## Structural Checks (Machine-Checkable)

### Metadata (M)

| ID | Severity | Rule | Detection |
|----|----------|------|-----------|
| `EM-001` | Error | Metadata header must be present | Check for YAML front matter block |
| `EM-002` | Error | `session_id` field required | Check for non-empty `session_id` |
| `EM-003` | Error | `created_at` field required | Check for ISO-8601 timestamp |
| `EM-004` | Error | `status` field required | Check for `draft` \| `active` \| `closed` |
| `WM-001` | Warning | `contributors` list recommended | Check for non-empty contributors array |
| `WM-002` | Warning | `updated_at` should be ≥ `created_at` | Compare timestamps |
| `IM-001` | Info | `session_id` follows thread convention | Match `RS-\d{8}-[a-z0-9-]+` or beads ID pattern |
| `IM-002` | Info | Version number present | Check for integer `version` field |

**Detection Pattern (EM-001)**:
```regex
^---\n[\s\S]*?\n---
```

### Structure (S)

| ID | Severity | Rule | Detection |
|----|----------|------|-----------|
| `ES-001` | Error | All 7 required sections present | Check for H2 headers matching section names |
| `ES-002` | Error | Sections in correct order | Compare section positions |
| `ES-003` | Error | All item IDs follow naming convention | Match `^(RT|H\d+|P\d+\.H\d+|T\d+|A\d+|X\d+|C\d+)$` |
| `ES-004` | Error | No duplicate item IDs | Check ID uniqueness per section |
| `WS-001` | Warning | IDs are sequential (no gaps) | Check H1, H2, H3... sequence |

**Required Section Headers**:
1. `## 1. Research Thread`
2. `## 2. Hypothesis Slate`
3. `## 3. Predictions Table`
4. `## 4. Discriminative Tests`
5. `## 5. Assumption Ledger`
6. `## 6. Anomaly Register`
7. `## 7. Adversarial Critique`

### Research Thread (R)

| ID | Severity | Rule | Detection |
|----|----------|------|-----------|
| `ER-001` | Error | Research thread statement present | Check for `**RT**:` marker |
| `ER-002` | Error | Context section present | Check for `**Context**:` marker |
| `WR-001` | Warning | Anchors section present | Check for `**Anchors**:` marker |
| `IR-001` | Info | Why it matters section present | Check for `**Why it matters**:` marker |

### Hypothesis Slate (H)

| ID | Severity | Rule | Detection |
|----|----------|------|-----------|
| `EH-001` | Error | Minimum 3 hypotheses | Count `### H\d+:` headers |
| `EH-002` | Error | Maximum 6 hypotheses | Count `### H\d+:` headers |
| `EH-003` | Error | Third alternative explicitly labeled | Search for "Third Alternative" (case-insensitive) |
| `EH-004` | Error | Each hypothesis has Claim field | Check for `**Claim**:` in each H block |
| `WH-001` | Warning | Each hypothesis has anchors | Check for `**Anchors**:` in each H block |
| `WH-002` | Warning | Anchors use §n format or "inference" | Match `§\d+` or literal "inference" |
| `IH-001` | Info | Mechanism field present | Check for `**Mechanism**:` in each H block |

**Detection Pattern (EH-003)**:
```regex
third\s+alternative
```
(case-insensitive)

### Predictions Table (P)

| ID | Severity | Rule | Detection |
|----|----------|------|-----------|
| `EP-001` | Error | Minimum 3 predictions | Count table rows (excluding header) |
| `EP-002` | Error | Table has ID column | First column header is `ID` |
| `EP-003` | Error | Table has column per hypothesis | Column headers include H1, H2, etc. |
| `WP-001` | Warning | Predictions discriminate | Not all cells in a row are identical |
| `WP-002` | Warning | P IDs include hypothesis scope | Match `P\d+` or `P\d+\.H\d+` pattern |
| `IP-001` | Info | H3 predictions marked "indeterminate" | Check for "indeterminate" in H3 column |

### Discriminative Tests (T)

| ID | Severity | Rule | Detection |
|----|----------|------|-----------|
| `ET-001` | Error | Minimum 2 tests | Count `### T\d+:` headers |
| `ET-002` | Error | Each test has Procedure field | Check for `**Procedure**:` in each T block |
| `ET-003` | Error | Each test has Expected outcomes | Check for `**Expected outcomes**:` |
| `WT-001` | Warning | Each test has potency check | Check for `**Potency check**:` |
| `WT-002` | Warning | Tests ranked by score | Scores decrease or equal across T1, T2, ... |
| `WT-003` | Warning | Score breakdown present | Check for likelihood/cost/speed/ambiguity |
| `IT-001` | Info | Discriminates field specifies hypotheses | Check for `**Discriminates**:` with H references |
| `IT-002` | Info | Feasibility assessment present | Check for `**Feasibility**:` |

### Assumption Ledger (A)

| ID | Severity | Rule | Detection |
|----|----------|------|-----------|
| `EA-001` | Error | Minimum 3 assumptions | Count `### A\d+:` headers |
| `EA-002` | Error | At least 1 scale/physics check | Search for "scale" or "physics" in A headers |
| `EA-003` | Error | Each assumption has Statement field | Check for `**Statement**:` |
| `WA-001` | Warning | Each assumption has Load field | Check for `**Load**:` |
| `WA-002` | Warning | Each assumption has Test field | Check for `**Test**:` |
| `WA-003` | Warning | Scale check has Calculation | Check for `**Calculation**:` in scale check |
| `IA-001` | Info | Status field present | Check for `**Status**:` with valid value |

### Anomaly Register (X)

| ID | Severity | Rule | Detection |
|----|----------|------|-----------|
| `EX-001` | Error | Section present (even if empty) | Check for section header |
| `EX-002` | Error | Empty state explicit | "None registered" if no X items |
| `WX-001` | Warning | Each anomaly has Observation | Check for `**Observation**:` |
| `WX-002` | Warning | Each anomaly has Conflicts with | Check for `**Conflicts with**:` |
| `IX-001` | Info | Quarantine status specified | Check for `**Quarantine status**:` |

### Adversarial Critique (C)

| ID | Severity | Rule | Detection |
|----|----------|------|-----------|
| `EC-001` | Error | Minimum 2 critiques | Count `### C\d+:` headers |
| `EC-002` | Error | Each critique has Attack field | Check for `**Attack**:` |
| `WC-001` | Warning | At least one "real third alternative" | Search for alternative framing critique |
| `WC-002` | Warning | Evidence field present | Check for `**Evidence**:` |
| `IC-001` | Info | Current status assessment | Check for `**Current status**:` |

---

## Semantic Checks (Machine-Assistable)

These checks require more sophisticated analysis but can be partially automated:

| ID | Severity | Rule | Automation |
|----|----------|------|------------|
| `WS-101` | Warning | Citations use §n anchors consistently | Regex + count verification |
| `WS-102` | Warning | Item cross-references are valid | Check that P1.H1 references existing H1 |
| `WS-103` | Warning | Hypothesis names unique | Compare H header texts |
| `WP-101` | Warning | Predictions reference existing hypotheses | Match H columns to H section items |
| `WT-101` | Warning | Test discriminates claims exist in H | Cross-reference "Discriminates: H1 vs H2" |
| `WA-101` | Warning | Scale check has numeric values | Detect numbers in Calculation field |

---

## Human-Review Checks

These require human judgment and cannot be fully automated:

| ID | Severity | Rule | Guidance |
|----|----------|------|----------|
| `WH-201` | Warning | Hypotheses are mutually exclusive | Review: Can H1 and H2 both be true? |
| `WH-202` | Warning | Third alternative is substantive | Review: Is it just "both wrong" or a real alternative? |
| `WP-201` | Warning | Predictions are in machine language | Review: Observable vs abstract claims |
| `WT-201` | Warning | Potency checks are adequate | Review: Would negative result be interpretable? |
| `WT-202` | Warning | Score justifications match scores | Review: LR=3 should mean >100:1 |
| `WA-201` | Warning | Scale check uses realistic parameters | Review: Are the numbers in the right ballpark? |
| `WC-201` | Warning | Critiques are substantive | Review: Real challenges vs perfunctory objections |

---

## Output Format

### Summary

```
Artifact Linter Report
======================
Artifact: RS-20251230-cell-fate.md
Status: INVALID (3 errors, 5 warnings, 2 info)

Errors (must fix):
  EH-003: Third alternative not explicitly labeled (line 45)
  ET-001: Only 1 discriminative test found (minimum 2)
  EA-002: No scale/physics check found in assumptions

Warnings (should fix):
  WH-001: H1 missing anchors (line 23)
  WT-001: T1 missing potency check (line 87)
  ...

Info:
  IM-001: session_id doesn't follow RS-YYYYMMDD-slug convention
  ...
```

### JSON Format

```json
{
  "artifact": "RS-20251230-cell-fate.md",
  "valid": false,
  "summary": {
    "errors": 3,
    "warnings": 5,
    "info": 2
  },
  "violations": [
    {
      "id": "EH-003",
      "severity": "error",
      "message": "Third alternative not explicitly labeled",
      "line": 45,
      "fix": "Add 'Third Alternative' to one hypothesis name"
    },
    ...
  ]
}
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Valid (no errors, may have warnings/info) |
| `1` | Invalid (at least one error) |
| `2` | Parse error (couldn't read artifact) |

---

## Implementation Notes

### Parsing Strategy

1. **Front matter**: Extract YAML header between `---` markers
2. **Sections**: Split on `## \d+\.` headers
3. **Items**: Within each section, split on `### [A-Z]\d+:` headers
4. **Fields**: Within each item, extract `**FieldName**:` patterns
5. **Tables**: Parse markdown tables in Predictions section

### Incremental Linting

For live editing, prioritize checks in this order:
1. Structure (ES-*) - fast, catches major issues
2. Counts (EH-001, ET-001, etc.) - fast, catches completeness
3. Content (field presence) - medium
4. Cross-references - slower, can defer

### Delta Linting

When applying deltas, only re-check:
- Affected section
- Cross-section references (if IDs changed)
- Counts (if items added/removed)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-30 | Initial draft |
