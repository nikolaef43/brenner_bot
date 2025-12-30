# Brenner Bot Lab Mode: Threat Model & Auth Specification

> **Status**: Draft specification
> **Task**: brenner_bot-5so.4.4.1
> **Priority**: P0 (Security)

---

## 1. Context

Brenner Bot has two operational modes:

| Mode | Access | Capabilities |
|------|--------|--------------|
| **Public mode** | Anyone | Browse corpus, read distillations, explore operator palette |
| **Lab mode** | Authorized operators only | Orchestrate sessions, send Agent Mail, persist artifacts |

This document defines the threat model and auth mechanism for protecting lab mode.

---

## 2. Assets at Risk

### 2.1 Agent Mail System
The primary asset requiring protection. Lab mode can:
- **Create projects** (`ensure_project`)
- **Register agents** (`register_agent`)
- **Send messages** (`send_message`)
- **Read inboxes** (`fetch_inbox`, `resources/read`)
- **Acknowledge messages** (`acknowledge_message`)

### 2.2 Stored Artifacts
Future lab mode capabilities will persist session artifacts to the repository or database.

### 2.3 Compute Resources
Agent orchestration may trigger API calls to Claude, GPT, and Gemini, consuming tokens and rate limits.

---

## 3. Threat Actors

| Actor | Motivation | Capabilities |
|-------|------------|--------------|
| **Curious visitor** | Exploration | Unauthenticated HTTP requests |
| **Script kiddie** | Vandalism, spam | Automated scanning, form submission |
| **Competitor/troll** | Disruption | Targeted abuse, impersonation |
| **Insider (lapsed access)** | Grudge, curiosity | Knowledge of internal structure, possibly old credentials |

---

## 4. Threat Scenarios

### T1: Agent Impersonation
**Attack**: Attacker registers an agent with a trusted name and sends malicious messages.
**Impact**: Confusion, misinformation, broken coordination.
**Likelihood**: High (if lab mode is unprotected)

### T2: Message Spam / Denial of Service
**Attack**: Flood Agent Mail with garbage messages.
**Impact**: Inbox pollution, agent confusion, storage exhaustion.
**Likelihood**: Medium-High

### T3: Prompt Injection via Kickoff
**Attack**: Malicious excerpt or metadata causes downstream agents to execute unintended actions.
**Impact**: Unpredictable agent behavior, potential data exfiltration.
**Likelihood**: Medium

### T4: Resource Exhaustion
**Attack**: Trigger expensive orchestration loops consuming API credits.
**Impact**: Financial cost, rate limiting legitimate use.
**Likelihood**: Medium

### T5: Session Artifact Pollution
**Attack**: Create/overwrite artifacts with invalid data.
**Impact**: Corrupted research state, audit trail contamination.
**Likelihood**: Medium (once artifact persistence is built)

### T6: Credential Theft
**Attack**: Extract `AGENT_MAIL_BEARER_TOKEN` or other secrets from client-side exposure.
**Impact**: Full Agent Mail access.
**Likelihood**: Low (tokens are server-side only)

---

## 5. Protected Endpoints

The following routes/actions require lab mode authorization:

### 5.1 Server Actions (Critical)
| Action | File | Risk |
|--------|------|------|
| `sendKickoff` | `apps/web/src/app/sessions/new/page.tsx` | Agent impersonation, spam, DoS |

### 5.2 API Routes (Planned)
| Route | Purpose | Risk |
|-------|---------|------|
| `/api/sessions/compile` | Parse + merge artifacts | Artifact pollution |
| `/api/sessions/persist` | Store artifacts to repo | Data corruption |
| `/api/agent-mail/*` | Proxy to Agent Mail | All Agent Mail risks |

### 5.3 Safe Endpoints (No protection needed)
| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/corpus` | Corpus index |
| `/corpus/[doc]` | Document reader |

---

## 6. Recommended Auth Mechanism

### 6.1 Decision: Cloudflare Access + App-Layer Fallback

We recommend a **defense-in-depth** approach with two layers:

```
┌─────────────────────────────────────────────────────────┐
│                    Internet                              │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│            Layer 1: Cloudflare Access                    │
│                                                          │
│  - Policy: Email allowlist (e.g., @yourorg.com)         │
│  - Scope: Paths matching /sessions/*, /api/agent-mail/* │
│  - Fail-closed: No CF token → no access                 │
└─────────────────────┬───────────────────────────────────┘
                      │ (CF-Access-JWT-Assertion header)
                      ▼
┌─────────────────────────────────────────────────────────┐
│            Layer 2: App-Layer Gating                     │
│                                                          │
│  - Validates CF-Access-JWT (if present)                 │
│  - Fallback: Shared secret header for local/CLI         │
│  - Environment: LAB_MODE_SECRET                         │
│  - Fail-closed: Invalid/missing auth → 403              │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Why Two Layers?

| Layer | Purpose |
|-------|---------|
| **Cloudflare Access** | Primary auth for production web app. Handles SSO, MFA, device posture. |
| **App-layer secret** | CLI fallback, local development, API automation. Ensures protection even if CF misconfigured. |

### 6.3 Auth Flow

1. **Production (Web)**:
   - User hits `/sessions/new`
   - Cloudflare Access intercepts, prompts login
   - On success, CF sets `CF-Access-JWT-Assertion` header
   - App validates JWT, allows request

2. **Local Development**:
   - No Cloudflare in the path
   - App checks for `x-lab-secret` header or cookie
   - Matches against `LAB_MODE_SECRET` env var
   - If valid, allows request

3. **CLI / API Automation**:
   - CLI sends `x-lab-secret` header with secret
   - App validates and allows request

---

## 7. Implementation Specification

### 7.1 Environment Variables

```bash
# Required for lab mode
LAB_MODE_SECRET="<random-32-char-secret>"  # Fallback auth
LAB_MODE_ENABLED="true"                     # Master toggle

# For Cloudflare Access validation (production only)
CF_ACCESS_TEAM_DOMAIN="yourteam.cloudflareaccess.com"
CF_ACCESS_AUD="<your-application-audience-tag>"
```

### 7.2 Middleware Logic (Pseudocode)

```typescript
async function labModeGuard(request: Request): Promise<Response | null> {
  // If lab mode is disabled, block all protected endpoints
  if (process.env.LAB_MODE_ENABLED !== "true") {
    return new Response("Lab mode disabled", { status: 403 });
  }

  // Try Cloudflare Access JWT first (production)
  const cfJwt = request.headers.get("CF-Access-JWT-Assertion");
  if (cfJwt) {
    const valid = await validateCfAccessJwt(cfJwt);
    if (valid) return null; // Proceed
    return new Response("Invalid CF Access token", { status: 403 });
  }

  // Fallback: shared secret (local/CLI)
  const labSecret = request.headers.get("x-lab-secret");
  if (labSecret === process.env.LAB_MODE_SECRET) {
    return null; // Proceed
  }

  // No valid auth
  return new Response("Lab mode requires authentication", { status: 403 });
}
```

### 7.3 Protected Paths Pattern

```typescript
const LAB_MODE_PATHS = [
  "/sessions/new",
  "/sessions/*/",
  "/api/sessions/*",
  "/api/agent-mail/*",
];
```

### 7.4 CF Access JWT Validation

```typescript
import * as jose from "jose";

async function validateCfAccessJwt(token: string): Promise<boolean> {
  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
  const aud = process.env.CF_ACCESS_AUD;

  if (!teamDomain || !aud) return false;

  try {
    const JWKS = jose.createRemoteJWKSet(
      new URL(`https://${teamDomain}/cdn-cgi/access/certs`)
    );
    await jose.jwtVerify(token, JWKS, {
      issuer: `https://${teamDomain}`,
      audience: aud,
    });
    return true;
  } catch {
    return false;
  }
}
```

---

## 8. Cloudflare Access Policy

### 8.1 Recommended Policy

| Setting | Value |
|---------|-------|
| **Application name** | Brenner Bot Lab |
| **Application domain** | `brennerbot.org` |
| **Path** | `/sessions/*`, `/api/agent-mail/*`, `/api/sessions/*` |
| **Session duration** | 24 hours |
| **Identity providers** | GitHub, Google (or your org's IdP) |
| **Policy rule** | Include: Emails ending in `@yourorg.com` OR specific email allowlist |

### 8.2 Policy Configuration Steps

1. Go to Cloudflare Zero Trust dashboard
2. Access → Applications → Add an Application
3. Select "Self-hosted"
4. Configure domain and paths per above
5. Add access policy with email allowlist
6. Copy the "Application Audience (AUD) Tag" to `CF_ACCESS_AUD`
7. Note your team domain for `CF_ACCESS_TEAM_DOMAIN`

---

## 9. Fail-Closed Requirements

The system MUST fail closed in these scenarios:

| Scenario | Expected Behavior |
|----------|-------------------|
| `LAB_MODE_ENABLED` not set | Block all protected endpoints |
| `LAB_MODE_SECRET` not set | Block fallback auth (CF Access only) |
| CF Access JWT invalid/expired | Block request (don't fall back to secret) |
| Both CF JWT and secret missing | Block request |

---

## 10. Security Checklist

### Pre-Deployment
- [ ] `LAB_MODE_SECRET` is ≥32 random characters
- [ ] `LAB_MODE_SECRET` is NOT in git
- [ ] Cloudflare Access policy created
- [ ] `CF_ACCESS_AUD` and `CF_ACCESS_TEAM_DOMAIN` set in production env
- [ ] Protected paths list is complete
- [ ] Middleware is applied to all protected routes

### Ongoing
- [ ] Review access logs monthly
- [ ] Rotate `LAB_MODE_SECRET` quarterly
- [ ] Audit Cloudflare Access policy members annually
- [ ] Test fail-closed behavior on each deployment

---

## 11. Testing Scenarios

| Test | Expected Result |
|------|-----------------|
| Hit `/sessions/new` without auth | 403 Forbidden |
| Hit `/sessions/new` with invalid `x-lab-secret` | 403 Forbidden |
| Hit `/sessions/new` with valid `x-lab-secret` | 200 OK (form renders) |
| Hit `/sessions/new` with valid CF Access JWT | 200 OK |
| Hit `/corpus` without auth | 200 OK (public) |
| Submit session form without auth | 403 Forbidden |
| `LAB_MODE_ENABLED=false`, hit `/sessions/new` with valid secret | 403 Forbidden |

---

## 12. Decision Summary

| Question | Answer |
|----------|--------|
| **Who should access lab mode?** | Authorized operators (email allowlist) |
| **What endpoints are dangerous?** | `/sessions/*`, `/api/agent-mail/*`, `/api/sessions/*` |
| **Preferred gating?** | Cloudflare Access (primary) + app-layer secret (fallback) |
| **Fail-open or fail-closed?** | Fail-closed |

---

## Appendix A: Why Not Just App-Layer Secret?

A shared secret alone has weaknesses:
- No SSO/MFA integration
- No user identity tracking in logs
- Harder to revoke per-user
- CLI must store secret securely

Cloudflare Access provides:
- SSO with existing identity providers
- Per-user audit logs
- Device posture checking (optional)
- Automatic token rotation
- No secrets in CLI (browser-based auth)

The app-layer secret remains as:
- Local development convenience
- CLI automation fallback
- Defense-in-depth if CF misconfigured

---

## Appendix B: Future Considerations

### Rate Limiting
Add rate limiting to `sendKickoff` even with auth:
- 10 kickoffs per hour per user
- Prevents accidental loops

### Audit Logging
Log all lab mode actions with:
- User identity (from CF JWT or "secret-user")
- Timestamp
- Action (e.g., "sendKickoff")
- Parameters (thread ID, recipients)

### Session Isolation
Consider whether users should only see their own sessions or all sessions.

---

*Document version: 0.1 | Author: GreenDog (Claude Code / Opus 4.5)*
