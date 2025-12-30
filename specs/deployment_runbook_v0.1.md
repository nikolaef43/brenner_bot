# BrennerBot Deployment Runbook v0.1 (Vercel + Cloudflare)

> **Scope**: Deploying the BrennerBot web app (brennerbot.org) to Vercel with Cloudflare DNS and Access protection for lab mode routes.
>
> **Related runbook**: `cockpit_runbook_v0.1.md` covers local Agent Mail + ntm operations.

---

## 1) Architecture Overview

```
                                    ┌──────────────────────────────┐
                                    │        Vercel Edge           │
                                    │  (Next.js 16 App Router)     │
                                    │                              │
     Internet                       │  /              (public)     │
        │                           │  /corpus        (public)     │
        │                           │  /distillations (public)     │
        ▼                           │  /operators     (public)     │
┌───────────────┐                   │                              │
│   Cloudflare  │───────────────────►  /sessions/*   (lab only)   │
│    (DNS +     │                   │  /api/sessions (lab only)   │
│    Access)    │                   │                              │
└───────────────┘                   └──────────────────────────────┘
       │
       │ Lab routes protected by:
       │  1. BRENNER_LAB_MODE=1 (fail-closed gate)
       │  2. Cloudflare Access OR BRENNER_LAB_SECRET
       ▼
```

**Key principles:**
- Public pages (/, /corpus, etc.) are never protected
- Lab routes require explicit opt-in via environment variables
- Defense-in-depth: even if Cloudflare is bypassed, app-layer auth gates access

---

## 2) Cloudflare DNS Setup

### 2.1 Domain Configuration

Configure DNS records in Cloudflare for `brennerbot.org`:

| Type  | Name           | Content                        | Proxy  |
|-------|----------------|--------------------------------|--------|
| CNAME | `@` (apex)     | `cname.vercel-dns.com`         | Proxied (orange cloud) |
| CNAME | `www`          | `cname.vercel-dns.com`         | Proxied (orange cloud) |

**Notes:**
- Proxied mode (orange cloud) is required for Cloudflare Access to work
- Vercel automatically handles apex (root) domain redirects via CNAME flattening
- SSL/TLS mode should be "Full (strict)" in Cloudflare

### 2.2 Vercel Domain Verification

In Vercel dashboard:
1. Go to Project → Settings → Domains
2. Add `brennerbot.org` and `www.brennerbot.org`
3. Vercel will show the expected CNAME target (`cname.vercel-dns.com`)
4. Wait for DNS propagation (usually < 5 minutes with Cloudflare)

---

## 3) Cloudflare Access (Lab Route Protection)

### 3.1 Access Application Setup

Create a Cloudflare Access application to protect lab routes:

1. In Cloudflare Zero Trust dashboard:
   - Go to Access → Applications → Add an application
   - Type: Self-hosted
   - Name: "BrennerBot Lab"
   - Application domain: `brennerbot.org`
   - Path: `/sessions`

2. Access Policy:
   - Policy name: "Lab Operators"
   - Action: Allow
   - Include rules:
     - Email addresses: (your operator email list)
     - OR: Email domain: `your-team-domain.com`

3. Additional paths to protect (add more rules or applications):
   - `/api/sessions/*`
   - Any future orchestration endpoints

### 3.2 Vercel Environment Configuration

For Cloudflare Access to be recognized, set these in Vercel:

| Variable | Value | Notes |
|----------|-------|-------|
| `BRENNER_LAB_MODE` | `1` | Required - enables lab features |
| `BRENNER_TRUST_CF_ACCESS_HEADERS` | `1` | Trust CF Access JWT headers |

**How it works:**
- Cloudflare Access injects `cf-access-jwt-assertion` and `cf-access-authenticated-user-email` headers
- When `BRENNER_TRUST_CF_ACCESS_HEADERS=1`, the app trusts these headers
- The app validates the presence of these headers (NOT cryptographic verification)

**Security note:** Only enable `BRENNER_TRUST_CF_ACCESS_HEADERS=1` when:
- The Vercel deployment is only reachable through Cloudflare (proxied DNS)
- Direct IP access to Vercel is not exposed
- This is the default with proxied (orange cloud) DNS

---

## 4) Vercel Environment Variables

### 4.1 Required Variables (Production)

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Example | Required | Notes |
|----------|---------|----------|-------|
| `BRENNER_LAB_MODE` | `1` | Yes | Enables orchestration features |
| `BRENNER_TRUST_CF_ACCESS_HEADERS` | `1` | Yes* | Trust Cloudflare Access |
| `BRENNER_LAB_SECRET` | `(empty)` | No | Optional fallback (see §5) |
| `AGENT_MAIL_BASE_URL` | `http://agent-mail.internal:8765` | If using Agent Mail | Agent Mail server URL |
| `AGENT_MAIL_PATH` | `/mcp/` | If using Agent Mail | MCP endpoint path |
| `AGENT_MAIL_BEARER_TOKEN` | `(secret)` | If Agent Mail requires auth | Bearer token |
| `BRENNER_PROJECT_KEY` | `/data/projects/brenner_bot` | No | Default project key |

*Required when using Cloudflare Access

### 4.2 Optional Variables

| Variable | Example | Notes |
|----------|---------|-------|
| `BRENNER_PUBLIC_BASE_URL` | `https://brennerbot.org` | Override for SSR corpus fetch |
| `AGENT_NAME` | `GreenCastle` | Default agent identity |

### 4.3 Local Development (.env)

Copy `.env.example` to `.env` and configure:

```bash
# Local Agent Mail
AGENT_MAIL_BASE_URL=http://127.0.0.1:8765
AGENT_MAIL_PATH=/mcp/

# Lab mode with shared secret (no Cloudflare Access locally)
BRENNER_LAB_MODE=1
BRENNER_LAB_SECRET=your-local-dev-secret
BRENNER_TRUST_CF_ACCESS_HEADERS=0

# Defaults
BRENNER_PROJECT_KEY=/data/projects/brenner_bot
AGENT_NAME=GreenCastle
```

Access lab routes locally by including the secret:
```bash
# Via header
curl -H "x-brenner-lab-secret: your-local-dev-secret" http://localhost:3000/api/sessions

# Via cookie (browser)
document.cookie = "brenner_lab_secret=your-local-dev-secret; path=/"
```

---

## 5) Secret Rotation Procedures

### 5.1 Rotating BRENNER_LAB_SECRET

Use case: Local dev secret or fallback production secret needs rotation.

1. Generate new secret:
   ```bash
   openssl rand -base64 32
   ```

2. Update in Vercel:
   - Go to Project → Settings → Environment Variables
   - Edit `BRENNER_LAB_SECRET`
   - Save (triggers new deployment)

3. Update local `.env` files on all developer machines

4. Update any CI/CD or automation that uses the secret

**Note:** If only using Cloudflare Access (no BRENNER_LAB_SECRET), this step is not needed.

### 5.2 Rotating AGENT_MAIL_BEARER_TOKEN

Use case: Agent Mail server token needs rotation.

1. Generate new token on Agent Mail server:
   ```bash
   # In the Agent Mail project directory
   bash scripts/rotate_token.sh
   ```

2. Update in Vercel:
   - Edit `AGENT_MAIL_BEARER_TOKEN` with new value
   - Redeploy

3. Restart any local Agent Mail clients

### 5.3 Cloudflare Access Token Rotation

Cloudflare Access tokens are managed by Cloudflare and rotate automatically.
No manual rotation is needed for the access JWT.

To revoke access for a user:
1. Go to Cloudflare Zero Trust → Access → Applications
2. Select the BrennerBot Lab application
3. Edit the policy to remove the user's email

---

## 6) Deployment Workflow

### 6.1 Standard Deployment (via Git)

Vercel auto-deploys on push to `main`:

```bash
# Ensure quality gates pass
cd apps/web
bun run build
bun run test
bun run type-check

# Push triggers deployment
git push origin main
```

### 6.2 Preview Deployments

Every PR gets a preview deployment. Lab mode is typically disabled in previews
unless explicitly configured.

### 6.3 Manual Deployment

```bash
# Install Vercel CLI
bun install -g vercel

# Deploy to production
cd apps/web
vercel --prod

# Deploy preview
vercel
```

### 6.4 Rollback

If a deployment breaks:

1. **Via Vercel Dashboard** (fastest):
   - Go to Deployments
   - Find the last working deployment
   - Click "..." → "Promote to Production"

2. **Via CLI**:
   ```bash
   vercel rollback
   ```

---

## 7) Verification Checklist

After deployment, verify:

### Public Routes (should work without auth)
```bash
curl -s https://brennerbot.org | head -c 500    # Should return HTML
curl -s https://brennerbot.org/corpus           # Should return 200
curl -s https://brennerbot.org/operators        # Should return 200
```

### Lab Routes (should require auth)
```bash
# Without auth - should fail
curl -s https://brennerbot.org/sessions/new
# Expected: Redirect to Cloudflare Access login or 401/403

# With valid Cloudflare Access session (browser)
# Should show the session form
```

### Environment Variable Check
```bash
# Vercel CLI
vercel env ls

# Check deployed values (redacted)
vercel inspect <deployment-url>
```

---

## 8) Troubleshooting

### "Lab mode is disabled" error
- Check `BRENNER_LAB_MODE=1` is set in Vercel
- Redeploy after changing environment variables

### "Cloudflare Access headers detected but not trusted"
- Set `BRENNER_TRUST_CF_ACCESS_HEADERS=1` in Vercel
- Ensure DNS is proxied (orange cloud) in Cloudflare

### "Invalid or missing lab secret"
- Check `BRENNER_LAB_SECRET` matches what you're sending
- For header: `x-brenner-lab-secret: <secret>`
- For cookie: `brenner_lab_secret=<secret>`

### Lab routes work locally but not in production
- Verify Cloudflare Access application is configured for the correct paths
- Check that the deployment is using environment variables (not hardcoded)
- Ensure Vercel environment is set to "Production" for sensitive vars

### DNS propagation issues
```bash
# Check DNS resolution
dig brennerbot.org CNAME
dig www.brennerbot.org CNAME

# Check from Cloudflare perspective
curl -H "Host: brennerbot.org" https://cname.vercel-dns.com
```

---

## 9) Related Documentation

- `cockpit_runbook_v0.1.md` - Local ntm + Agent Mail session operations
- `bootstrap_troubleshooting_v0.1.md` - Installation troubleshooting
- `apps/web/src/lib/auth.ts` - Auth implementation details
- `apps/web/.env.example` - Environment variable reference
