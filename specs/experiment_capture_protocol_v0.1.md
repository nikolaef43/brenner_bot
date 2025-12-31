# Experiment Capture Protocol v0.1

Version: v0.1 (2025-12-31)

## Goal
Define a strict, auditable contract for capturing “experiments” (computer-runnable tests/observations) so a Brenner Loop session can:
- run an operator-approved command
- capture stdout/stderr + provenance
- persist a durable result record
- later encode the result into artifact DELTAs (separate spec)

This spec is **capture + provenance**, not interpretation.

## Non-goals (v0)
- Hard sandboxing / isolation
- Automatic execution of agent-proposed code
- Automatic “interpretation” (killing hypotheses, updating confidence, etc.)
- Full lab notebook storage inside the canonical artifact

## Threat model stance (v0)
This protocol does **not** make running code “safe”.

It **does** reduce common failures:
- “I forgot what I ran” → record `argv`, `cwd`, timestamps, and tool versions
- “I can’t reproduce it” → record git provenance when available
- “It hung forever” → enforce a default timeout (overrideable)

It **does not** protect against:
- malicious code deleting files
- secrets exfiltration over the network
- resource exhaustion (RAM/disk) beyond best-effort timeouts

## Vocabulary
- **thread_id**: global join key (Agent Mail thread ↔ session identity ↔ artifact path).
- **test_id**: identifier for the discriminative test this run corresponds to (e.g. `T1`).
- **result_id**: unique ID for the captured run record (UUID).
- **capture_mode**: how the result was produced:
  - `run`: wrapper executed a command
  - `record`: operator recorded from files / prior output

## CLI surface (normative)

### `brenner experiment run`
Runs a command (operator-provided) and writes an `ExperimentResult` JSON file.

```bash
./brenner.ts experiment run \
  --thread-id RS-20251231-example \
  --test-id T1 \
  --timeout 900 \
  -- \
  python -m pytest -q
```

Required:
- `--thread-id <id>`
- `--test-id <id>`
- command after `--` (first token is executable; remaining are argv)

Optional:
- `--timeout <seconds>` (default: 900; must be > 0)
- `--cwd <path>` (default: current working directory)
- `--out-file <path>` (override default output path)
- `--json` (prints structured output summary)

CLI exit code:
- `0` if the wrapper successfully wrote the result JSON file.
- non-zero only for wrapper errors (invalid flags, spawn failure, write failure, etc.).
- The *experiment’s* outcome is recorded in `exit_code` inside the JSON file.

### `brenner experiment record`
Writes an `ExperimentResult` JSON file from existing stdout/stderr.

```bash
./brenner.ts experiment record \
  --thread-id RS-20251231-example \
  --test-id T1 \
  --exit-code 0 \
  --stdout-file ./logs/T1.stdout.txt \
  --stderr-file ./logs/T1.stderr.txt
```

Required:
- `--thread-id <id>`
- `--test-id <id>`
- `--exit-code <n>`

Optional:
- `--stdout-file <path>` and/or `--stderr-file <path>`
- `--stdout <text>` and/or `--stderr <text>` (inline; discouraged for large output)
- `--cwd <path>` (default: current working directory)
- `--command <csv-or-quoted-string>` (best-effort provenance; optional in v0)
- `--out-file <path>` (override default output path)
- `--json` (prints structured output summary)

CLI exit code:
- `0` if the wrapper successfully wrote the result JSON file.
- non-zero only for wrapper errors (invalid flags, read failure, write failure, etc.).

## Default output path (normative)
If `--out-file` is not provided:

```
<project-root>/artifacts/<safe_thread_id>/experiments/<safe_test_id>/<timestamp>_<result_id>.json
```

Where:
- `safe_thread_id` is a filename-safe version of `thread_id` (slashes and unsafe chars replaced)
- `safe_test_id` is a filename-safe version of `test_id`
- `timestamp` is UTC in `YYYYMMDDTHHMMSSZ` format
- `result_id` is a UUID

## `ExperimentResult` schema (normative)

### Top-level
```json
{
  "schema_version": "experiment_result_v0.1",
  "result_id": "uuid",
  "capture_mode": "run",
  "thread_id": "RS-...",
  "test_id": "T1",

  "created_at": "2025-12-31T03:00:00.000Z",
  "cwd": "/abs/path",
  "argv": ["python", "-m", "pytest", "-q"],

  "timeout_seconds": 900,
  "timed_out": false,

  "exit_code": 0,
  "started_at": "2025-12-31T03:00:00.000Z",
  "finished_at": "2025-12-31T03:00:05.123Z",
  "duration_ms": 5123,

  "stdout": "...",
  "stderr": "",

  "git": {
    "sha": "abcdef123...",
    "dirty": false,
    "status_porcelain": []
  },

  "runtime": {
    "platform": "linux",
    "arch": "x64",
    "bun_version": "1.x"
  }
}
```

Rules:
- `stdout`/`stderr` are captured as UTF-8 text (v0 does not implement binary-safe encoding).
- v0 does **not** silently truncate stdout/stderr. If truncation is implemented later, it must be recorded explicitly in the schema.
- `git` is best-effort: if `git` is unavailable or cwd is not a repo, omit `git`.
- `argv` is best-effort for `record` mode: omit or set `null` if unknown.
- For `record` mode, timing fields (`started_at`, `finished_at`, `duration_ms`) and `timeout_seconds` may be `null` when unknown/not-applicable.

## Operator safety guidance (normative)
- Only run commands you would personally run on your machine.
- Treat agent-suggested commands as **untrusted proposals** until reviewed.
- Prefer running in a clean git worktree; if dirty, keep the diff small and record it.
- Avoid commands that can delete or rewrite large swaths of data unless you understand them.
- Keep outputs bounded; if a command can emit gigabytes, redirect to files and use `experiment record`.
