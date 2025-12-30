# Cloudflare Worker Evaluation: Go/No-Go Decision v0.1

> **Decision: NO-GO for v1**
>
> A Cloudflare Worker does not provide meaningful benefit over the current Vercel + Cloudflare DNS + Access architecture.

---

## Executive Summary

The current deployment architecture (Cloudflare proxied DNS → Vercel Edge) already provides the key capabilities a Worker would offer. Adding a Worker would introduce complexity without corresponding value for the v1 release.

**Recommendation**: Skip Workers for v1. Reassess only if specific triggers occur (see §6).

---

## 1) Current Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare (proxied DNS, orange cloud)                     │
│  • SSL/TLS termination (Full strict mode)                   │
│  • CDN caching for static assets                            │
│  • Access: JWT injection for /sessions/*                    │
│  • Analytics + basic DDoS protection                        │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Vercel Edge Network                                        │
│  • Next.js 16 App Router (Server Components + Edge)         │
│  • proxy.ts validates CF Access headers OR lab secret       │
│  • Global edge distribution                                 │
│  • Static asset caching                                     │
│  • Serverless functions for API routes                      │
└─────────────────────────────────────────────────────────────┘
```

**Key existing capabilities:**
- Edge execution (Vercel runs at edge by default)
- CDN caching (Cloudflare + Vercel)
- Route protection (Cloudflare Access + app-layer proxy.ts)
- SSL/TLS (Cloudflare Full-strict + Vercel auto-SSL)
- Global distribution (Vercel edge network spans 20+ regions)

---

## 2) Evaluated Worker Use-Cases

### 2.1 Advanced Routing

| Use-Case | Needed? | Notes |
|----------|---------|-------|
| Apex → www redirect | No | Vercel handles via CNAME flattening |
| Geographic routing | No | Single backend; Vercel has global edge |
| Custom rewrites | No | Next.js rewrites in `next.config.ts` suffice |
| Canary/A-B testing | No | Not required for v1 |

**Verdict**: No routing needs a Worker can't already be handled.

### 2.2 Caching

| Use-Case | Needed? | Notes |
|----------|---------|-------|
| Static assets | No | Vercel + Cloudflare already cache |
| Corpus files | No | Served from `public/_corpus/` with good headers |
| Custom cache keys | No | No complex invalidation patterns |
| API response caching | No | Dynamic routes don't need edge caching |

**Verdict**: No caching improvements from a Worker.

### 2.3 Secure Gateway

| Use-Case | Needed? | Notes |
|----------|---------|-------|
| JWT crypto validation | Maybe | Current model trusts CF headers (acceptable when DNS proxied) |
| Rate limiting | Maybe | Low traffic; Vercel has basic protection |
| IP blocklisting | No | No compliance requirement |
| Header transformation | No | CF Access already injects what we need |

**Verdict**: Marginal security improvement not worth the complexity.

### 2.4 Other Capabilities

| Use-Case | Needed? | Notes |
|----------|---------|-------|
| Response transformation | No | Next.js handles this |
| Logging/analytics | No | Cloudflare dashboard provides this |
| Edge compute | No | Vercel Edge Runtime already provides this |
| Web Application Firewall | No | Cloudflare Pro WAF rules available if needed (no Worker required) |

**Verdict**: No unique Worker capabilities needed.

---

## 3) Cost/Benefit Analysis

### Potential Benefits

1. **Cryptographic JWT validation** (vs. header-trust)
   - Slightly stronger security guarantee
   - But header-trust is acceptable when DNS is proxied (origin hidden)

2. **Custom rate limiting**
   - Could limit per-IP/per-route
   - But traffic is low and Vercel/Cloudflare have basic protection

3. **Geographic blocking**
   - Could deny traffic from specific countries
   - No compliance requirement identified

### Costs

1. **Complexity**
   - Additional codebase (Worker scripts)
   - Wrangler configuration
   - Separate deployment pipeline

2. **Maintenance burden**
   - Another component to monitor and update
   - Potential version compatibility issues

3. **Latency risk**
   - Additional hop (minor, but non-zero)
   - Vercel already runs at edge, so Worker adds no distribution benefit

4. **Debugging difficulty**
   - Another layer to inspect when issues occur
   - Split logs between Cloudflare + Vercel

### Net Assessment

| Factor | Without Worker | With Worker | Delta |
|--------|----------------|-------------|-------|
| Security | Good (header-trust) | Slightly better (crypto) | Marginal |
| Performance | Excellent (dual CDN) | Same | None |
| Complexity | Low | Higher | Negative |
| Maintenance | Low | Higher | Negative |

**Conclusion**: Costs outweigh benefits for v1.

---

## 4) Security Considerations

### Current Model (Acceptable)

The current security model is:

1. **DNS is proxied** (orange cloud) → Origin IP hidden
2. **Cloudflare Access** enforces authentication at edge
3. **CF Access injects headers** (`cf-access-jwt-assertion`, `cf-access-authenticated-user-email`)
4. **App-layer proxy.ts** validates header presence (not cryptographic signature)
5. **Defense-in-depth**: Even if headers spoofed, `BRENNER_LAB_MODE` must be enabled

### Why Header-Trust is Acceptable

- **Origin is not directly accessible**: All traffic flows through Cloudflare proxy
- **Headers cannot be spoofed** by external actors (CF strips/replaces them)
- **Fail-closed design**: Missing headers → denied access

### When to Reconsider

- If origin IP is exposed (Vercel preview URLs bypass Cloudflare)
  - Mitigation: Use `BRENNER_LAB_SECRET` for direct access
- If compliance requires cryptographic JWT validation
  - Then implement JWT validation at the app layer (not necessarily Worker)

---

## 5) Decision

### Verdict: NO-GO for v1

Do not implement a Cloudflare Worker for the initial release.

### Rationale

1. No meaningful capability gap exists
2. Added complexity without corresponding value
3. Current security model is acceptable
4. Limited engineering resources should focus on higher-impact work

---

## 6) Reassessment Triggers

Reconsider Workers if any of these occur:

| Trigger | Why |
|---------|-----|
| **High traffic requiring rate limiting** | Current basic protection may be insufficient |
| **Compliance requirement for JWT crypto** | May need to validate signatures at edge |
| **Complex routing rules** | Geographic blocks, canary deployments |
| **Response transformation needs** | Custom headers, body modifications |
| **WAF rules insufficient** | Need custom security logic beyond CF dashboard |

### How to Reassess

1. Create a new evaluation task when trigger occurs
2. Document specific requirements
3. Prototype Worker in staging environment
4. Measure latency impact
5. Update this document with new decision

---

## 7) Alternative: App-Layer Enhancements

If stronger security is desired without Workers:

1. **JWT signature validation in proxy.ts**
   - Use `cf-access-jwt-assertion` header
   - Validate against Cloudflare's public keys
   - Edge Runtime supports crypto APIs

2. **Rate limiting via Vercel middleware**
   - Implement in `proxy.ts` using edge KV or external store
   - Vercel Edge Config for rate limit rules

3. **Cloudflare WAF rules**
   - Configure via dashboard (no code)
   - IP reputation, rate limiting, geographic rules

These can be added later without committing to a Worker architecture.

---

## 8) References

- `specs/deployment_runbook_v0.1.md` - Current deployment architecture
- `apps/web/src/proxy.ts` - Edge auth implementation
- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Vercel Edge Functions: https://vercel.com/docs/functions/edge-functions
