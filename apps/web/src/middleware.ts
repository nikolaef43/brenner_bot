import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Check if lab mode is enabled (duplicated here because middleware runs in Edge runtime
 * and cannot import from lib/auth.ts which may use Node.js APIs).
 */
function isLabModeEnabled(): boolean {
  const value = (process.env.BRENNER_LAB_MODE ?? "").trim().toLowerCase();
  return value === "1" || value === "true";
}

/**
 * Validate lab secret if configured.
 */
function hasValidLabSecret(request: NextRequest): boolean {
  const configuredSecret = process.env.BRENNER_LAB_SECRET?.trim();

  // If no secret configured, this check cannot pass (use Cloudflare Access instead)
  if (!configuredSecret || configuredSecret.length === 0) return false;

  // Check header
  const headerValue = request.headers.get("x-brenner-lab-secret");
  if (headerValue === configuredSecret) return true;

  // Check cookie
  const cookieValue = request.cookies.get("brenner_lab_secret")?.value;
  if (cookieValue === configuredSecret) return true;

  return false;
}

function hasCloudflareAccessHeaders(request: NextRequest): boolean {
  const jwt = request.headers.get("cf-access-jwt-assertion");
  if (jwt && jwt.trim().length > 0) return true;

  const email = request.headers.get("cf-access-authenticated-user-email");
  if (email && email.trim().length > 0) return true;

  return false;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Never serve raw markdown files directly from `public/corpus/`.
  // Corpus documents should be accessed via `/corpus/[doc]` where we can enforce policy.
  if (pathname.startsWith("/corpus/") && pathname.endsWith(".md")) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Protect orchestration routes (sessions, API endpoints that trigger Agent Mail)
  // Fail-closed: deny access unless explicitly enabled
  if (pathname.startsWith("/sessions")) {
    // Check 1: Lab mode must be enabled
    if (!isLabModeEnabled()) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Check 2: Cloudflare Access headers OR shared secret
    const authorized = hasCloudflareAccessHeaders(request) || hasValidLabSecret(request);
    if (!authorized) {
      // Fail closed without revealing which auth layer is missing
      return new NextResponse("Not found", { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/corpus/:path*", "/sessions/:path*"],
};
