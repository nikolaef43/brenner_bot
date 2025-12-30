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

### Agent Mail connection env vars (optional)

BrennerBot defaults to a local Agent Mail server at `http://127.0.0.1:8765/mcp/`.
Override via:

- `AGENT_MAIL_BASE_URL` (default `http://127.0.0.1:8765`)
- `AGENT_MAIL_PATH` (default `/mcp/`)
- `AGENT_MAIL_BEARER_TOKEN` (optional; required if Agent Mail auth is enabled)

### `ntm` is installed

Confirm `ntm` is on PATH:
```bash
ntm --help
```

Optional dependency check:
```bash
ntm deps
```

### Terminal agent CLIs are installed and logged in

The cockpit assumes you can run each agent locally (subscriptions, not vendor APIs):

- Codex CLI (GPT‑5.2)
- Claude Code (Opus 4.5)
- Gemini CLI (Gemini 3)

If `ntm deps` fails, fix that first (it will tell you which CLI is missing).

### Corpus files are present (local dev)

In this repo, primary corpus sources live at the repo root (example: `complete_brenner_transcript.md`).
The web app build copies them into `apps/web/public/corpus/` via:

```bash
cd apps/web
bun run scripts/copy-corpus.ts
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
- By default, `./brenner.ts session start` sends **role-specific prompts** to each recipient (see next section). Use `--unified` if you want everyone to receive the same kickoff prompt.

### 3.4 Roles + response contract (what agents must send back)

The default 3‑agent Brenner Loop assigns roles as:

| Recipient | Role | Subject prefix | Spec |
|---|---|---|---|
| Codex / GPT | Hypothesis Generator | `DELTA[gpt]: ...` | `specs/role_prompts_v0.1.md` |
| Claude / Opus | Test Designer | `DELTA[opus]: ...` | `specs/role_prompts_v0.1.md` |
| Gemini | Adversarial Critic | `DELTA[gemini]: ...` | `specs/role_prompts_v0.1.md` |

**All agent contributions must be mergeable**, not essays:
- Message bodies contain one or more fenced JSON blocks in the ` ```delta ` format.
- Deltas follow: `specs/delta_output_format_v0.1.md` and `specs/artifact_delta_spec_v0.1.md`.

Minimal agent reply skeleton (what you want agents to send):

~~~markdown
Subject: DELTA[gpt]: Added H3 third alternative + predictions
Thread:  RS-20251230-cell-fate

## Deltas

```delta
{ "operation": "ADD", "section": "hypothesis_slate", "target_id": null, "payload": { ... }, "rationale": "..." }
```
~~~

### 3.5 Collection (get deltas into the Agent Mail thread)

As the operator, you’re doing two things:
1) keep agents unblocked (make sure they saw the kickoff + have the thread id)
2) collect their `DELTA[...]` messages inside the thread

Useful CLI commands:

```bash
# View your inbox (add --threads to group by thread)
./brenner.ts mail inbox --project-key "$PWD" --agent FuchsiaDog --threads

# Read a specific thread (include examples / guidance for agents)
./brenner.ts mail thread --project-key "$PWD" --thread-id "$THREAD_ID" --include-examples
```

Common nudge (send to all `ntm` panes):
```bash
ntm send "$THREAD_ID" --all "Check Agent Mail thread: $THREAD_ID and reply with DELTA[...] blocks (see specs/delta_output_format_v0.1.md)"
```

### 3.6 Compile + publish (v0 manual workflow)

**Current state**: the artifact compiler is specified, but the operator-facing `session compile`/`session publish` CLI commands are not implemented yet.
Until they exist, compilation is an explicit human step.

**Goal**: turn a thread’s deltas into a single canonical artifact, then publish it back into the same thread.

1) Start from the canonical schema: `specs/artifact_schema_v0.1.md`.
2) Apply agent deltas per: `specs/artifact_delta_spec_v0.1.md`.
3) Save a local artifact file (example): `artifact_v1.md`.
4) Publish it back to Agent Mail as a `COMPILED:` message:

```bash
./brenner.ts mail send \
  --project-key "$PWD" \
  --sender FuchsiaDog \
  --to BlueLake,PurpleMountain,RedForest \
  --thread-id "$THREAD_ID" \
  --subject "COMPILED: v1 artifact" \
  --body-file artifact_v1.md \
  --ack-required
```

Then iterate:
- Ask for critique (`CRITIQUE:`), request revisions, collect new `DELTA[...]`, publish `COMPILED: v2 ...`, etc.

### 3.7 Conversation protocol (copy/paste)

Paste this at the top of a new thread to force “conversation as hypothesis search”:

~~~markdown
## Conversation Protocol (Brenner-style)

We are using conversation as cheap hypothesis search + cheap pruning.

Rules:
1) Say the “stupid thing” quickly (cheap generation).
2) Apply a “severe audience” immediately (cheap pruning): what would kill this?
3) Always include a **third alternative** (misspecification): “both could be wrong.”
4) Prefer **forbidden patterns** and discriminative tests over supportive arguments.
5) Keep levels split (program vs interpreter; message vs machine).
6) If we can’t cite it, label it `[inference]` and move on.
~~~

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

Next steps: compile deltas → render canonical artifact → publish `COMPILED` back to the thread → optionally persist to `artifacts/{thread_id}.md`.

---

## 5) Optional `.ntm/` project templates (proposal)

> **Goal**: minimize copy/paste friction in the cockpit without adding lots of repo-specific scaffolding.

### How `ntm` discovers templates and palette commands

**Templates**
- Project templates live at: `.ntm/templates/*.md` (highest precedence).
- Templates can also live in: `~/.config/ntm/templates/*.md` (user-level).
- View available templates: `ntm template list`

**Command palette**
- `ntm palette` shows commands defined in the `ntm` config file (default: `~/.config/ntm/config.toml`).
- `ntm config project init` can initialize a project config at `.ntm/config.toml` (optional).

### Proposed minimal template surface (names + purpose + location)

All of these would live as markdown templates under `.ntm/templates/`:

1. `brenner_check_mail.md`
   - **Purpose**: tell the agent to check Agent Mail for the current thread, and read the latest kickoff / instructions.
   - **Notes**: use `{{session}}` as the thread id (join-key contract: `thread_id == ntm session name`).

2. `brenner_reply_delta.md`
   - **Purpose**: request a structured `DELTA[...]` response to the current thread, following:
     - `specs/delta_output_format_v0.1.md`
     - `specs/artifact_delta_spec_v0.1.md`
   - **Notes**: the template can include a reminder to ground claims in transcript `§n` anchors.

3. `brenner_discriminative_tests.md`
   - **Purpose**: request a ranked list/table of discriminative tests + potency controls (chastity vs impotence).
   - **Notes**: “digital handles”, “across-the-room differences”, and explicit separation claims (which hypotheses each test separates).

4. `brenner_adversarial_critique.md`
   - **Purpose**: request the “third alternative” + critique: what framing assumptions could be wrong, what would falsify the whole setup.
   - **Notes**: include exception quarantine guidance (don’t sweep anomalies under Occam’s broom).

### Proposed minimal palette surface (optional)

If we decide to commit a project config, add a tiny `.ntm/config.toml` with a “Brenner Loop” category mapping to the templates above, so operators can:
- run `ntm palette` → pick “Brenner: reply with DELTA” → choose target panes → send
- avoid remembering template names/flags

---

## 6) Post-session wrap-up checklist (artifacts + memory outcomes)

Use this to “land the plane” after a session:

- [ ] Publish a final `COMPILED: vN ...` message into the thread (attach/paste artifact content).
- [ ] Mark outstanding items (missing acks, missing roles) explicitly in the thread as `INFO:` or `BLOCKED:`.
- [ ] (Optional) Persist the artifact into git at `artifacts/{thread_id}.md` (explicit operator action).
- [ ] (Optional) Record procedural memory outcomes with `cm` (examples below).

If you use `cm` (cass-memory) for procedural memory:

```bash
# Optional: stash a new rule learned from the session
cm playbook add "Rule: ..." --category "prompt-hygiene"

# Optional: mark a session as processed (if you used cm onboard workflows)
cm onboard mark-done /path/to/session.jsonl
```

### Recommended `cm` playbook categories (Brenner Loop)

Use a small, stable set of categories so rules stay findable.

| Category | What belongs here | Example rule you might store |
|---|---|---|
| `protocol-kernel` | Schema + invariants: artifact sections, anchor formats, delta rules, required fields | “If a claim isn’t grounded in `§n`, label it `[inference]`.” |
| `prompt-hygiene` | How we write prompts + interpret outputs: provenance labeling, citation style, anti-confabulation patterns | “Never paraphrase as a quote; keep quotes short and cite `§n` inline.” |
| `evidence-per-week` | Choosing next experiments: likelihood ratios, potency controls, time/cost tradeoffs | “Prefer tests that separate ≥2 hypotheses with ‘across-the-room’ readouts.” |
| `thread-operations` | Agent Mail + workflow mechanics: thread IDs, subject tags, ack discipline, file reservations | “Thread ID is join-key; never change it mid-session.” |
| `artifact-compilation` | Merging + linting: delta merge policy, conflict resolution, publish conventions | “Resolve conflicts by explicit `EDIT` blocks, not silent overwrite.” |
| `safety-and-gating` | Guardrails: lab mode, auth, secrets hygiene, no vendor API policy | “Orchestration actions must be gated; fail closed if lab auth missing.” |

**Example commands**:

```bash
cm playbook add "Rule: Thread ID is the global join key; keep it stable across kickoff/DELTA/COMPILED." --category "thread-operations"
cm playbook add "Rule: Any non-§-grounded claim in artifacts must be labeled [inference]." --category "protocol-kernel"
cm playbook add "Rule: Prefer discriminative tests with potency controls (chastity vs impotence) and extreme likelihood ratios." --category "evidence-per-week"
```
