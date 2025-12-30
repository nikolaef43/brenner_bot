# Brenner Protocol Artifact Schema v0.1

> **Status**: Draft specification
> **Purpose**: Canonical artifact format for multi-agent research sessions
> **Scope**: Web app + CLI must generate, validate, render, and merge artifacts conforming to this schema

---

## Overview

A Brenner Protocol artifact is a markdown document that captures the structured outputs of a research session. Each session produces exactly one artifact file. The artifact is designed to be:

- **Auditable**: Every claim can be traced to evidence or explicitly marked as inference
- **Mergeable**: Multiple agents can contribute deltas that combine deterministically
- **Discrete**: Outputs are enumerated items with stable IDs, not narrative prose

---

## Required Sections

Every artifact MUST contain these 7 sections in this order:

| # | Section | ID Prefix | Purpose |
|---|---------|-----------|---------|
| 1 | Research Thread | `RT` | The stable problem statement (bite point) |
| 2 | Hypothesis Slate | `H` | 2–5 candidate explanations + third alternative |
| 3 | Predictions Table | `P` | Discriminative predictions per hypothesis |
| 4 | Discriminative Tests | `T` | Ranked decision experiments + potency checks |
| 5 | Assumption Ledger | `A` | Load-bearing assumptions + scale checks |
| 6 | Anomaly Register | `X` | Quarantined exceptions |
| 7 | Adversarial Critique | `C` | What would make the framing wrong |

---

## Item ID Conventions

Each enumerable item within a section has a stable ID of the form `{PREFIX}{NUMBER}`:

```
H1, H2, H3, ...     # Hypotheses
P1.H1, P1.H2, ...   # Predictions (scoped to hypothesis)
T1, T2, T3, ...     # Tests
A1, A2, A3, ...     # Assumptions
X1, X2, X3, ...     # Anomalies/Exceptions
C1, C2, C3, ...     # Critiques
```

### ID Rules

1. **Monotonic**: IDs are assigned in order and never reused within a session
2. **Stable**: Once assigned, an ID refers to that item forever (even if edited)
3. **Scoped**: Some IDs are hierarchical (e.g., `P1.H2` = prediction 1 for hypothesis 2)
4. **Prefixed**: The prefix indicates the section (H=Hypothesis, T=Test, etc.)

---

## Section Specifications

### 1. Research Thread (RT)

The research thread captures the stable "bite point" — the smallest place where reality can contradict you.

**Format**:
```markdown
## 1. Research Thread

**RT**: [One-sentence problem statement]

**Context**: [2-3 sentences of essential background]

**Why it matters**: [1-2 sentences on downstream implications]

**Anchors**: [Transcript citations if applicable, e.g., §42, §57]
```

**Constraints**:
- Exactly ONE research thread per artifact
- Must be falsifiable (can be wrong)
- Must be specific enough to generate discriminative predictions

**Example**:
```markdown
## 1. Research Thread

**RT**: Does the gene regulatory network use a lineage-based or gradient-based coordinate system for cell fate decisions?

**Context**: Cell identity determination requires positional information. Two candidate mechanisms exist: tracking lineage history (digital) or reading morphogen gradients (analog).

**Why it matters**: The coordinate system choice determines which perturbations are informative and which experimental objects are tractable.

**Anchors**: §161, §205
```

---

### 2. Hypothesis Slate (H)

The hypothesis slate enumerates 2–5 candidate explanations. MUST include a "third alternative" hypothesis.

**Format**:
```markdown
## 2. Hypothesis Slate

### H1: [Hypothesis name]
**Claim**: [One-sentence statement]
**Mechanism**: [How it would work]
**Anchors**: [Citations or "inference"]

### H2: [Hypothesis name]
...

### H3: Third Alternative
**Claim**: [Both/all other hypotheses are wrong or question is misspecified]
**How this could be true**: [What assumption failure would make this the case]
```

**Constraints**:
- Minimum 2 hypotheses + 1 third alternative = 3 total
- Maximum 5 hypotheses + 1 third alternative = 6 total
- Third alternative MUST be explicitly included (labeled "Third Alternative")
- Each hypothesis must be mutually exclusive with others (given the framing)

**Example**:
```markdown
## 2. Hypothesis Slate

### H1: Lineage-based coordinate system
**Claim**: Cell fate is determined by tracking division history (digital).
**Mechanism**: Each cell maintains a counter/state that updates at division. Fate is computed from this history.
**Anchors**: §161 ("lineage-based logic")

### H2: Gradient-based coordinate system
**Claim**: Cell fate is determined by reading positional morphogen gradients (analog).
**Mechanism**: Cells integrate concentration fields to determine position and fate.
**Anchors**: §205 ("analog gradients")

### H3: Third Alternative
**Claim**: The dichotomy is false; cells use a hybrid or entirely different coordinate system.
**How this could be true**: The "lineage vs gradient" framing may be a false dichotomy imposed by available assays; actual mechanism could use neither, or context-switch between them.
```

---

### 3. Predictions Table (P)

Each hypothesis must generate at least one discriminative prediction — an observable outcome that differs across hypotheses.

**Format**:
```markdown
## 3. Predictions Table

| ID | Observation/Condition | H1 predicts | H2 predicts | H3 predicts |
|----|----------------------|-------------|-------------|-------------|
| P1 | [Observable X] | [outcome] | [outcome] | [outcome or "indeterminate"] |
| P2 | [Observable Y] | ... | ... | ... |
```

**Constraints**:
- Minimum 3 predictions
- Each prediction must discriminate between at least 2 hypotheses (different outcomes)
- Predictions should be in the "machine language" of the system (not abstract descriptions)
- Use "indeterminate" for H3 when the third alternative doesn't make a specific prediction

**Example**:
```markdown
## 3. Predictions Table

| ID | Observation/Condition | H1 (lineage) | H2 (gradient) | H3 |
|----|----------------------|--------------|---------------|-----|
| P1 | Transplant cell to new position early | Fate unchanged | Fate changes | indeterminate |
| P2 | Transplant cell to new position late | Fate unchanged | Fate unchanged | indeterminate |
| P3 | Ablate neighbor cells | No effect | Fate changes | indeterminate |
| P4 | Block cell division | Fate determination fails | Fate normal | indeterminate |
```

---

### 4. Discriminative Tests (T)

Ranked "decision experiments" that maximally separate hypotheses. Each test includes potency checks.

**Format**:
```markdown
## 4. Discriminative Tests

### T1: [Test name] (Score: X/12)
**Procedure**: [What you would do]
**Discriminates**: [Which hypotheses it separates, e.g., "H1 vs H2"]
**Expected outcomes**:
- If H1: [observation]
- If H2: [observation]
**Potency check**: [How you verify the assay worked (chastity vs impotence control)]
**Feasibility**: [Organism/system requirements, estimated difficulty]
**Evidence-per-week score**: [0-3 for each of: likelihood ratio, cost, speed, ambiguity]

### T2: [Test name] (Score: Y/12)
...
```

**Scoring Rubric** (0-3 each, max 12):
| Dimension | 0 | 1 | 2 | 3 |
|-----------|---|---|---|---|
| Likelihood ratio | <2:1 | 2-10:1 | 10-100:1 | >100:1 |
| Cost | >$100K | $10K-$100K | $1K-$10K | <$1K |
| Speed | >1 year | 1-6 months | 1 week - 1 month | <1 week |
| Ambiguity | Many confounds | Some confounds | Few confounds | Digital readout |

**Constraints**:
- Minimum 2 tests
- Tests must be ranked by total score (highest first)
- Each test MUST include a potency check (how you know a negative result means "no effect" rather than "assay failed")
- Tests should be specific enough to execute

**Example**:
```markdown
## 4. Discriminative Tests

### T1: Early transplant assay in C. elegans (Score: 10/12)
**Procedure**: Transplant a cell at the 16-cell stage to an ectopic position. Score fate at terminal differentiation.
**Discriminates**: H1 vs H2
**Expected outcomes**:
- If H1: Cell adopts fate predicted by lineage, not position
- If H2: Cell adopts fate predicted by new position
**Potency check**: Include a late-transplant control (both H1 and H2 predict fate is fixed → confirms assay can detect fate changes when they occur)
**Feasibility**: Requires C. elegans expertise + micromanipulation. Moderate difficulty.
**Evidence-per-week score**:
- Likelihood ratio: 3 (>100:1 — binary outcome)
- Cost: 2 (~$5K for equipment + labor)
- Speed: 2 (1 week per experiment)
- Ambiguity: 3 (digital: cell is Type A or Type B)

### T2: Division block + fate scoring (Score: 8/12)
**Procedure**: Block cell division chemically or genetically. Score whether fate determination proceeds.
**Discriminates**: H1 vs H2
**Expected outcomes**:
- If H1: Fate determination fails (no lineage to count)
- If H2: Fate determination proceeds (gradient still present)
**Potency check**: Confirm division block via DNA content (cells should be polyploid if block worked)
**Feasibility**: Standard tools available. Easy.
**Evidence-per-week score**:
- Likelihood ratio: 2 (10-100:1 — some alternative explanations)
- Cost: 3 (<$1K)
- Speed: 2 (1 week)
- Ambiguity: 1 (some confounds — toxicity, off-target effects)
```

---

### 5. Assumption Ledger (A)

Explicit list of load-bearing assumptions. Must include at least one scale/physics check.

**Format**:
```markdown
## 5. Assumption Ledger

### A1: [Assumption name]
**Statement**: [What we're assuming is true]
**Load**: [What breaks if this is wrong — which hypotheses/tests become invalid]
**Test**: [How this assumption could be checked]
**Status**: [unchecked | verified | falsified]

### A2: Scale/Physics Check
**Statement**: [A scale or physics constraint]
**Calculation**: [The actual numbers]
**Implication**: [What this rules out or requires]
```

**Constraints**:
- Minimum 3 assumptions
- At least ONE must be a scale/physics check (the "imprisoned imagination" constraint)
- Each assumption must specify what breaks if it's wrong

**Example**:
```markdown
## 5. Assumption Ledger

### A1: Cell identity is stable post-determination
**Statement**: Once a cell commits to a fate, it doesn't change under normal conditions.
**Load**: If wrong, transplant assays (T1) become uninterpretable — position effects could be transient.
**Test**: Lineage tracing of determined cells through division cycles.
**Status**: unchecked

### A2: Morphogen gradients are stable on relevant timescales
**Statement**: If gradients exist, they persist long enough to be read.
**Load**: If wrong, H2 becomes implausible for late-stage decisions.
**Test**: Live imaging of gradient reporters during fate windows.
**Status**: unchecked

### A3: Scale/Physics Check
**Statement**: Diffusion time for a morphogen across the relevant tissue.
**Calculation**: D ≈ 10 μm²/s, tissue width ≈ 100 μm → τ ≈ L²/D ≈ 1000s ≈ 17 min. Cell cycle ≈ 60 min. Gradient can re-establish between divisions.
**Implication**: Gradient-based signaling is physically plausible at this scale. Does not rule out H2.
```

---

### 6. Anomaly Register (X)

Exceptions that don't fit the current framing. Quarantine them explicitly — don't sweep under the carpet.

**Format**:
```markdown
## 6. Anomaly Register

### X1: [Anomaly name]
**Observation**: [What was observed that doesn't fit]
**Conflicts with**: [Which hypotheses or assumptions this challenges]
**Quarantine status**: [active | resolved | deferred]
**Resolution plan**: [How this will be addressed, or "defer until core question settled"]

[If no anomalies]
**None registered**: No observations currently conflict with the framing.
```

**Constraints**:
- May be empty (but must state "None registered" explicitly)
- Anomalies should be specific observations, not vague concerns
- Each anomaly must state which part of the framework it challenges

**Example**:
```markdown
## 6. Anomaly Register

### X1: The AB lineage exception
**Observation**: In C. elegans, most AB lineage fates are position-dependent, but some EMS lineage fates appear position-independent.
**Conflicts with**: Both H1 (some cells aren't lineage-determined) and H2 (some cells aren't gradient-determined)
**Quarantine status**: active
**Resolution plan**: May support H3 (hybrid mechanism). Defer detailed analysis until core transplant data available.
```

---

### 7. Adversarial Critique (C)

What would make the whole framing wrong? This section attacks the artifact's own assumptions.

**Format**:
```markdown
## 7. Adversarial Critique

### C1: [Critique name]
**Attack**: [How the framing could be fundamentally wrong]
**Evidence that would confirm this**: [What would we need to see]
**Current status**: [How seriously we take this threat]

### C2: [The real third alternative]
**Attack**: [A specific alternative framing that might be more correct]
**Why it might be right**: [Evidence or argument]
```

**Constraints**:
- Minimum 2 critiques
- At least one should be a "real third alternative" — not just "both wrong" but a specific alternative framing
- Critiques should be substantive, not perfunctory

**Example**:
```markdown
## 7. Adversarial Critique

### C1: The dichotomy is anachronistic
**Attack**: The lineage-vs-gradient distinction was formulated before single-cell transcriptomics. Modern data may reveal that neither "lineage" nor "gradient" captures what cells actually compute.
**Evidence that would confirm this**: Single-cell trajectory analysis shows fate decision boundaries that don't align with either lineage clades or spatial domains.
**Current status**: Moderate concern. Should review recent single-cell literature before committing to experimental design.

### C2: The real third alternative — epigenetic memory without lineage counting
**Attack**: Cells may use chromatin states inherited through division (neither counting divisions nor reading gradients) — a "memory" mechanism distinct from both H1 and H2.
**Why it might be right**: Epigenetic inheritance is well-documented; this would explain why transplants sometimes show "partial" fate changes depending on timing.
```

---

## Metadata Header

Every artifact file begins with a YAML front matter block:

```yaml
---
session_id: "THREAD-001"
created_at: "2025-12-29T19:00:00Z"
updated_at: "2025-12-29T20:30:00Z"
version: 1
contributors:
  - agent: "GreenDog"
    program: "claude-code"
    model: "opus-4.5"
  - agent: "BlueLake"
    program: "codex-cli"
    model: "gpt-5.2"
status: "draft" | "active" | "closed"
---
```

---

## Full Example

```markdown
---
session_id: "CELL-FATE-001"
created_at: "2025-12-29T19:00:00Z"
updated_at: "2025-12-29T20:30:00Z"
version: 1
contributors:
  - agent: "GreenDog"
    program: "claude-code"
    model: "opus-4.5"
status: "draft"
---

# Brenner Protocol Artifact: CELL-FATE-001

## 1. Research Thread

**RT**: Does the C. elegans embryo use lineage-based or gradient-based coordinates for cell fate determination?

**Context**: C. elegans has an invariant lineage (every cell division is reproducible). Yet some fates are position-dependent. We need to determine which coordinate system dominates.

**Why it matters**: Choosing the right coordinate system determines which genetic screens and perturbations are informative.

**Anchors**: §161, §205

## 2. Hypothesis Slate

### H1: Lineage-dominant
**Claim**: Cell fate is primarily determined by lineage history; position effects are secondary refinements.
**Mechanism**: Cells count divisions and inherit fate determinants asymmetrically.
**Anchors**: §161

### H2: Gradient-dominant
**Claim**: Cell fate is primarily determined by position via morphogen gradients; lineage provides cellular context only.
**Mechanism**: Cells read spatial signals and integrate them to determine fate.
**Anchors**: §205

### H3: Third Alternative
**Claim**: Both are secondary to an epigenetic memory system that doesn't fit either model.
**How this could be true**: Chromatin states inherited through division may encode fate information independent of both lineage counting and gradient reading.

## 3. Predictions Table

| ID | Condition | H1 | H2 | H3 |
|----|-----------|-----|-----|-----|
| P1 | Early transplant | Fate unchanged | Fate changes | indeterminate |
| P2 | Late transplant | Fate unchanged | Fate unchanged | indeterminate |
| P3 | Neighbor ablation | No effect | Fate changes | indeterminate |

## 4. Discriminative Tests

### T1: Early transplant in C. elegans (Score: 10/12)
**Procedure**: Transplant cells at 8-16 cell stage. Score terminal fates.
**Discriminates**: H1 vs H2
**Expected outcomes**:
- H1: Original lineage fate
- H2: New position fate
**Potency check**: Late transplant control (both predict no change)
**Evidence-per-week score**: LR=3, Cost=2, Speed=2, Ambiguity=3

## 5. Assumption Ledger

### A1: Invariant lineage is reproducible
**Statement**: Every wild-type embryo follows the same cell division pattern.
**Load**: If wrong, transplant results aren't generalizable.
**Test**: Lineage tracing in N>10 embryos.
**Status**: verified (well-established in literature)

### A2: Scale check
**Statement**: Diffusion time for morphogens across embryo.
**Calculation**: D≈10μm²/s, embryo≈50μm → τ≈4min. Fast enough for intra-cell-cycle signaling.
**Implication**: H2 is physically plausible.

## 6. Anomaly Register

**None registered**: No observations currently conflict with the framing.

## 7. Adversarial Critique

### C1: Modern single-cell data may obsolete the dichotomy
**Attack**: scRNA-seq trajectory analysis may reveal decision boundaries that don't map to either lineage or position.
**Evidence that would confirm**: Fate transition points uncorrelated with division or position.
**Current status**: Should review before finalizing experimental design.

### C2: Epigenetic memory as real third alternative
**Attack**: Chromatin state inheritance (neither counting nor reading) could dominate.
**Why it might be right**: Would explain partial fate changes in transplants.
```

---

## Validation Rules (for linter)

A conforming artifact must pass these checks:

### Errors (must fix)
- [ ] All 7 required sections present
- [ ] Metadata header present with required fields
- [ ] At least 3 hypotheses (including third alternative)
- [ ] Third alternative explicitly labeled
- [ ] At least 3 predictions in table
- [ ] At least 2 discriminative tests
- [ ] At least 3 assumptions (including 1 scale check)
- [ ] Anomaly register present (even if "None registered")
- [ ] At least 2 adversarial critiques
- [ ] All item IDs follow naming convention

### Warnings (should fix)
- [ ] Each test has a potency check
- [ ] Each hypothesis has anchors or is marked "inference"
- [ ] Predictions discriminate between hypotheses (not all same outcome)
- [ ] Tests are ranked by score
- [ ] Scale check includes actual calculation

### Info (nice to have)
- [ ] Contributors listed in metadata
- [ ] Session ID follows thread naming convention
- [ ] All citations use §n anchor format

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-29 | Initial draft |
