This is the Brenner Bot web app (Next.js App Router + React 19), bootstrapped with `create-next-app` and using **Bun** for all JS/TS tooling.

## Getting Started

### 1) Configure Agent Mail (optional but recommended)

Copy `apps/web/.env.example` to `apps/web/.env.local` and set:
- `AGENT_MAIL_BASE_URL` (default `http://127.0.0.1:8765`)
- `AGENT_MAIL_PATH` (default `/mcp/`)
- `AGENT_MAIL_BEARER_TOKEN` (if auth is enabled)

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

Quality gates:
```bash
cd apps/web
bun run build
bun run lint
```
