/**
 * Demo Session Fixtures
 *
 * Static fixture data for demonstrating the BrennerBot sessions feature
 * on the public website when Lab Mode is disabled.
 *
 * Source material: artifacts/kickoff-pack-bio_inspired_nanochat.md
 */

import type { SessionPhase } from "@/lib/threadStatus";

// =============================================================================
// Types (matching real interfaces from sessions pages)
// =============================================================================

/**
 * ThreadSummary for list view - matches src/app/sessions/page.tsx
 */
export interface DemoThreadSummary {
  threadId: string;
  messageCount: number;
  firstMessageTs: string;
  lastMessageTs: string;
  phase: SessionPhase;
  hasArtifact: boolean;
  pendingAcks: number;
  participants: string[];
}

/**
 * Message for detail view - subset of AgentMailMessage from agentMail.ts
 */
export interface DemoMessage {
  id: number;
  thread_id: string;
  subject: string;
  body_md: string;
  from: string;
  to: string[];
  created_ts: string;
  ack_required?: boolean;
}

/**
 * Complete demo session with both list and detail data
 */
export interface DemoSession {
  summary: DemoThreadSummary;
  messages: DemoMessage[];
}

// =============================================================================
// Demo Data
// =============================================================================

/**
 * Demo Session 1: Bio-Inspired Nanochat Research (Compiled)
 *
 * A complete session showing the full Brenner Loop workflow:
 * KICKOFF -> DELTAs from 3 agents -> COMPILED artifact
 */
const bioNanochatSession: DemoSession = {
  summary: {
    threadId: "demo-bio-nanochat-001",
    messageCount: 5,
    firstMessageTs: "2025-12-15T10:30:00Z",
    lastMessageTs: "2025-12-15T14:45:00Z",
    phase: "compiled",
    hasArtifact: true,
    pendingAcks: 0,
    participants: ["Operator", "ClaudeCode", "CodexCLI", "GeminiCLI"],
  },
  messages: [
    {
      id: 1,
      thread_id: "demo-bio-nanochat-001",
      subject: "KICKOFF: Bio-Inspired Nanochat - Vesicle Depletion vs Frequency Penalty",
      body_md: `# Research Question

In Bio-Inspired Nanochat, is **presynaptic vesicle depletion** (RRP clamping) functionally distinguishable from an ordinary **frequency penalty / logit bias**? If yes, what minimal experiments separate the two?

## Working Hypotheses

- **H1 (Equivalence):** RRP clamping is effectively a tuned frequency penalty; any apparent gains are regularization/cost tradeoffs.
- **H2 (Mechanistic):** RRP clamping creates *context-/edge-dependent fatigue* that changes attention dynamics in ways a token-count penalty can't reproduce.
- **H3 (Misspecification):** Any "wins" are artifacts (metric confound, sampling/seed effects, compute/capacity mismatch, or evaluation leakage).

## Brenner Anchors

> **§103**: "You've forgotten there's a third alternative… 'Both could be wrong'"
> — *Third-alternative guard*

> **§106**: "Occam's Broom… the minimum number of facts have to be swept up under the carpet"
> — *Minimize hidden contradictions*

> **§160**: "If you can't compute it you can't understand it."
> — *Reconstruction standard*

## Expected Outputs
- Ranked discriminative tests (cheap → expensive)
- Evidence pack with relevant papers
- Assumption ledger for each hypothesis`,
      from: "Operator",
      to: ["ClaudeCode", "CodexCLI", "GeminiCLI"],
      created_ts: "2025-12-15T10:30:00Z",
      ack_required: true,
    },
    {
      id: 2,
      thread_id: "demo-bio-nanochat-001",
      subject: "DELTA[hypothesis_generator]: Initial hypothesis refinement",
      body_md: `# Hypothesis Generator Response

## Refined Working Hypotheses

### H1 (Equivalence) - Strengthened
RRP clamping implements a **stateful frequency penalty** where the penalty coefficient decays over time (tau_rrp). This is mathematically equivalent to an exponentially-weighted moving average penalty on token frequencies.

**Prediction:** If we tune a frequency penalty with matching decay characteristics, outputs should be statistically indistinguishable.

### H2 (Mechanistic) - Clarified
The key distinction would be **attention-mediated suppression**: RRP depletion could affect tokens differently based on their attention weights, not just their frequency. A high-attention token might deplete faster than a low-attention one with the same frequency.

**Prediction:** In prompts with identical token frequencies but different attention structures, RRP and frequency penalty should diverge.

### H3 (Misspecification) - Operationalized
Before claiming any effect, we must control for:
- Random seed effects (run N>30 seeds)
- Temperature/sampling interactions
- Prompt length confounds

\`\`\`json
{"delta":{"operation":"ADD","section":"hypotheses","content":{"id":"H1.1","title":"Stateful frequency penalty equivalence","confidence":0.6}}}
\`\`\``,
      from: "CodexCLI",
      to: ["Operator"],
      created_ts: "2025-12-15T11:15:00Z",
    },
    {
      id: 3,
      thread_id: "demo-bio-nanochat-001",
      subject: "DELTA[test_designer]: Discriminative test battery",
      body_md: `# Test Designer Response

## Ranked Discriminative Tests

### Test 1: Matched-Baseline Equivalence (Cost: Low)
Replace RRP clamping with an explicit frequency penalty tuned to match *repetition rate* on a small calibration prompt set; compare on held-out prompts.

**Metrics:** Repetition rate, perplexity, BLEU self-overlap
**Falsifies:** H1 if significant divergence; H2 if no divergence

### Test 2: Context-Sensitivity Probe (Cost: Medium)
Construct two prompts with identical token-frequency statistics but different attention patterns (verified via attention visualization).

**Design:**
- Prompt A: Linear narrative (sequential attention)
- Prompt B: Nested structure (hierarchical attention)
- Both have same unigram/bigram frequencies

**Prediction under H2:** RRP behaves differently; frequency penalty doesn't.

### Test 3: Ablation Matrix (Cost: Medium)
Run 4 conditions: vanilla, presynaptic-only, vanilla+freq_penalty, presynaptic+freq_penalty

**Detects:** Double-counting effects, interaction terms

\`\`\`json
{"delta":{"operation":"ADD","section":"tests","content":{"id":"T1","title":"Matched-baseline equivalence","priority":1,"status":"proposed"}}}
\`\`\`
\`\`\`json
{"delta":{"operation":"ADD","section":"tests","content":{"id":"T2","title":"Context-sensitivity probe","priority":2,"status":"proposed"}}}
\`\`\``,
      from: "ClaudeCode",
      to: ["Operator"],
      created_ts: "2025-12-15T12:30:00Z",
    },
    {
      id: 4,
      thread_id: "demo-bio-nanochat-001",
      subject: "DELTA[adversarial_critic]: Critical review and H3 expansion",
      body_md: `# Adversarial Critic Response

## Critical Review

### On H1 (Equivalence)
**Weakness:** The "stateful frequency penalty" framing assumes RRP depletion is *monotonic* in token frequency. But biological synaptic depression shows **facilitation** at certain frequencies. Has this been checked?

**Required control:** Plot RRP value vs. token frequency across different contexts. If non-monotonic, H1 fails.

### On H2 (Mechanistic)
**Weakness:** "Attention-mediated suppression" is vague. Attention to *what*? The current token? Previous tokens? The RRP implementation doesn't obviously use attention weights.

**Demand:** Point to specific code where attention affects RRP. If it doesn't exist, H2 is unfounded speculation.

### On Test 2
**Problem:** How do you guarantee "identical token-frequency statistics"? Even small deviations could explain any differences. Need statistical test for frequency distribution equivalence (e.g., chi-squared).

## Expanded H3 Considerations
- **Evaluation leakage:** Are the metrics computed on the same data used to tune RRP parameters?
- **Cherry-picking:** How were example prompts selected? Were failures hidden?

\`\`\`json
{"delta":{"operation":"ADD","section":"objections","content":{"id":"O1","target":"H2","severity":"major","description":"No evidence attention affects RRP in codebase"}}}
\`\`\``,
      from: "GeminiCLI",
      to: ["Operator"],
      created_ts: "2025-12-15T13:45:00Z",
    },
    {
      id: 5,
      thread_id: "demo-bio-nanochat-001",
      subject: "COMPILED: v1 Research Brief - Bio-Inspired Nanochat Investigation",
      body_md: `# Research Brief v1: Bio-Inspired Nanochat

## Executive Summary
This session investigates whether presynaptic vesicle depletion (RRP clamping) in Bio-Inspired Nanochat provides genuine mechanistic benefits over simpler frequency penalties.

## Current Hypothesis Slate

| ID | Hypothesis | Confidence | Status |
|----|------------|------------|--------|
| H1 | RRP ≈ stateful frequency penalty | 0.6 | Active |
| H2 | Attention-mediated suppression | 0.3 | **Challenged** |
| H3 | Artifacts/confounds | 0.4 | Active |

## Discriminative Test Queue

| Priority | Test | Targets | Status |
|----------|------|---------|--------|
| 1 | Matched-baseline equivalence | H1 ↔ H2 | Proposed |
| 2 | Context-sensitivity probe | H2 | Proposed |
| 3 | Ablation matrix | All | Proposed |

## Open Objections

- **O1 (Major):** No evidence that attention weights affect RRP in the actual codebase. H2 may be unfounded.

## Next Steps
1. Code audit: Search for attention-RRP coupling
2. Run Test 1 with N=30 seeds
3. Address O1 before investing in Test 2

## Brenner Protocol Compliance
- ✅ Third alternative included (H3)
- ✅ Discriminative tests ranked by cost
- ⚠️ Need to verify "compute it to understand it" for H2

---
*Compiled from 3 agent contributions. Version 1.*`,
      from: "Operator",
      to: ["ClaudeCode", "CodexCLI", "GeminiCLI"],
      created_ts: "2025-12-15T14:45:00Z",
    },
  ],
};

/**
 * Demo Session 2: Awaiting Responses
 *
 * A session in progress, showing the kickoff sent but waiting for agent responses.
 */
const transcriptAnalysisSession: DemoSession = {
  summary: {
    threadId: "demo-transcript-analysis-002",
    messageCount: 1,
    firstMessageTs: "2025-12-16T09:00:00Z",
    lastMessageTs: "2025-12-16T09:00:00Z",
    phase: "awaiting_responses",
    hasArtifact: false,
    pendingAcks: 3,
    participants: ["Operator"],
  },
  messages: [
    {
      id: 10,
      thread_id: "demo-transcript-analysis-002",
      subject: "KICKOFF: Brenner Interview Methodology Analysis",
      body_md: `# Research Question

What distinguishes Brenner's interview technique from standard oral history methodology, and can these distinctions be operationalized for AI-assisted research?

## Working Hypotheses

- **H1 (Socratic Provocation):** Brenner's interruptions and challenges aren't rudeness but deliberate Socratic probes designed to surface implicit assumptions.
- **H2 (Collaborative Reconstruction):** The interview is a joint reconstruction where both participants contribute to building the narrative, not a simple Q&A extraction.
- **H3 (Performance Artifact):** The distinctive style is a performance for the camera/recorder that doesn't reflect Brenner's actual thinking process.

## Brenner Anchors

> **§52**: "I can hardly get a word in edgewise but I'll try"
> — *The interviewer's Socratic role*

> **§167**: "I think you should worry less about understanding and more about doing"
> — *Epistemic stance on tacit knowledge*

## Expected Outputs
- Categorization of Brenner's interview interventions
- Comparison with standard oral history protocols
- Recommendations for AI-assisted interviewing`,
      from: "Operator",
      to: ["ClaudeCode", "CodexCLI", "GeminiCLI"],
      created_ts: "2025-12-16T09:00:00Z",
      ack_required: true,
    },
  ],
};

/**
 * Demo Session 3: In Critique Phase
 *
 * A session where the initial artifact has been compiled and is now receiving critiques.
 */
const experimentDesignSession: DemoSession = {
  summary: {
    threadId: "demo-experiment-design-003",
    messageCount: 6,
    firstMessageTs: "2025-12-14T14:00:00Z",
    lastMessageTs: "2025-12-15T10:00:00Z",
    phase: "in_critique",
    hasArtifact: true,
    pendingAcks: 0,
    participants: ["Operator", "ClaudeCode", "CodexCLI", "GeminiCLI"],
  },
  messages: [
    {
      id: 20,
      thread_id: "demo-experiment-design-003",
      subject: "KICKOFF: Discriminative Experiment Design Principles",
      body_md: `# Research Question

What makes an experiment "discriminative" in the Brenner sense, and how can we formalize this for automated hypothesis testing?

## Working Hypotheses

- **H1:** A discriminative experiment is one where the expected outcomes under competing hypotheses have non-overlapping confidence intervals.
- **H2:** Discriminativeness requires asymmetric "surprise" — one hypothesis predicts the outcome confidently while another assigns low probability.
- **H3:** True discriminativeness is context-dependent and cannot be formalized without reference to the researcher's prior beliefs.

## Brenner Anchor

> **§103**: "what we had decided to go for was a really definitive one"
> — *The discriminative experiment criterion*`,
      from: "Operator",
      to: ["ClaudeCode", "CodexCLI", "GeminiCLI"],
      created_ts: "2025-12-14T14:00:00Z",
      ack_required: true,
    },
    {
      id: 21,
      thread_id: "demo-experiment-design-003",
      subject: "DELTA[hypothesis_generator]: Formalizing discriminativeness",
      body_md: `# Hypothesis Generator Response

## Proposed Formalization

Let H1, H2 be competing hypotheses and E be an experiment with possible outcomes O = {o1, o2, ...}.

**Definition (Discriminative Power):**
\`\`\`
D(E; H1, H2) = Σ_o |P(o|H1) - P(o|H2)| × min(P(o|H1), P(o|H2))
\`\`\`

This captures both the *divergence* between predictions and the *confidence* in those predictions.

\`\`\`json
{"delta":{"operation":"ADD","section":"hypotheses","content":{"id":"H1.formal","title":"Discriminative power metric","confidence":0.5}}}
\`\`\``,
      from: "CodexCLI",
      to: ["Operator"],
      created_ts: "2025-12-14T15:30:00Z",
    },
    {
      id: 22,
      thread_id: "demo-experiment-design-003",
      subject: "DELTA[test_designer]: Validation experiments",
      body_md: `# Test Designer Response

## Proposed Validation

Test the discriminativeness metric on historical experiments from the Brenner transcript where Brenner explicitly labeled experiments as "definitive" vs. "inconclusive."

\`\`\`json
{"delta":{"operation":"ADD","section":"tests","content":{"id":"T1","title":"Historical validation on Brenner examples","priority":1}}}
\`\`\``,
      from: "ClaudeCode",
      to: ["Operator"],
      created_ts: "2025-12-14T16:45:00Z",
    },
    {
      id: 23,
      thread_id: "demo-experiment-design-003",
      subject: "DELTA[adversarial_critic]: Critique of formalization",
      body_md: `# Adversarial Critic Response

## Critical Issues

The proposed metric has a fatal flaw: it requires knowing P(o|H) for all outcomes, but the whole point of running an experiment is that we *don't know* these probabilities with certainty.

**Counter-proposal:** Discriminativeness should be measured by the *expected information gain* under each hypothesis's prior predictive distribution.

\`\`\`json
{"delta":{"operation":"ADD","section":"objections","content":{"id":"O1","target":"H1.formal","severity":"major","description":"Requires unknowable outcome probabilities"}}}
\`\`\``,
      from: "GeminiCLI",
      to: ["Operator"],
      created_ts: "2025-12-14T18:00:00Z",
    },
    {
      id: 24,
      thread_id: "demo-experiment-design-003",
      subject: "COMPILED: v1 Discriminative Experiment Framework",
      body_md: `# Research Brief v1: Discriminative Experiment Design

## Summary
Initial formalization of "discriminative experiment" with one major objection outstanding.

## Open Objections
- O1: Proposed metric requires unknowable outcome probabilities

*Compiled from 3 contributions. Ready for critique.*`,
      from: "Operator",
      to: ["ClaudeCode", "CodexCLI", "GeminiCLI"],
      created_ts: "2025-12-14T19:30:00Z",
    },
    {
      id: 25,
      thread_id: "demo-experiment-design-003",
      subject: "CRITIQUE: Fundamental issues with probabilistic framing",
      body_md: `# Critique of v1

## Major Concern

The entire probabilistic framing may be misguided. Brenner's notion of "discriminative" seems to be more about **logical structure** than probabilistic confidence:

> "You've forgotten there's a third alternative"

This suggests discriminativeness is about ruling out *logical possibilities*, not updating *probability distributions*.

**Proposed revision:** Reframe in terms of logical entailment and possibility elimination rather than Bayesian updating.

## Request
Consider adding H4: Discriminativeness is fundamentally logical (possible world elimination), not probabilistic.`,
      from: "GeminiCLI",
      to: ["Operator"],
      created_ts: "2025-12-15T10:00:00Z",
    },
  ],
};

// =============================================================================
// Exported Data
// =============================================================================

/**
 * All demo sessions available for the public website
 */
export const DEMO_SESSIONS: DemoSession[] = [
  bioNanochatSession,
  transcriptAnalysisSession,
  experimentDesignSession,
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all thread summaries for the sessions list view
 */
export function getDemoThreadSummaries(): DemoThreadSummary[] {
  return DEMO_SESSIONS.map((s) => s.summary);
}

/**
 * Get messages for a specific demo thread (for detail view)
 * @returns Messages array or null if threadId not found
 */
export function getDemoThreadMessages(threadId: string): DemoMessage[] | null {
  const session = DEMO_SESSIONS.find((s) => s.summary.threadId === threadId);
  return session?.messages ?? null;
}

/**
 * Check if a threadId belongs to a demo session
 */
export function isDemoSession(threadId: string): boolean {
  return threadId.startsWith("demo-");
}

/**
 * Get a specific demo session by threadId
 */
export function getDemoSession(threadId: string): DemoSession | null {
  return DEMO_SESSIONS.find((s) => s.summary.threadId === threadId) ?? null;
}
