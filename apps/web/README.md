This is the BrennerBot web app (Next.js App Router + React 19), bootstrapped with `create-next-app` and using **Bun** for all JS/TS tooling.

## Getting Started

### 1) Configure Agent Mail (optional but recommended)

Copy `apps/web/.env.example` to `apps/web/.env.local` and set:
- `AGENT_MAIL_BASE_URL` (default `http://127.0.0.1:8765`)
- `AGENT_MAIL_PATH` (default `/mcp/`)
- `AGENT_MAIL_BEARER_TOKEN` (if auth is enabled)
- `BRENNER_LAB_MODE=1` (required to enable `/sessions/new` orchestration; fail-closed by default)

### 2) Run the development server

```bash
cd apps/web
bun install --save-text-lockfile
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Key routes:
- `/corpus`: browse primary docs in this repo (read server-side from repo root)
- `/sessions/new`: compose a “Brenner Loop kickoff” prompt and send it to agents via Agent Mail

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
