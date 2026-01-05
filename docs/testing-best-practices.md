# BrennerBot Testing: Best Practices

> **Goal:** Keep tests fast, realistic (**no mocks when possible**), and debuggable.

---

## Quick Reference

### Web app (`apps/web`)

```bash
cd apps/web

# Unit tests (Vitest + happy-dom)
bun run test
bun run test:watch
bun run test:coverage

# E2E (Playwright)
bun run test:e2e
bun run test:e2e -- e2e/operators.spec.ts

# Build + typecheck
bun run build
bunx tsc --noEmit

# Lint
bun run lint
bun run lint:ox
```

### CLI (repo root)

```bash
# Bun’s native test runner (CI currently runs this)
bun test brenner.test.ts

# Debug: print argv + stdout/stderr per invocation (truncated)
BRENNER_CLI_TEST_TRACE=1 bun test brenner.test.ts

# Optional: tune how much output is printed when tracing
# (default: 20000 chars per stream)
BRENNER_CLI_TEST_LOG_MAX_CHARS=50000 BRENNER_CLI_TEST_TRACE=1 bun test brenner.test.ts

# Additional root-level coverage (optional)
bun test evidence-pack.test.ts
```

---

## Test Layers (and When to Use Each)

### 1) Unit/Integration: Vitest + happy-dom (Web)

- **Runner:** `cd apps/web && bun run test` (Vitest).
- **Do not use:** `bun test` for React/component tests — it bypasses the Vitest + happy-dom setup and will cause `"document is not defined"` failures.
- **Config:** `apps/web/vitest.config.ts` sets `environment: "happy-dom"` and includes `src/test-setup.tsx`.
- **Philosophy:** Prefer *real implementations* (in-memory stores, deterministic fixtures) over mocks.

### 2) E2E: Playwright (Web)

- **Runner:** `cd apps/web && bun run test:e2e`.
- **Default base URL:** production (`https://brennerbot.org`) unless you override `BASE_URL`.
- **Projects:** desktop + mobile (`apps/web/playwright.config.ts` runs `desktop-chrome`, `desktop-firefox`, `mobile-chrome` by default).
- **Use the shared fixtures/utilities:** import from `apps/web/e2e/utils/index.ts` (logger, `navigateTo`, `waitForNetworkIdle`, `takeScreenshot`, etc.).

#### Environment variables (Playwright)

- `BASE_URL` – set to `http://localhost:3000` when testing your local dev server
- `NO_VIDEO=1` – disable all video capture
- `RECORD_VIDEO=on|off` – control video capture behavior
- `SLOW_MO=100` – slow down actions for debugging
- `PLAYWRIGHT_INCLUDE_WEBKIT=1` – opt-in Safari/WebKit projects

#### Lab-gated flows (expected skips)

Some E2E suites (e.g. `apps/web/e2e/agent-mail-integration.spec.ts`) are **lab-mode gated** and may:
- require `BRENNER_LAB_MODE=1`
- require auth (`brenner_lab_secret` cookie / `BRENNER_LAB_SECRET` / Cloudflare Access)
- **skip** automatically when the target is locked or not present

This is intentional so the full E2E suite can run against production without breaking public routes.

### 3) Build + Typecheck (Web)

- `cd apps/web && bun run build` is the closest “production sanity check”.
- `cd apps/web && bunx tsc --noEmit` catches pure TS errors.

---

## Writing Good E2E Tests (Playwright)

- **Assume multi-viewport**: tests must pass on desktop *and* mobile projects.
- **Prefer stable selectors**: roles/text/labels over brittle CSS.
- **Use the logging helpers** (`apps/web/e2e/utils/`) so failures are diagnosable from artifacts.
- **Wait intentionally**: `waitForNetworkIdle` after navigation; avoid arbitrary `waitForTimeout` unless unavoidable.
- **Avoid production side effects**: treat tests as read-only when `BASE_URL` points at production.

---

## Pre-Commit “Quality Gates” (Recommended)

```bash
# Bug scanner on staged changes
ubs --staged

# Web checks
cd apps/web
bun run test
bun run build
bun run test:e2e
```

---

## Troubleshooting

### `"document is not defined"` in component tests

You almost certainly ran the wrong test runner.

- ✅ `cd apps/web && bun run test`
- ❌ `bun test`

### Playwright browser install issues

```bash
cd apps/web
bunx playwright install --with-deps chromium
```
