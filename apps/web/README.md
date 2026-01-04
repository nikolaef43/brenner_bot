This is the BrennerBot web app (Next.js App Router + React 19), bootstrapped with `create-next-app` and using **Bun** for all JS/TS tooling.

## Overview

BrennerBot implements the **Brenner Loop**—a systematic approach to hypothesis refinement inspired by Sydney Brenner's philosophy of discriminative science. Rather than seeking confirmation, the Brenner method demands that researchers:

1. **Articulate falsification conditions** — What would prove you wrong?
2. **Generate competing alternatives** — What else could explain the data?
3. **Design discriminating tests** — Which experiment distinguishes between hypotheses?
4. **Pre-register predictions** — Lock predictions before seeing evidence

The web app provides a structured research session workflow with AI-assisted critique from a multi-agent "tribunal" system.

## Getting Started

### 1) Configure Agent Mail (optional but recommended)

Copy `apps/web/.env.example` to `apps/web/.env.local` and set:
- `AGENT_MAIL_BASE_URL` (default `http://127.0.0.1:8765`)
- `AGENT_MAIL_PATH` (default `/mcp/`)
- `AGENT_MAIL_BEARER_TOKEN` (if auth is enabled)
- `BRENNER_LAB_MODE=1` (required to enable `/sessions/new` orchestration; fail-closed by default)
- `BRENNER_PUBLIC_BASE_URL` (optional: absolute site URL used for server-side corpus fetch fallbacks)

### 2) Run the development server

```bash
cd apps/web
bun install --save-text-lockfile
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Key routes:
- `/corpus`: browse primary docs in this repo (read server-side from repo root)
- `/sessions/new`: compose a "Brenner Loop kickoff" prompt and send it to agents via Agent Mail

## Lab Mode & Session Orchestration

The `/sessions/new` route is **fail-closed by default** and requires lab mode to be enabled.

### Enabling Lab Mode

Set `BRENNER_LAB_MODE=1` in your environment. Additionally, one of these auth methods must be satisfied:

1. **Cloudflare Access** (production): Set `BRENNER_TRUST_CF_ACCESS_HEADERS=1` and deploy behind Cloudflare Access
2. **Shared Secret** (local dev): Set `BRENNER_LAB_SECRET=your-secret` and provide it via:
   - Header: `x-brenner-lab-secret: your-secret`
   - Cookie: `brenner_lab_secret=your-secret`

### Session Form with Role Assignment

The session kickoff form supports **explicit roster-based role assignment**:

1. Enter recipients as comma-separated Agent Mail names (e.g., `BlueLake, PurpleMountain, RedForest`)
2. The **Role Assignment** section appears automatically
3. Assign roles per recipient using dropdowns:
   - **Hypothesis Generator**: Generates candidates, hunts paradoxes
   - **Test Designer**: Designs discriminative tests with potency controls
   - **Adversarial Critic**: Attacks framing, checks scale, quarantines anomalies
4. Click **"Default 3-Agent"** for automatic role assignment in standard order
5. Toggle **Unified Mode** to send the same prompt to all (no role differentiation)

The form uses the same `composeKickoffMessages()` logic as the CLI, ensuring consistent role-specific prompts.

## Generated Files

The search index is **generated at build time** and must not be edited manually.

### Search Index Generator

**Location:** `scripts/build-search-index.ts`

The generator parses the corpus files (transcript, quote-bank, distillations, metaprompts) and builds a MiniSearch index for client-side full-text search.

**Output files** (in `public/search/`):
- `index.json` — Serialized MiniSearch index (~650KB)
- `stats.json` — Index metadata (entry counts, size)

**Regenerate the index:**
```bash
cd apps/web
bun run scripts/build-search-index.ts
```

**Automatic generation:** The index is rebuilt automatically during `bun run build` via the `prebuild` script.

**Current statistics:**
- 431 indexed entries
- 236 transcript sections, 63 quotes, 117 distillation sections, 15 metaprompt sections

## Quality Gates

```bash
cd apps/web
bun run build
bun run lint
```

---

## The Brenner Loop Architecture

### Session Phases

A research session progresses through 11 phases, managed by a formal state machine with guarded transitions:

| Phase | Symbol | Purpose |
|-------|--------|---------|
| **Intake** | — | Initial hypothesis capture |
| **Sharpening** | ✎ | Refine statement, mechanism, predictions |
| **Level Split** | Σ | Decompose confounded levels of analysis |
| **Exclusion Test** | ⊘ | Generate falsification tests |
| **Object Transpose** | ⟳ | Generate competing alternatives |
| **Scale Check** | ⊙ | Verify effect sizes and practical significance |
| **Agent Dispatch** | ⇆ | Send to multi-agent tribunal for critique |
| **Synthesis** | ⊕ | Integrate agent feedback |
| **Evidence Gathering** | ◉ | Record test outcomes |
| **Revision** | ↺ | Update hypothesis based on evidence |
| **Complete** | ✓ | Session archived |

Phases can be skipped if prerequisites are met (e.g., skip directly to Agent Dispatch after sharpening). Back-navigation is supported for iterative refinement.

### The Hypothesis Card

Every hypothesis is represented as a structured **HypothesisCard** with mandatory discriminative fields:

```typescript
interface HypothesisCard {
  id: string;                    // HC-{session}-{seq}-v{version}
  version: number;               // Immutable versions for evolution tracking
  statement: string;             // The core claim
  mechanism: string;             // Proposed causal pathway
  domain: string[];              // Research domains touched

  // === Discriminative Structure (THE KEY INNOVATION) ===
  predictionsIfTrue: string[];   // What MUST be true if hypothesis is correct
  predictionsIfFalse: string[];  // What would be true if hypothesis is wrong
  impossibleIfTrue: string[];    // REQUIRED: What would definitively falsify this?

  // === Identified Weaknesses ===
  confounds: IdentifiedConfound[];
  assumptions: string[];
  confidence: number;            // 0-100, updated via Bayesian-style updates
}
```

The `impossibleIfTrue` field is **required**—if you can't specify what would prove you wrong, your hypothesis isn't testable yet.

---

## The Four Brenner Operators

The operators implement Sydney Brenner's core analytical moves as structured, step-by-step wizards.

### 1. Level Split (Σ)

**Purpose:** Separate confounded levels of analysis.

Most hypotheses conflate multiple levels—temporal (acute vs chronic), measurement (proxy vs direct), population (individual vs group), mechanism (direct vs indirect). Level Split forces explicit separation.

**Process:**
1. Identify levels for X (cause): temporal, measurement, population, mechanism, implementation, scale
2. Identify levels for Y (effect): same categories
3. Select meaningful combinations
4. Generate focused sub-hypotheses for each combination
5. Choose which level-combination to pursue

**Example:** "Screen time causes depression" splits into:
- Acute passive scrolling → momentary mood drop
- Chronic social media use → clinical depression diagnosis

### 2. Exclusion Test (⊘)

**Purpose:** Design tests that could definitively falsify the hypothesis.

This is the key operator. Brenner's insight: most research designs can only *weaken* a hypothesis, not rule it out. Exclusion tests are designed to provide definitive falsification.

**Test Categories (by discriminative power):**
| Category | Power | Description |
|----------|-------|-------------|
| Natural Experiment | ★★★★★ | Find situations where cause varies naturally |
| Cross-Context | ★★★★★ | Same cause, different context |
| Mechanism Block | ★★★★★ | Interrupt the proposed mechanism |
| Dose-Response | ★★★☆☆ | More cause → more effect? |
| Temporal Sequence | ★★★☆☆ | Cause must precede effect |
| Specificity | ★★☆☆☆ | Does cause affect only predicted outcomes? |
| Coherence | ★★☆☆☆ | Fits established knowledge? |

Each test specifies:
- **Falsification condition**: What observation would rule out the hypothesis
- **Support condition**: What observation would support it
- **Feasibility**: High / Medium / Low with practical notes

### 3. Object Transpose (⟳)

**Purpose:** Systematically generate competing alternative explanations.

Forces explicit consideration of:

| Alternative Type | Description |
|------------------|-------------|
| Reverse Causation | Y causes X, not X causes Y |
| Third Variable | Z causes both X and Y |
| Selection Effects | Sampling distorts the relationship |
| Bidirectional | X and Y cause each other (feedback loop) |
| Coincidence | No causal relationship, just correlation |

For each alternative, the operator generates **discriminating tests**—experiments that would support the original hypothesis if one result occurs, or the alternative if another result occurs.

### 4. Scale Check (⊙)

**Purpose:** Verify effect sizes and distinguish statistical from practical significance.

Many claimed effects vanish at different scales. Scale Check forces researchers to:

1. Specify expected effect size (r, d, OR, RR, or qualitative estimate)
2. Compare against domain benchmarks (what's typical in this field?)
3. Identify threshold effects (minimum effect for practical significance)
4. Consider measurement precision (can you detect the expected effect?)

**Effect Size Types:**
- `r` — Correlation coefficient
- `d` — Cohen's d (standardized mean difference)
- `OR` — Odds ratio
- `RR` — Risk ratio
- `percentage` — Percentage change
- `estimate` — Qualitative (negligible / small / medium / large / very large)

---

## Prediction Lock (Pre-Registration)

The **single most critical feature** for methodological integrity. Without prediction locking, users can always claim post-hoc that they "knew it all along."

### How It Works

1. **Lock Phase (🔒)**: Before evidence collection, predictions are cryptographically sealed
   - SHA-256 hash of (prediction text + timestamp)
   - Original text becomes immutable

2. **Reveal Phase (🔓)**: After evidence, compare prediction to outcome
   - Mark as: Confirmed / Refuted / Inconclusive
   - Record observed outcome

3. **Amendment Tracking (⚠️)**: If users modify interpretations post-hoc
   - Each amendment is logged with type: clarification / reinterpretation / scope change / retraction
   - Amendments reduce the "integrity score" for that prediction
   - Visual warnings displayed in UI

### Lock States

| State | Symbol | Meaning |
|-------|--------|---------|
| Draft | — | Freely editable |
| Locked | 🔒 | Sealed, waiting for evidence |
| Revealed | 🔓 | Evidence collected, compared |
| Amended | ⚠️ | Modified post-evidence (flagged) |

### Integrity Score

Each hypothesis tracks prediction integrity:
```
integrityScore = (1 - amendmentPenalty) × 100
```

High integrity scores indicate predictions were locked before evidence and not modified after.

---

## Hypothesis Arena (Competitive Testing)

Science is about discriminating between competing hypotheses, not just confirming one. The Arena implements head-to-head comparison.

### Core Concepts

- **Arena**: A set of hypotheses competing to explain the same phenomenon
- **Shared Tests**: Tests that apply across multiple hypotheses
- **Elimination**: When a test definitively rules out a hypothesis
- **Bold Predictions**: Specific, risky predictions get higher weight

### Boldness Scoring

Predictions are scored by boldness:

| Boldness | Description | Multiplier |
|----------|-------------|------------|
| Vague | "Things will improve" | 1.0× |
| Specific | "Score increases 5-10%" | 1.5× |
| Precise | "Score will be exactly 7.3" | 2.0× |
| Surprising | "Contrary to consensus, X will occur" | 3.0× |

Bold predictions that are confirmed earn higher scores. Bold predictions that fail cost more. This incentivizes making specific, risky predictions.

### Arena Status

| Status | Meaning |
|--------|---------|
| Active | Still in competition |
| Eliminated | Definitively ruled out by a test |
| Suspended | Temporarily set aside |
| Champion | Won the arena (highest score, competitors eliminated) |

### Comparison Matrix

The Arena generates a comparison matrix showing:
- Each hypothesis's performance on each test
- Score deltas per test
- Which tests discriminate between which hypotheses
- Overall rankings

---

## Hypothesis Evolution & History

Hypotheses evolve through the Brenner Loop. The system tracks full version history with tree-structured lineage.

### Evolution Triggers

| Trigger | Symbol | Cause |
|---------|--------|-------|
| Manual | — | User direct edit |
| Level Split | Σ | Operator generated sub-hypothesis |
| Exclusion Test | ⊘ | Operator refined testability |
| Object Transpose | ⟳ | Operator suggested alternative |
| Scale Check | ⊙ | Operator adjusted scope |
| Evidence | ◉ | Evidence ledger update |
| Agent Feedback | ⇆ | AI agent suggested refinement |

### Version Tracking

Each version links to its parent and children, forming an evolution tree:

```
HC-RS20260104-001-v1 (root)
  ├── HC-RS20260104-001-v2 (manual refinement)
  │     └── HC-RS20260104-001-v3 (agent feedback)
  └── HC-RS20260104-002-v1 (level split alternative)
```

The system supports:
- **Diff viewing**: See exactly what changed between versions
- **Graph visualization**: Interactive lineage graph for complex evolutions
- **Trigger filtering**: Find all versions caused by a specific trigger
- **Common ancestor**: For branched hypotheses, find where they diverged

---

## Multi-Agent Tribunal System

When a hypothesis is dispatched to agents, it faces a tribunal of four specialized AI critics:

### The Four Agents

| Role | Name | Purpose |
|------|------|---------|
| **Devil's Advocate** | Adversarial Critic | Attack the hypothesis mercilessly. Find fatal flaws. |
| **Experiment Designer** | Test Designer | Design discriminating tests. Prioritize by feasibility & power. |
| **Brenner Channeler** | Method Enforcer | Apply Brenner's principles. Check for level conflation. |
| **Synthesis** | Integrator | Reconcile agent feedback. Identify consensus & disagreements. |

### Agent Personas

Each agent has a detailed persona definition including:

- **Core Purpose**: What this agent is fundamentally trying to do
- **Behaviors**: Ordered list of behavioral patterns with examples
- **Tone Calibration**: Assertiveness, constructiveness, Socratic level, formality
- **Model Config**: Temperature, max tokens, preferred model tier
- **Invocation Triggers**: Events that activate this agent
- **Active Phases**: Which session phases this agent participates in
- **Synergies**: Which other agents this one works well with

### Agent Dispatch Flow

1. **Dispatch**: Hypothesis + operator results sent to agents via Agent Mail
2. **Parallel Processing**: All agents work simultaneously
3. **Polling**: System polls for responses
4. **Synthesis**: Synthesis agent integrates feedback
5. **User Review**: User sees consolidated critique with areas of agreement/disagreement

### Phase-Grouped Activation

Agents activate based on simplified phase groups:

| Group | Detail Phases | Primary Agents |
|-------|---------------|----------------|
| Intake | intake | Devil's Advocate, Brenner Channeler |
| Hypothesis | sharpening | All agents |
| Operators | level_split, exclusion_test, object_transpose, scale_check | Experiment Designer, Brenner Channeler |
| Agents | agent_dispatch | All agents |
| Evidence | evidence_gathering | Devil's Advocate, Synthesis |
| Synthesis | synthesis, revision | Synthesis, Brenner Channeler |

---

## Evidence Ledger

Structured recording of experimental outcomes with discriminative power tracking.

### Evidence Entry Structure

```typescript
interface EvidenceEntry {
  id: string;                  // EV-{session}-{sequence}
  hypothesisId: string;        // Which hypothesis this tests
  testType: TestType;          // observational | experimental | simulation | literature
  description: TestDescription;
  result: EvidenceResult;      // supports | challenges | neutral
  discriminativePower: DiscriminativePower; // 1-5
  confidenceDelta: number;     // How much to update confidence
  source?: string;
  methodology?: string;
  timestamp: Date;
}
```

### Discriminative Power Scale

| Power | Label | Meaning |
|-------|-------|---------|
| 1 | Weak | Barely distinguishes hypotheses |
| 2 | Low | Some discrimination |
| 3 | Moderate | Meaningfully discriminates |
| 4 | Strong | Substantially discriminates |
| 5 | Decisive | Could definitively settle the question |

### Confidence Updates

Evidence triggers Bayesian-style confidence updates. The formula considers:
- Evidence result (supports/challenges/neutral)
- Discriminative power
- Prior confidence level
- Domain-specific update rates

---

## Client-Side Storage

Sessions are persisted to browser localStorage with automatic recovery.

### Storage Features

- **Automatic Saving**: Session state saved on every change
- **Cross-Tab Sync**: Changes in one tab propagate to others
- **Recovery**: Corrupted sessions can be partially recovered
- **Quota Management**: Estimates remaining storage, warns when low
- **Cleanup**: Old sessions can be automatically pruned

### Export Formats

Sessions can be exported as:
- **JSON**: Full structured data for import/backup
- **Markdown**: Human-readable summary for documentation

### Storage Interface

```typescript
interface SessionStorage {
  save(session: Session): Promise<void>;
  load(id: string): Promise<Session | null>;
  list(): Promise<SessionSummary[]>;
  delete(id: string): Promise<void>;
  stats(): Promise<StorageStats>;
}
```

---

## Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── corpus/                 # Primary document browser
│   ├── sessions/               # Session management
│   │   ├── new/                # Session kickoff form
│   │   └── [id]/               # Individual session view
│   └── search/                 # Full-text search UI
├── components/
│   ├── brenner-loop/           # Session workflow components
│   │   ├── operators/          # Operator step wizards
│   │   └── ...
│   └── ui/                     # Shared UI components (shadcn/ui)
├── hooks/                      # React hooks
│   └── useOperatorSession.ts   # Operator session state management
└── lib/
    ├── brenner-loop/           # Core Brenner Loop module
    │   ├── hypothesis.ts       # HypothesisCard interface
    │   ├── types.ts            # Session types & phases
    │   ├── session-machine.ts  # State machine
    │   ├── prediction-lock.ts  # Pre-registration
    │   ├── hypothesis-arena.ts # Competitive testing
    │   ├── hypothesis-history.ts # Version tracking
    │   ├── evidence.ts         # Evidence ledger
    │   ├── storage.ts          # Persistence layer
    │   ├── agents/             # Multi-agent tribunal
    │   │   ├── index.ts
    │   │   ├── agent-personas.ts
    │   │   └── dispatch.ts
    │   └── operators/          # Operator implementations
    │       ├── framework.ts    # Shared operator framework
    │       ├── level-split.ts
    │       ├── exclusion-test.ts
    │       ├── object-transpose.ts
    │       └── scale-check.ts
    └── agentMail.ts            # Agent Mail client library
```

---

## Design Principles

### Discriminative Over Confirmatory

Every feature is designed to promote falsification over confirmation. The `impossibleIfTrue` field is required. Predictions must be locked before evidence. Competing hypotheses are explicitly tracked.

### Immutable History

Hypothesis changes create new versions, never mutate. This ensures the intellectual journey is fully traceable and honest evolution can be distinguished from post-hoc rationalization.

### Structured Over Freeform

While narrative is allowed, key elements (predictions, falsification conditions, effect sizes) are structured data. This enables automated analysis, comparison matrices, and integration with the agent tribunal.

### Pre-Registration Native

The prediction lock system treats pre-registration as first-class. Cryptographic hashing provides tamper evidence. Amendments are tracked and penalized in integrity scoring.

### Multi-Agent Critique

No single perspective dominates. Four distinct agents with calibrated tones and behaviors ensure hypotheses face diverse challenges—adversarial attack, practical test design, methodological rigor, and synthesis.
