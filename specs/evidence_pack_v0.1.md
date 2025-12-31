# Evidence Pack Format v0.1

> **Status**: Draft specification
> **Purpose**: Define file layout, anchor scheme, and storage conventions for topic evidence packs
> **Implements**: `brenner_bot-aly1` (External Evidence Import Protocol)
> **Parent**: `brenner_bot-5so.13.1`

---

## Overview

An **evidence pack** is a session-scoped collection of external evidence records (papers, datasets, experiment results, prior sessions, etc.) with stable IDs and internal anchors. Evidence packs enable Brenner Loop sessions to cite external sources auditably, avoiding model-memory hallucination.

### Design Principles (v0)

1. **Excerpt-first**: Store only the snippets/notes actually used, not full documents
2. **Anchored**: Every evidence record has a stable ID; excerpts have internal anchors
3. **Local-first**: Evidence packs are for local/lab workflows; never ship copyrighted content to prod
4. **Session-scoped**: Each evidence pack belongs to exactly one session (thread)

---

## File Layout

### Storage Path Convention

Evidence packs live alongside session artifacts, scoped by thread ID:

```
artifacts/
└── <thread_id>/
    ├── artifact.md           # The compiled artifact
    ├── evidence.json         # Evidence pack (structured data)
    └── evidence.md           # Evidence pack (human-readable rendering)
```

**Examples**:
```
artifacts/RS-20251230-cell-fate/evidence.json
artifacts/brenner_bot-5so.10.2.2/evidence.json
```

### Why This Location?

- **Co-located with artifacts**: Evidence and artifact stay together
- **Thread-scoped**: Join-key contract preserved (thread_id == folder name)
- **Git-friendly**: Small JSON files commit cleanly; excerpts keep packs reasonable size

### What Gets Committed?

| Content | Committed? | Rationale |
|---------|------------|-----------|
| evidence.json (metadata + excerpts) | Yes | Small, essential for reproducibility |
| evidence.md (rendered view) | Yes | Human-readable audit trail |
| Full PDFs / datasets | **No** | Copyright risk, size bloat |
| External URLs/DOIs | Yes (in metadata) | Provenance without storage |

---

## Evidence Record Schema

### Core Structure

```typescript
interface EvidencePack {
  /** Schema version */
  version: "0.1";

  /** Thread ID this pack belongs to */
  thread_id: string;

  /** When this pack was created */
  created_at: string;  // ISO 8601

  /** When this pack was last modified */
  updated_at: string;  // ISO 8601

  /** Counter for generating unique IDs */
  next_id: number;

  /** The evidence records */
  records: EvidenceRecord[];
}

interface EvidenceRecord {
  /** Stable ID: EV-001, EV-002, etc. */
  id: string;

  /** Evidence type */
  type: EvidenceType;

  /** Human-readable title */
  title: string;

  /** Authors (if applicable) */
  authors?: string[];

  /** Publication/creation date */
  date?: string;

  /** Provenance: URL, DOI, file path, or session ID */
  source: string;

  /** How to access the source */
  access_method: "url" | "doi" | "file" | "session" | "manual";

  /** When this evidence was imported */
  imported_at: string;  // ISO 8601

  /** Who imported it (agent name or "operator") */
  imported_by: string;

  /** Why this evidence matters to this session */
  relevance: string;

  /** Key findings from this source (bulleted) */
  key_findings: string[];

  /** Artifact items this evidence supports (e.g., ["H1", "T3"]) */
  supports?: string[];

  /** Artifact items this evidence refutes */
  refutes?: string[];

  /** Artifact items this evidence informs (neutral relevance) */
  informs?: string[];

  /** Has this evidence been verified? */
  verified: boolean;

  /** Verification notes */
  verification_notes?: string;

  /** Excerpts from this source */
  excerpts: EvidenceExcerpt[];
}

interface EvidenceExcerpt {
  /** Anchor ID within the record: E1, E2, etc. */
  anchor: string;

  /** The excerpt text (verbatim or paraphrased) */
  text: string;

  /** Is this verbatim or paraphrased? */
  verbatim: boolean;

  /** Page/section/timestamp reference in original */
  location?: string;

  /** Brief note on what this excerpt demonstrates */
  note?: string;
}

type EvidenceType =
  | "paper"           // Published research paper
  | "preprint"        // Unpublished manuscript
  | "dataset"         // Structured data (benchmark, corpus, etc.)
  | "experiment"      // Results from an experiment
  | "observation"     // Empirical observation
  | "prior_session"   // Results from another Brenner Loop session
  | "expert_opinion"  // Human expert statement
  | "code_artifact";  // Existing code/implementation as evidence
```

---

## Anchor Scheme

### ID Format

Evidence IDs follow the pattern:
```
EV-{NNN}           # Evidence record ID (e.g., EV-001, EV-042)
EV-{NNN}#E{N}      # Excerpt anchor within a record (e.g., EV-001#E1)
```

### ID Rules

1. **Monotonic**: IDs are assigned in order starting from 001
2. **Stable**: Once assigned, an ID refers to that record/excerpt forever
3. **Zero-padded**: Three digits for records (EV-001), single digit+ for excerpts (E1, E12)
4. **Session-scoped**: IDs are unique within a session, not globally

### Examples

| Reference | Meaning |
|-----------|---------|
| `EV-001` | Evidence record 001 (the whole source) |
| `EV-001#E1` | First excerpt from evidence record 001 |
| `EV-003#E2` | Second excerpt from evidence record 003 |

### Using Evidence Anchors in Artifacts

Evidence can be cited anywhere `§n` transcript anchors can be used:

```markdown
**Anchors**: §58, EV-001#E1 [inference]
```

```markdown
**Claim**: RRP depletion follows exponential decay (EV-001#E1, EV-002).
```

```markdown
| P1 | RRP decay rate | ~500ms (EV-001#E2) | ~200ms | indeterminate |
```

---

## Evidence Pack Lifecycle

### 1. Initialization

Create an evidence pack when starting a session that needs external evidence:

```bash
brenner evidence init --thread-id RS-20251230-bio-rrp
```

This creates:
```json
{
  "version": "0.1",
  "thread_id": "RS-20251230-bio-rrp",
  "created_at": "2025-12-30T19:00:00Z",
  "updated_at": "2025-12-30T19:00:00Z",
  "next_id": 1,
  "records": []
}
```

### 2. Adding Evidence Records

Add a paper:
```bash
brenner evidence add \
  --thread-id RS-20251230-bio-rrp \
  --type paper \
  --title "Synaptic vesicle depletion dynamics" \
  --source "doi:10.1234/example" \
  --relevance "Provides timescale data for H1" \
  --supports H1
```

Result: New record with ID `EV-001`.

### 3. Adding Excerpts

Add an excerpt to an existing record:
```bash
brenner evidence add-excerpt \
  --thread-id RS-20251230-bio-rrp \
  --evidence-id EV-001 \
  --text "Recovery time constant was measured at 487 ± 32 ms" \
  --verbatim true \
  --location "p. 4, Results section"
```

Result: New excerpt with anchor `EV-001#E1`.

### 4. Rendering

Generate human-readable markdown:
```bash
brenner evidence render --thread-id RS-20251230-bio-rrp
```

Output: `artifacts/<thread_id>/evidence.md`

---

## Full Example

### evidence.json

```json
{
  "version": "0.1",
  "thread_id": "RS-20251230-bio-rrp",
  "created_at": "2025-12-30T19:00:00Z",
  "updated_at": "2025-12-30T20:30:00Z",
  "next_id": 4,
  "records": [
    {
      "id": "EV-001",
      "type": "paper",
      "title": "Synaptic vesicle depletion dynamics in cortical neurons",
      "authors": ["Smith, J.", "Jones, A."],
      "date": "2024-03-15",
      "source": "doi:10.1234/neuro.2024.001",
      "access_method": "doi",
      "imported_at": "2025-12-30T19:05:00Z",
      "imported_by": "operator",
      "relevance": "Provides empirical timescales for vesicle depletion that inform H1",
      "key_findings": [
        "RRP depletion follows exponential decay with τ ≈ 500ms",
        "Recovery is activity-dependent, not fixed-rate"
      ],
      "supports": ["H1"],
      "verified": true,
      "verification_notes": "Peer-reviewed in Nature Neuroscience",
      "excerpts": [
        {
          "anchor": "E1",
          "text": "The readily releasable pool (RRP) showed exponential depletion with a time constant of 487 ± 32 ms under sustained stimulation.",
          "verbatim": true,
          "location": "p. 4, Results"
        },
        {
          "anchor": "E2",
          "text": "Recovery was not fixed-rate but depended on recent activity history, suggesting adaptive replenishment mechanisms.",
          "verbatim": false,
          "location": "p. 6, Discussion",
          "note": "Paraphrased; supports activity-dependent recovery in H1"
        }
      ]
    },
    {
      "id": "EV-002",
      "type": "dataset",
      "title": "Synthetic repetition detection benchmark v2",
      "source": "file://benchmarks/synth_rep_v2.json",
      "access_method": "file",
      "imported_at": "2025-12-30T19:15:00Z",
      "imported_by": "BlueLake",
      "relevance": "Provides standardized test stimuli for T5 potency check",
      "key_findings": [
        "1000 stimulus pairs with known repetition intervals",
        "Ground truth labels for precision/recall calculation"
      ],
      "informs": ["T5"],
      "verified": true,
      "verification_notes": "Generated by team; checksums verified",
      "excerpts": []
    },
    {
      "id": "EV-003",
      "type": "prior_session",
      "title": "Initial bio_inspired_nanochat hypothesis exploration",
      "source": "session://RS-20251228-initial",
      "access_method": "session",
      "imported_at": "2025-12-30T19:20:00Z",
      "imported_by": "GreenForest",
      "relevance": "H2 was killed in prior session; avoid re-investigating",
      "key_findings": [
        "H2 (fixed-rate recovery) was killed after T3 showed adaptive behavior"
      ],
      "refutes": ["H2"],
      "verified": true,
      "verification_notes": "Prior session artifact exists and was reviewed",
      "excerpts": [
        {
          "anchor": "E1",
          "text": "T3 demonstrated that recovery rate varied by 3x depending on prior activation frequency, contradicting the fixed-rate assumption of H2.",
          "verbatim": false,
          "location": "Discriminative Tests, T3 results"
        }
      ]
    }
  ]
}
```

### evidence.md (rendered)

```markdown
# Evidence Pack: RS-20251230-bio-rrp

> Created: 2025-12-30T19:00:00Z
> Updated: 2025-12-30T20:30:00Z
> Records: 3

---

## EV-001: Synaptic vesicle depletion dynamics in cortical neurons

| Field | Value |
|-------|-------|
| Type | paper |
| Authors | Smith, J.; Jones, A. |
| Date | 2024-03-15 |
| Source | doi:10.1234/neuro.2024.001 |
| Verified | Yes (Peer-reviewed in Nature Neuroscience) |
| Supports | H1 |

**Relevance**: Provides empirical timescales for vesicle depletion that inform H1

**Key Findings**:
- RRP depletion follows exponential decay with τ ≈ 500ms
- Recovery is activity-dependent, not fixed-rate

### Excerpts

**EV-001#E1** (verbatim, p. 4, Results):
> The readily releasable pool (RRP) showed exponential depletion with a time constant of 487 ± 32 ms under sustained stimulation.

**EV-001#E2** (paraphrased, p. 6, Discussion):
> Recovery was not fixed-rate but depended on recent activity history, suggesting adaptive replenishment mechanisms.
>
> *Note: Paraphrased; supports activity-dependent recovery in H1*

---

## EV-002: Synthetic repetition detection benchmark v2

| Field | Value |
|-------|-------|
| Type | dataset |
| Source | file://benchmarks/synth_rep_v2.json |
| Verified | Yes (Generated by team; checksums verified) |
| Informs | T5 |

**Relevance**: Provides standardized test stimuli for T5 potency check

**Key Findings**:
- 1000 stimulus pairs with known repetition intervals
- Ground truth labels for precision/recall calculation

---

## EV-003: Initial bio_inspired_nanochat hypothesis exploration

| Field | Value |
|-------|-------|
| Type | prior_session |
| Source | session://RS-20251228-initial |
| Verified | Yes (Prior session artifact exists and was reviewed) |
| Refutes | H2 |

**Relevance**: H2 was killed in prior session; avoid re-investigating

**Key Findings**:
- H2 (fixed-rate recovery) was killed after T3 showed adaptive behavior

### Excerpts

**EV-003#E1** (paraphrased, Discriminative Tests, T3 results):
> T3 demonstrated that recovery rate varied by 3x depending on prior activation frequency, contradicting the fixed-rate assumption of H2.
```

---

## Anti-Confabulation Rule

**Critical**: Claims in artifacts must cite either:
1. Brenner transcript anchors (`§n`)
2. Evidence pack anchors (`EV-NNN` or `EV-NNN#EN`)
3. Be explicitly labeled `[inference]`

Uncited claims are considered potential confabulation and should be flagged by the linter.

---

## Content Policy (Public/Private)

### What Can Be Committed

| Content | Safe to Commit? | Notes |
|---------|----------------|-------|
| Evidence metadata (titles, DOIs, sources) | Yes | Provenance only |
| Short excerpts (<500 words) with attribution | Generally yes | Fair use / transformative |
| Full papers/documents | **No** | Copyright violation |
| Proprietary datasets | **No** | License restrictions |
| URLs to public resources | Yes | Links, not content |
| Summaries/paraphrases | Yes | Original synthesis |

### Lab Mode Only

Evidence packs are **never** exposed in the public web app:
- Lab mode (gated): Can view and manage evidence packs
- Public mode: Evidence packs not accessible

This prevents accidental publication of copyrighted excerpts.

---

## Validation Rules

### Errors (must fix)

- [ ] Evidence pack has valid `version` field
- [ ] All record IDs follow `EV-NNN` format
- [ ] All excerpt anchors follow `EN` format
- [ ] No duplicate record IDs
- [ ] No duplicate excerpt anchors within a record
- [ ] Required fields present (id, type, title, source, relevance)

### Warnings (should fix)

- [ ] Unverified evidence referenced in artifact
- [ ] Evidence record has no excerpts (consider adding key quotes)
- [ ] Excerpt marked verbatim but >500 words (copyright concern)

---

## Integration Points

### With Artifacts

The artifact schema already supports evidence anchors (as of spec update):
```markdown
**Anchors**: §58, EV-001#E1 [inference]
```

### With Deltas

Deltas can include `evidence_refs`:
```json
{
  "operation": "EDIT",
  "section": "hypothesis_slate",
  "target_id": "H1",
  "payload": { "status": "strengthened" },
  "evidence_refs": ["EV-001", "EV-001#E2"],
  "rationale": "Timescale data from EV-001 matches H1 predictions"
}
```

### With CLI

```bash
brenner evidence init --thread-id <id>
brenner evidence add --thread-id <id> --type <type> --title "..." --source "..."
brenner evidence add-excerpt --thread-id <id> --evidence-id EV-001 --text "..."
brenner evidence list --thread-id <id> [--json]
brenner evidence render --thread-id <id>
brenner evidence verify --thread-id <id> --evidence-id EV-001 --notes "..."
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-31 | Initial draft |
