# Brenner Protocol: Evaluation Rubric v0.1

> **Status**: Draft specification
> **Purpose**: Scoring criteria for role outputs to enable consistent evaluation across sessions
> **Depends on**: `role_prompts_v0.1.md`, `delta_output_format_v0.1.md`

---

## Overview

This rubric defines what "good" looks like for each role's output. Evaluators (human or automated) use these criteria to score contributions consistently.

### Scoring Philosophy

The Brenner Protocol values **discriminative power** over thoroughness. A single hypothesis that kills an alternative is worth more than ten "interesting observations." Scoring reflects this bias toward decisive contributions.

---

## Universal Criteria (All Roles)

These criteria apply to every delta contribution regardless of role.

### 1. Structural Correctness (0-3)

Does the output follow the delta format specification?

| Score | Criteria |
|-------|----------|
| 0 | Invalid JSON, missing required fields, or wrong operation type |
| 1 | Valid structure but wrong section or malformed payload |
| 2 | Correct structure with minor issues (e.g., missing optional fields) |
| 3 | Perfect compliance with `delta_output_format_v0.1.md` |

**Automatic disqualifiers**:
- Invalid JSON syntax
- Missing `operation`, `section`, or `payload` fields
- Operation/section mismatch (e.g., KILL with no `target_id`)

### 2. Citation Compliance (0-3)

Are transcript anchors and inference markers used correctly?

| Score | Criteria |
|-------|----------|
| 0 | Claims "Brenner said X" with no anchor or fake anchor |
| 1 | Uses anchors but inconsistently; mixes inference with claims |
| 2 | Correct anchor usage with minor omissions |
| 3 | All Brenner references properly anchored (§n); inferences marked [inference] |

**Citation standards**:
- Direct quotes: `(§n)` required
- Paraphrases: `(§n)` required
- Synthesis across distillations: `[synthesis]` marker
- Agent's own reasoning: `[inference]` marker

### 3. Rationale Quality (0-3)

Does the rationale explain the contribution effectively?

| Score | Criteria |
|-------|----------|
| 0 | Missing rationale or pure restating of payload |
| 1 | Present but vague ("this is important") |
| 2 | Explains why, references operators, but incomplete |
| 3 | Clear why, which operators used, and how it advances the session |

**Good rationales include**:
- Which operator(s) motivated this contribution
- Why this contribution matters to the research thread
- What alternatives it helps distinguish

---

## Hypothesis Generator (Codex) Criteria

### 4. Level Separation (0-3)

Has the contributor applied ⊘ Level-Split correctly?

| Score | Criteria |
|-------|----------|
| 0 | Obvious level conflation (program/interpreter, cause/reason) |
| 1 | Some awareness but incomplete separation |
| 2 | Clear separation with minor blending |
| 3 | Crisp level distinctions; mechanism and specification cleanly typed |

**Level conflation red flags**:
- "The gene tells the cell to..."
- "The organism decides to..."
- Confusing "won't" (chastity) with "can't" (impotence)

### 5. Third Alternative Presence (0-3)

Is a genuine third alternative included?

| Score | Criteria |
|-------|----------|
| 0 | No third alternative mentioned |
| 1 | Third alternative is "both could be wrong" (placeholder, not specific) |
| 2 | Specific third alternative but derivative (special case of H1/H2) |
| 3 | Genuinely orthogonal third alternative that would invalidate both others |

**Quality indicators for third alternatives**:
- Proposes a different causal structure, not a blend
- Comes from cross-domain transfer (⊕)
- Identifies a shared assumption that could be false

### 6. Paradox Exploitation (0-2, optional)

Does the contribution leverage paradoxes productively?

| Score | Criteria |
|-------|----------|
| 0 | Ignores contradictions or resolves them prematurely |
| 1 | Notes paradox but doesn't derive hypothesis from it |
| 2 | Paradox directly motivates the hypothesis; missing rule identified |

---

## Test Designer (Opus) Criteria

### 7. Discriminative Power (0-3)

Does the test actually distinguish hypotheses?

| Score | Criteria |
|-------|----------|
| 0 | Test would give same outcome for all hypotheses |
| 1 | Weak discrimination (2:1 likelihood ratio at best) |
| 2 | Clear different predictions but some overlap |
| 3 | Digital discrimination: outcome X → H1; outcome Y → H2 (and both are plausible) |

**Discriminative test checklist**:
- [ ] Expected outcomes differ for each hypothesis
- [ ] Difference is binary or quantitatively large
- [ ] Both outcomes are actually observable

### 8. Potency Check Sufficiency (0-3)

Can we distinguish "no effect" from "assay failed"?

| Score | Criteria |
|-------|----------|
| 0 | No potency check included |
| 1 | Potency check mentioned but would not detect assay failure |
| 2 | Adequate potency check with minor gaps |
| 3 | Complete potency check: positive control, sensitivity verification, timing validation |

**Potency check components**:
- Positive control that would show the effect if present
- Sensitivity verification that detection threshold is adequate
- Timing validation that the assay window is correct

### 9. Object Transposition Considered (0-2, optional)

Has the contributor considered alternative experimental systems?

| Score | Criteria |
|-------|----------|
| 0 | Experimental object treated as given, not designed |
| 1 | Brief mention of alternative systems |
| 2 | Explicit object transposition reasoning with cost/benefit |

### 10. Score Calibration Honesty (0-2)

Is the 4-dimension score realistic?

| Score | Criteria |
|-------|----------|
| 0 | Scores obviously inflated (all 3s) or absent |
| 1 | Some calibration but optimistic |
| 2 | Honest, conservative scoring with appropriate uncertainty |

---

## Adversarial Critic (Gemini) Criteria

### 11. Scale Check Rigor (0-3)

Are physical constraints calculated, not assumed?

| Score | Criteria |
|-------|----------|
| 0 | No scale check or hand-waved "should work" |
| 1 | Qualitative scale reasoning without calculation |
| 2 | Calculation present but incomplete (missing units, wrong order of magnitude) |
| 3 | Full calculation: quantities, units, result, and what it rules out |

**Scale check components**:
- Actual numbers (not "fast" or "slow")
- Units and dimensional analysis
- Comparison to relevant physical constraint
- Explicit conclusion about what violates the constraint

### 12. Anomaly Quarantine Discipline (0-3)

Are anomalies tracked explicitly rather than swept or destroyed?

| Score | Criteria |
|-------|----------|
| 0 | Anomalies ignored or used to prematurely kill frameworks |
| 1 | Anomalies mentioned but not formally quarantined |
| 2 | Formal quarantine with resolution plan |
| 3 | Explicit tracking, status updates, and Occam's broom awareness |

**Quarantine discipline**:
- Anomaly explicitly named and described
- Conflict with specific hypotheses/assumptions noted
- Resolution plan or deferral reason stated
- Neither hidden nor allowed to destroy coherent framework

### 13. Theory Kill Justification (0-3, when KILL operation used)

Is the kill justified with sufficient evidence?

| Score | Criteria |
|-------|----------|
| 0 | Kill based on aesthetic preference or convenience |
| 1 | Kill based on single piece of weak evidence |
| 2 | Kill with multiple evidence points but room for doubt |
| 3 | Kill is decisive: direct contradiction of core mechanism, no rescue moves available |

**Unjustified kill indicators**:
- "This seems unlikely"
- "We don't need this anymore"
- "This is getting complicated"

### 14. Real Third Alternative (not just skepticism) (0-3)

Does the critique propose a constructive alternative?

| Score | Criteria |
|-------|----------|
| 0 | Pure skepticism ("we don't know") with no alternative |
| 1 | Alternative is vague ("something else could be going on") |
| 2 | Specific alternative but not fully developed |
| 3 | Concrete alternative with mechanism, testable predictions |

---

## Composite Scoring

### Handling Conditional Criteria

Some criteria are marked as conditional or optional:

| Criterion | Applies When |
|-----------|--------------|
| 6. Paradox Exploitation | Hypothesis Generator only; score 0 if no paradox context |
| 9. Object Transposition | Test Designer only; score 0 if not applicable |
| 10. Score Calibration | Test Designer only; score 0 if no test score included |
| 13. Theory Kill Justification | Adversarial Critic ONLY when using KILL operation |

**For conditional criteria**:
- If the criterion doesn't apply (e.g., Kill-Justify for an ADD operation), **exclude it from the denominator**
- Recalculate max score without the excluded criterion
- This prevents penalizing contributions for not doing something that wasn't relevant

### Per-Contribution Score

Calculate a weighted composite for each delta:

**Hypothesis Generator (Codex)**:
```
Score = (Structural × 1.0) + (Citation × 1.0) + (Rationale × 0.5) +
        (Level-Sep × 1.5) + (Third-Alt × 2.0) + (Paradox × 0.5)

Max = 3 + 3 + 1.5 + 4.5 + 6 + 1 = 19 points
```

**Test Designer (Opus)**:
```
Score = (Structural × 1.0) + (Citation × 1.0) + (Rationale × 0.5) +
        (Discriminative × 2.0) + (Potency × 2.0) + (Object-Trans × 0.5) + (Calibration × 0.5)

Max = 3 + 3 + 1.5 + 6 + 6 + 1 + 1 = 21.5 points
```

**Adversarial Critic (Gemini)**:
```
Score = (Structural × 1.0) + (Citation × 1.0) + (Rationale × 0.5) +
        (Scale × 1.5) + (Quarantine × 1.5) + [Kill-Justify × 1.5]* + (Real-Third × 1.5)

*Kill-Justify only applies for KILL operations; omit for ADD/EDIT

Max (with KILL) = 3 + 3 + 1.5 + 4.5 + 4.5 + 4.5 + 4.5 = 25.5 points
Max (ADD/EDIT)  = 3 + 3 + 1.5 + 4.5 + 4.5 + 4.5 = 21 points
```

### Session-Level Aggregation

For evaluating a complete session:

1. **Volume**: Count of valid deltas per role
2. **Quality**: Mean composite score per role
3. **Progression**: Did quality improve over rounds?
4. **Convergence**: Did hypotheses narrow (kills > adds by end)?
5. **Coverage**: Were all operators in the role's toolkit used?

---

## Pass/Fail Gates

Certain failures are disqualifying regardless of other scores:

### Automatic Failures

| Failure | Consequence |
|---------|-------------|
| Invalid JSON in delta block | Delta rejected |
| Missing potency check in test | Test rejected |
| Fake transcript anchor (§n that doesn't exist) | Contribution flagged |
| KILL without rationale | KILL rejected |
| Third alternative missing in hypothesis set | Hypothesis set incomplete |

### Warning Thresholds

| Condition | Warning |
|-----------|---------|
| Composite < 50% of max | Low-quality contribution |
| > 3 ADDs without KILL | Possible hypothesis sprawl |
| Scale check missing for mechanism claim | Unverified claim |
| Potency score < 2 for recommended test | Weak assay design |

---

## Example Scored Contribution

### Input (Hypothesis Generator Delta)

```delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "Epigenetic microcode",
    "claim": "Cell fate is determined by inherited chromatin states that encode a 'microcode' layer between genes and behavior",
    "mechanism": "Histone marks persist through division and gate gene accessibility independent of position or lineage count",
    "anchors": ["inference"],
    "third_alternative": true
  },
  "rationale": "Applying ⊕ Cross-Domain: microcode architecture from computing as structural analogy. This creates a genuine third alternative to lineage-counting (H1) and gradient-reading (H2) by proposing that neither lineage nor position matters—only inherited chromatin state."
}
```

### Scoring

| Criterion | Score | Notes |
|-----------|-------|-------|
| Structural Correctness | 3 | Perfect delta format |
| Citation Compliance | 3 | Correctly marked as [inference] |
| Rationale Quality | 3 | Names operator, explains why it's third alternative |
| Level Separation | 2 | Mechanism clean but could be more precise about what "gating" means at molecular level |
| Third Alternative Presence | 3 | Genuinely orthogonal to H1/H2; different causal structure |
| Paradox Exploitation | 1 | No paradox explicitly leveraged |

**Composite**: 3 + 3 + 1.5 + 3 + 6 + 0.5 = **17/19 (89%)**

---

## Evaluation Protocol

### For Human Evaluators

1. Read the research thread context first
2. Score each delta independently before seeing others
3. Use the checklist in each role prompt as a guide
4. When uncertain, score conservatively
5. Document disagreements for calibration sessions

### For Automated Evaluation

1. **Structural checks**: Validate JSON, required fields, section/operation compatibility
2. **Anchor verification**: Cross-reference §n citations against transcript
3. **Operator detection**: Scan rationale for operator symbols/names
4. **Keyword heuristics**: Flag level-conflation patterns, missing potency language
5. **Human escalation**: Flag edge cases for human review

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-30 | Initial draft: scoring criteria, composite formulas, example |
