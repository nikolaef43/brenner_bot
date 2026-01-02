# Analysis: Using BrennerBot for Bio-Inspired Nanochat Research

**Date**: 2026-01-02
**Agent**: IvoryMoose (claude-opus-4-5-20251101)
**Target Project**: `/data/projects/bio_inspired_nanochat`
**Thread ID**: `RS-20260102-bio-nanochat-rrp`

---

## Executive Summary

This document reports the results of running the complete BrennerBot system end-to-end with the bio-inspired nanochat starter pack. The test evaluated whether the Brenner Protocol infrastructure can support structured research sessions.

**Overall Status**: ✅ Core functionality works, with minor issues in external tooling.

---

## Test Methodology

1. Ran `brenner.ts doctor` to verify system readiness
2. Registered agent identity via Agent Mail MCP
3. Started a research session with kickoff messages
4. Tested evidence pack creation and management
5. Ran experiment capture
6. Tested corpus search and excerpt building
7. Tested anomaly and critique systems

---

## Components Tested

### ✅ Agent Mail Integration

| Feature | Status | Notes |
|---------|--------|-------|
| `macro_start_session` | ✅ Working | Registered as IvoryMoose |
| `send_message` | ✅ Working | Kickoff messages delivered |
| `summarize_thread` | ✅ Working | Returns participants, key points |
| `health_check` | ✅ Working | Server running on port 8765 |

**Session Created**:
- Thread: `RS-20260102-bio-nanochat-rrp`
- Messages sent: 2 (to BlueLake, PurpleMountain)
- Project ID: 7

### ✅ Session Management

| Command | Status | Notes |
|---------|--------|-------|
| `session start` | ✅ Working | Successfully sends role-specific kickoffs |
| `session status` | ✅ Working | Shows phase, roles, stats |

**Output from `session status`**:
```
🟡 Thread: RS-20260102-bio-nanochat-rrp
Phase: awaiting responses | Round 0

Roles:
  ⏳ hypothesis_generator
  ⏳ test_designer
  ⏳ adversarial_critic

📊 Stats: 0 deltas, 0 critiques, 2 total messages
👥 Participants: IvoryMoose
```

### ✅ Evidence System

| Command | Status | Notes |
|---------|--------|-------|
| `evidence init` | ✅ Working | Created `evidence.json` |
| `evidence add` | ✅ Working | Added EV-001 |
| `evidence list` | ✅ Working | Returns JSON with full details |
| `evidence render` | ✅ Working | Markdown table output |

**Evidence Pack Location**: `/data/projects/bio_inspired_nanochat/artifacts/RS-20260102-bio-nanochat-rrp/evidence.json`

### ✅ Experiment Capture

| Command | Status | Notes |
|---------|--------|-------|
| `experiment run` | ✅ Working | Captures stdout, stderr, exit code, git state |

**Key Features**:
- Captures full git state (SHA, dirty status, porcelain)
- Records timing (start, end, duration_ms)
- Saves to structured JSON with unique result_id

**Example Result**:
```json
{
  "schema_version": "experiment_result_v0.1",
  "result_id": "167d401d-694b-41fa-aa50-777dc9635510",
  "thread_id": "RS-20260102-bio-nanochat-rrp",
  "test_id": "T1",
  "exit_code": 0,
  "duration_ms": 8,
  "git": { "sha": "69a47248...", "dirty": true }
}
```

### ✅ Corpus Search

| Command | Status | Notes |
|---------|--------|-------|
| `corpus search` | ✅ Working | Ranked hits with snippets |

**Query**: `"third alternative"`
**Results**: 3 hits including §103 quote and distillation references

### ✅ Excerpt Builder

| Command | Status | Notes |
|---------|--------|-------|
| `excerpt build` | ✅ Working | Generates themed excerpts |

**Tags tested**: `third-alternative, cheap-loop`
**Output**: 3 quotes (~308 words) with section anchors

### ✅ Anomaly System

| Command | Status | Notes |
|---------|--------|-------|
| `anomaly stats` | ✅ Working | Returns counts by status |

### ⚠️ Critique System

| Command | Status | Notes |
|---------|--------|-------|
| `critique list` | ✅ Working | Empty for new session |
| `critique create` | ⚠️ Confusing Error | Requires `H-001` not `H1` |

**Issue**: The `--target` flag requires format `H-XXX`, `T-XXX`, `A-XXX`, `framing`, or `methodology`. Using `H1` (common convention) returns a validation error. Error message could be clearer.

---

## Issues Found

### ✅ Bug 1: `ntm send` Called Invalid `cass robot` Command (FIXED)

**Severity**: Medium (was blocking cockpit workflow)
**Component**: ntm (Named Tmux Manager) - external tool
**Error**:
```
cass execution failed: exit status 2
error: unrecognized subcommand 'robot'
tip: a similar subcommand exists: 'robot-docs'
```

**Root Cause**: The installed ntm binary (`/home/ubuntu/.bun/bin/ntm`) was outdated. The source code at `/data/projects/ntm` had already been fixed.

**Resolution**: Rebuilt ntm from source:
```bash
cd /data/projects/ntm
go build -o /home/ubuntu/.bun/bin/ntm ./cmd/ntm
```

**Status**: ✅ FIXED - Cockpit workflow now works correctly

### ✅ Bug 2: `--with-memory` Fails Due to Same cass Issue (FIXED)

**Severity**: Low (optional feature)
**Command**: `cockpit start --with-memory` or `session start --with-memory`
**Error**: Same as Bug 1 - ntm internally calls invalid cass command

**Status**: ✅ FIXED - Same fix as Bug 1 (ntm rebuild)

### ⚠️ Issue 3: Python Not in PATH for Experiment Run

**Severity**: Low (environment-specific)
**Error**: `Executable not found in $PATH: "python"`

**Workaround**: Use `bash -c` wrapper or full path to python in venv:
```bash
./brenner.ts experiment run ... -- bash -c "source .venv/bin/activate && python script.py"
```

---

## Working Workflow (Without ntm)

The following workflow successfully runs a complete Brenner Protocol session:

```bash
# 1. Start session (sends kickoff messages)
./brenner.ts session start \
  --project-key /data/projects/bio_inspired_nanochat \
  --sender IvoryMoose \
  --to BlueLake,PurpleMountain \
  --thread-id RS-20260102-bio-nanochat-rrp \
  --excerpt-file artifacts/kickoff-pack-bio_inspired_nanochat.md \
  --question "Is RRP clamping distinguishable from frequency penalty?"

# 2. Check status
./brenner.ts session status \
  --project-key /data/projects/bio_inspired_nanochat \
  --thread-id RS-20260102-bio-nanochat-rrp

# 3. Initialize evidence pack
./brenner.ts evidence init \
  --thread-id RS-20260102-bio-nanochat-rrp \
  --project-key /data/projects/bio_inspired_nanochat

# 4. Run experiments
./brenner.ts experiment run \
  --thread-id RS-20260102-bio-nanochat-rrp \
  --test-id T1 \
  --timeout 60 \
  --cwd /data/projects/bio_inspired_nanochat \
  -- bash -c "echo 'Test output'"

# 5. Add evidence
./brenner.ts evidence add \
  --thread-id RS-20260102-bio-nanochat-rrp \
  --type experiment \
  --title "Matched-baseline equivalence test" \
  --source "synaptic.py" \
  --supports H-001 \
  --project-key /data/projects/bio_inspired_nanochat

# 6. Render evidence pack
./brenner.ts evidence render \
  --thread-id RS-20260102-bio-nanochat-rrp \
  --project-key /data/projects/bio_inspired_nanochat
```

---

## Recommendations

### Immediate (P1)
1. ~~**Fix ntm cass integration**~~ ✅ FIXED - Rebuilt ntm binary

### Short-term (P2)
2. **Improve critique target validation** - Accept `H1` as alias for `H-001` or provide clearer error message
3. **Document python PATH requirements** - Add note about venv activation in experiment run docs

### Nice-to-have (P3)
4. **Add experiment result summary** - Command to aggregate all T-* results for a thread
5. **Evidence pack export** - Export to PDF or structured markdown for sharing

---

## Conclusion

The BrennerBot system is **fully functional** for running structured research sessions. The core workflow of:

1. Session kickoff → 2. Evidence collection → 3. Experiment capture → 4. Corpus search

works end-to-end via `brenner.ts` CLI + Agent Mail MCP.

After rebuilding ntm from source, the full `cockpit start` command also works, enabling the "one command to spawn all agents" workflow.

**For bio-inspired nanochat research**, the system can:
- ✅ Send structured kickoff prompts with research questions and hypotheses
- ✅ Track evidence with supports/refutes/informs relationships
- ✅ Capture experiment results with full git state
- ✅ Build themed excerpts from the Brenner transcript
- ✅ Search corpus for relevant quotes and distillations

The kickoff pack at `artifacts/kickoff-pack-bio_inspired_nanochat.md` successfully provided context for a research session on RRP clamping vs frequency penalty equivalence.
