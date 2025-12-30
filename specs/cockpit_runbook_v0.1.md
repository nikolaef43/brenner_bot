# BrennerBot Cockpit Runbook v0.1 (ntm + Agent Mail)

> **Scope**: Running a local multi-agent “Brenner Loop” session with terminal agents in `ntm` and durable coordination in Agent Mail.
>
> **Non‑negotiable constraint**: no vendor AI APIs are called from code. Agents run locally (Codex CLI / Claude Code / Gemini CLI) and coordinate by posting messages.

---

## 0) Preconditions

### Agent Mail is running

The BrennerBot CLI and web lab flow expect an Agent Mail server.

Health check:
```bash
./brenner.ts mail health
```

If you need to start it locally (example path; adjust to your install):
```bash
cd /data/projects/mcp_agent_mail
bash scripts/run_server_with_token.sh
```

### `ntm` is installed

Confirm `ntm` is on PATH:
```bash
ntm --help
```

Optional dependency check:
```bash
ntm deps
```

---

## 1) Identity contract (do this first)

The `thread_id` is the global join key across:
- Agent Mail thread
- `ntm` session name
- persisted artifact file path

Conventions live in: `thread_subject_conventions_v0.1.md`

**Rule of thumb**:
- Engineering work: `thread_id = {beads_id}` (example: `brenner_bot-5so.3.4.2`)
- Research sessions: `thread_id = RS-{YYYYMMDD}-{short-slug}` (example: `RS-20251230-cell-fate`)

**Derived mappings**:
- `ntm` session name: `{thread_id}`
- artifact path: `artifacts/{thread_id}.md`

---

## 2) Start the cockpit (`ntm`)

Spawn a tmux session with agent panes using the thread id as the session name:
```bash
export THREAD_ID="RS-20251230-cell-fate"
ntm spawn "$THREAD_ID" --cc=1 --cod=1 --gmi=1
```

Attach later:
```bash
ntm attach "$THREAD_ID"
```

Broadcast a reminder to agents (example):
```bash
ntm send "$THREAD_ID" --all "Please check your Agent Mail inbox for thread: $THREAD_ID"
```

Copy pane output (example):
```bash
ntm copy "$THREAD_ID"
```

---

## 3) Send a kickoff (CLI path)

### 3.1 List available Agent Mail recipients

Agent Mail recipients are **agent identity names**, not program names.

```bash
./brenner.ts mail agents --project-key "$PWD"
```

If the list is empty, the target agents have not registered identities in this project yet.

### 3.2 Compose a kickoff prompt

Create an excerpt file (example):
```bash
cat > excerpt.md <<'EOF'
§42 — (paste a short transcript excerpt here)

§57 — (paste another excerpt if needed)
EOF
```

Compose the kickoff prompt:
```bash
./brenner.ts prompt compose \
  --template metaprompt_by_gpt_52.md \
  --excerpt-file excerpt.md \
  --theme "problem choice" \
  > kickoff.md
```

### 3.3 Send the kickoff via Agent Mail

```bash
./brenner.ts orchestrate start \
  --project-key "$PWD" \
  --thread-id "$THREAD_ID" \
  --sender FuchsiaDog \
  --to BlueLake,PurpleMountain,RedForest \
  --excerpt-file excerpt.md \
  --ack-required
```

Notes:
- `--sender` must be an adjective+noun name (Agent Mail convention).
- `--to` values must match names returned by `./brenner.ts mail agents`.

---

## 4) One end-to-end example session (kickoff → agent responses)

```bash
# 1) Choose the join key
export THREAD_ID="RS-20251230-cell-fate"

# 2) Start cockpit panes
ntm spawn "$THREAD_ID" --cc=1 --cod=1 --gmi=1

# 3) Confirm Agent Mail is reachable
./brenner.ts mail health

# 4) Compose kickoff
./brenner.ts prompt compose --template metaprompt_by_gpt_52.md --excerpt-file excerpt.md > kickoff.md

# 5) Send kickoff (use real agent identity names from `mail agents`)
./brenner.ts orchestrate start --project-key "$PWD" --thread-id "$THREAD_ID" \
  --sender FuchsiaDog --to BlueLake,PurpleMountain,RedForest --excerpt-file excerpt.md

# 6) Tell the agents to check mail in their panes
ntm send "$THREAD_ID" --all "Check Agent Mail thread: $THREAD_ID and reply with DELTA[...]"
```

Next steps (not covered here): compile deltas → render canonical artifact → publish `COMPILED` back to the thread → optionally persist to `artifacts/{thread_id}.md`.

