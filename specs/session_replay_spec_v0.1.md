# Session Replay Spec v0.1

> **Status**: Implemented (schema + tests)
> **Bead**: brenner_bot-4u0u
> **Author**: CyanMarsh (claude-code/opus-4.5)
> **Date**: 2026-01-01

## Overview

This specification defines the infrastructure for recording and replaying Brenner Loop sessions to enable:
1. **Deterministic reproducibility** - Can someone else replicate this research?
2. **Debugging divergence** - Why did two agents produce different outputs?
3. **Agent evaluation** - How do different models compare on the same session?
4. **Training and onboarding** - New agents can shadow historical sessions

## Core Types

### SessionRecord

The complete record of a session, including:
- **Inputs** (deterministic): kickoff, evidence, agent roster, protocol versions
- **Trace**: execution rounds with message hashes
- **Outputs**: final artifact hash, lint results, counts

```typescript
interface SessionRecord {
  id: string;               // REC-{session}-{timestamp}
  session_id: string;       // Thread ID
  created_at: string;       // ISO 8601
  inputs: SessionInputs;
  trace: SessionTrace;
  outputs: SessionOutputs;
  schema_version: string;
}
```

### SessionInputs

Deterministic inputs that define what the session starts with:

```typescript
interface SessionInputs {
  kickoff: {
    thread_id: string;
    question?: string;
    excerpt?: string;
    theme?: string;
    domain?: string;
    operator_selection?: OperatorSelection;
    kickoff_body_md?: string;
  };
  external_evidence: EvidenceRecordSummary[];
  agent_roster: AgentRosterEntry[];
  protocol_versions: {
    role_prompts?: string;
    delta_format: string;    // default: "v0.1"
    artifact_schema: string; // default: "v0.1"
    evaluation_rubric?: string;
    evidence_pack?: string;
  };
}
```

### SessionTrace

The execution trace capturing what happened:

```typescript
interface SessionTrace {
  rounds: TraceRound[];
  interventions: OperatorIntervention[];
  intervention_summary?: InterventionSummary;
  total_duration_ms: number;
  started_at: string;
  ended_at?: string;
}

interface TraceRound {
  round_number: number;
  started_at: string;
  ended_at?: string;
  messages: TraceMessage[];
  compiled_artifact_hash?: string;
  duration_ms?: number;
}

interface TraceMessage {
  message_id?: number;
  timestamp: string;
  from: string;
  type: MessageType;  // KICKOFF|DELTA|CRITIQUE|ACK|EVIDENCE|RESULT|ADMIN|COMPILE|PUBLISH
  content_hash: string;
  content_length: number;
  subject?: string;
  acknowledged?: boolean;
}
```

### SessionOutputs

Summary of what the session produced:

```typescript
interface SessionOutputs {
  final_artifact_hash: string;
  lint_result: {
    errors: number;
    warnings: number;
    valid: boolean;
    error_messages: string[];
    warning_messages: string[];
  };
  hypothesis_count: number;
  test_count: number;
  assumption_count?: number;
  anomaly_count?: number;
  critique_count?: number;
  scorecard_grade?: string;
  scorecard_points?: number;
}
```

## Replay Modes

### Verification Replay
Re-run with same agents/models to verify outputs match.
- Input: SessionRecord
- Output: ReplayReport with matches boolean and divergences

### Comparison Replay
Re-run with different agents to compare reasoning.
- Input: SessionRecord + new agent roster
- Output: ComparisonReport showing delta differences

### Trace Replay
Step through recorded messages without re-running agents.
- Input: SessionRecord
- Output: Interactive viewer (web UI)

## Replay Report

```typescript
interface ReplayReport {
  original_session_id: string;
  mode: "verification" | "comparison" | "trace";
  replayed_at: string;
  roster: AgentRosterEntry[];
  matches: boolean;
  similarity_percentage: number;  // 0-100
  rounds_completed: number;
  rounds_expected: number;
  messages_matched: number;
  messages_expected: number;
  artifact_similarity: number;
  divergences: Divergence[];
  conclusion: string;
}

interface Divergence {
  round_number: number;
  message_index: number;
  agent: string;
  severity: "none" | "minor" | "moderate" | "major";
  original_summary: string;
  replayed_summary: string;
  semantic_match: boolean;
  explanation?: string;
}
```

## Determinism Challenges

LLMs are inherently non-deterministic. Replay cannot guarantee identical outputs, but we can:

1. **Content hashing**: Use SHA256 to verify exact matches
2. **Semantic comparison**: Compare outputs semantically, not byte-for-byte
3. **Bound divergence**: Define acceptable divergence thresholds
4. **Temperature recording**: Capture inference parameters when available

## CLI Surface (Future)

```bash
# Export session record
brenner session record <threadId> --output record.json

# Replay in verification mode
brenner session replay record.json --mode verify

# Replay with different agents
brenner session replay record.json --mode compare --roster new_roster.json

# Trace replay (view only)
brenner session replay record.json --mode trace
```

## Implementation Files

- `apps/web/src/lib/schemas/session-replay.ts` - Core schema definitions
- `apps/web/src/lib/schemas/session-replay.test.ts` - 36 unit tests

## Dependencies

- `operator-intervention.ts` - For tracking interventions in traces
- `artifact-merge.ts` - For artifact hashing and comparison

## Future Work

- Storage layer for session records
- CLI commands for record/replay
- Web UI for trace viewing
- Semantic comparison utilities

## Background: Why Reproducibility Matters

The replication crisis in science shows that many published results cannot be reproduced. Multi-agent AI research faces similar risks:
- Different models produce different results
- Prompts evolve without version control
- Operator interventions are invisible

Session replay addresses this by treating sessions as experiments with recorded inputs and outputs, enabling verification and comparison.
