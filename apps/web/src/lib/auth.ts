/**
 * Lab Mode Authentication & Authorization
 *
 * Defense-in-depth gating for orchestration features:
 * 1. BRENNER_LAB_MODE must be "1" or "true" (fail-closed)
 * 2. BRENNER_LAB_SECRET optional shared secret for extra layer
 *
 * Public deployments CANNOT trigger Agent Mail operations without
 * explicit enablement.
 */

const LAB_SECRET_HEADER = "x-brenner-lab-secret";
const LAB_SECRET_COOKIE = "brenner_lab_secret";

/**
 * Check if lab mode is enabled via environment variable.
 * Fail-closed: returns false unless explicitly enabled.
 */
export function isLabModeEnabled(): boolean {
  const value = (process.env.BRENNER_LAB_MODE ?? "").trim().toLowerCase();
  return value === "1" || value === "true";
}

/**
 * Get the configured lab secret (if any).
 * When set, requests must include this secret to access orchestration.
 */
function getLabSecret(): string | undefined {
  const secret = process.env.BRENNER_LAB_SECRET?.trim();
  return secret && secret.length > 0 ? secret : undefined;
}

/**
 * Check if a request has valid lab secret credentials.
 * Checks both header and cookie for the secret.
 *
 * @param headers - Request headers (or Headers object)
 * @param cookies - Cookie getter function or object
 * @returns true if secret matches or no secret is configured
 */
export function hasValidLabSecret(
  headers?: { get?: (name: string) => string | null },
  cookies?: { get?: (name: string) => { value: string } | undefined }
): boolean {
  const configuredSecret = getLabSecret();

  // If no secret configured, this check passes (rely on LAB_MODE alone)
  if (!configuredSecret) return true;

  // Check header first
  const headerValue = headers?.get?.(LAB_SECRET_HEADER);
  if (headerValue === configuredSecret) return true;

  // Check cookie as fallback
  const cookieValue = cookies?.get?.(LAB_SECRET_COOKIE)?.value;
  if (cookieValue === configuredSecret) return true;

  return false;
}

/**
 * Comprehensive auth check for orchestration features.
 * Returns an object with authorization status and reason.
 *
 * @param headers - Request headers
 * @param cookies - Cookie getter
 * @returns Authorization result with reason
 */
export function checkOrchestrationAuth(
  headers?: { get?: (name: string) => string | null },
  cookies?: { get?: (name: string) => { value: string } | undefined }
): { authorized: boolean; reason: string } {
  // Check 1: Lab mode must be enabled
  if (!isLabModeEnabled()) {
    return {
      authorized: false,
      reason: "Lab mode is disabled. Set BRENNER_LAB_MODE=1 to enable orchestration.",
    };
  }

  // Check 2: If secret is configured, it must be provided
  if (!hasValidLabSecret(headers, cookies)) {
    return {
      authorized: false,
      reason: "Invalid or missing lab secret. Provide via x-brenner-lab-secret header or brenner_lab_secret cookie.",
    };
  }

  return { authorized: true, reason: "Authorized" };
}

/**
 * Assert orchestration is authorized or throw.
 * Use in server actions for fail-fast behavior.
 */
export function assertOrchestrationAuth(
  headers?: { get?: (name: string) => string | null },
  cookies?: { get?: (name: string) => { value: string } | undefined }
): void {
  const { authorized, reason } = checkOrchestrationAuth(headers, cookies);
  if (!authorized) {
    throw new Error(`Orchestration denied: ${reason}`);
  }
}

/**
 * Header/cookie names for client-side use.
 */
export const AUTH_CONSTANTS = {
  LAB_SECRET_HEADER,
  LAB_SECRET_COOKIE,
} as const;
