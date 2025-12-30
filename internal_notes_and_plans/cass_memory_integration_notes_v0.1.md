# cass-memory Integration Notes v0.1

> **Status**: Notes captured
> **Task**: brenner_bot-5so.6.1.1
> **Date**: 2025-12-30
> **Upstream repo**: https://github.com/Dicklesworthstone/cass_memory_system

---

## Why cass-memory is valuable for Brenner Bot

Brenner Bot’s goal is repeatable, auditable multi-agent work (artifacts > chat logs). `cass-memory` (“cm”) is a **procedural memory** layer that can:

- Provide **pre-flight context** before a session/engineering task (relevant rules + anti-patterns + history snippets).
- Reduce repeated mistakes across agents/tools by sharing learned rules.
- Track rule confidence/decay and outcomes over time (so stale guidance fades).

Importantly for this repo: `cm context` is designed to work **without vendor model API calls** (deterministic scoring + cass search). Other `cm` features can optionally use an LLM API, but Brenner Bot should not require that.

---

## Primary CLI commands (practical subset)

### The main command (what Brenner Bot should integrate)

```bash
cm context "<task>" --json
```

Recommended flags for orchestration:

- `--limit N` (cap rules returned)
- `--min-score N` (filter weak matches)
- `--no-history` (smaller + faster; good default for prompts)

### Health / self-documenting API

```bash
cm quickstart --json
cm doctor --json
```

### Writing back (likely manual / operator-driven for Brenner Bot v1)

```bash
cm outcome success b-abc123,b-def456 --summary "What happened"
cm outcome-apply
```

---

## `cm context` output schema (what to parse)

Example shape (abridged; exact fields may expand):

```json
{
  "success": true,
  "task": "fix the auth timeout bug",
  "relevantBullets": [
    {
      "id": "b-8f3a2c",
      "content": "Always check token expiry before other auth debugging",
      "effectiveScore": 8.5,
      "maturity": "proven",
      "relevanceScore": 0.92,
      "reasoning": "Extracted from 5 successful sessions"
    }
  ],
  "antiPatterns": [
    { "id": "b-x7k9p1", "content": "Don't cache auth tokens without expiry validation", "effectiveScore": 3.2 }
  ],
  "historySnippets": [
    {
      "source_path": "~/.claude/sessions/session-001.jsonl",
      "agent": "claude",
      "origin": { "kind": "local" },
      "snippet": "Fixed timeout by increasing token refresh interval...",
      "score": 0.87
    }
  ],
  "suggestedCassQueries": ["cass search 'authentication timeout' --robot --days 30"],
  "degraded": null
}
```

Error shape:

```json
{
  "success": false,
  "code": "PLAYBOOK_NOT_FOUND",
  "error": "Playbook file not found at ~/.cass-memory/playbook.yaml",
  "hint": "Run 'cm init' to create a new playbook",
  "retryable": false
}
```

Integration guidance:

- Treat `success=false` as a **soft failure** (proceed without memory).
- Preserve `hint` for operator-visible troubleshooting.
- Keep stdout parsing strict: `cm` keeps machine JSON on stdout; diagnostics on stderr.

---

## MCP server option (preferred for programmatic integration)

`cass-memory` can run as an MCP server:

```bash
cm serve --port 3001
```

Tools exposed include:

- `cm_context` (fetch context for a task)
- `cm_feedback` (record helpful/harmful)
- `cm_outcome` (record session outcome)

This fits Brenner Bot because we already have MCP clients (Agent Mail). A future “memory provider” abstraction can support:

1) **MCP mode** (talk to `cm serve`)
2) **CLI mode** (spawn `cm context --json`)

---

## Proposed integration fit for Brenner Bot (no vendor AI APIs)

### Boundary / modes

- **CLI**: memory is first-class; local machine has access to `cass` + `cm`.
- **Web (Vercel)**: assume `cm` is **not present**. Memory injection must be:
  - disabled in public mode
  - optional in lab mode, and only if a configured memory endpoint exists (or self-hosted environment)

### Where memory enters the system

1. Operator chooses excerpt + research question.
2. Orchestrator calls `cm context "<task>" --json` (or MCP `cm_context`) with:
   - the research question (and optionally theme/domain)
3. Orchestrator injects memory under a dedicated section in the kickoff prompt, e.g.:
   - `## MEMORY CONTEXT (cass-memory)`
   - `### Relevant rules`
   - `### Known pitfalls`
   - `### Prior related sessions (optional)`

### Where memory is updated

For v1, avoid automatic writes. Prefer operator/human review:

- After a session ends, the operator can mark outcomes (`cm outcome ...`) and apply (`cm outcome-apply`).
- Longer-term: derive candidate rules from “artifact deltas” and present them for approval.

---

## Hygiene & pitfalls (Brenner-aligned)

- **Provenance labeling**: distinguish “memory says” from “transcript says”.
- **Avoid over-conditioning**: default to `--no-history` and small limits; only include snippets when needed.
- **Privacy**: do not surface `cm` outputs to the public site; treat memory as internal operator tooling.
- **No API calls**: do not enable `cm` features that require vendor LLM APIs; use agent-native onboarding/workflows instead.

