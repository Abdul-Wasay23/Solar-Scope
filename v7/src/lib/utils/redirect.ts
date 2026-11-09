/**
 * SolarScope — Safe Redirect Utility (Module 2, Step 6)
 *
 * Ensures all post-authentication and route redirects stay strictly within
 * the internal application domain. Protects against:
 *  - Open redirect vulnerabilities
 *  - Protocol-relative URLs (//evil.com, /\\evil.com, /%2fevil.com)
 *  - Absolute URI schemes (http:, https:, javascript:, data:, etc.)
 *  - CRLF injection and malformed percent-encoding
 *
 * Preserves:
 *  - Valid internal paths (e.g. /projects)
 *  - Query parameters (e.g. /projects?status=draft)
 *  - Hash fragments (e.g. /projects#settings)
 */

export const DEFAULT_REDIRECT_PATH = "/dashboard";

/**
 * Returns true if the candidate path is a safe internal application route.
 * Rejects external URLs, protocol-relative evasion vectors, and malformed inputs.
 */
export function isSafeRedirect(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  // Must start with a single forward slash
  if (!trimmed.startsWith("/")) return false;

  // Reject protocol-relative URLs (//evil.com) and backslash evasions (/\evil.com, /\\evil.com)
  if (/^\/[/\\]/.test(trimmed)) return false;

  // Reject CRLF characters and null bytes (header injection / smuggling)
  if (/[\r\n\0]/.test(trimmed)) return false;

  // Decode to verify percent-encoded evasions (e.g., /%2fevil.com or /%5cevil.com)
  try {
    const decoded = decodeURIComponent(trimmed);
    if (/^\/[/\\]/.test(decoded)) return false;
    // Reject decoded absolute schemes like /http:// or /https://
    if (decoded.includes("://")) return false;
  } catch {
    // Malformed percent-encoding is rejected
    return false;
  }

  // Reject explicit absolute schemes directly attached (e.g. /javascript: or /https:)
  if (/^\/(?:https?|ftp|javascript|data|file|vbscript):/i.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Resolves a redirect candidate into a guaranteed safe internal route.
 * If target is invalid, returns fallback (defaulting to "/dashboard").
 * Preserves query strings and hash fragments on valid routes.
 */
export function getSafeRedirect(
  target: unknown,
  fallback: string = DEFAULT_REDIRECT_PATH
): string {
  if (isSafeRedirect(target)) {
    return target.trim();
  }

  if (isSafeRedirect(fallback)) {
    return fallback.trim();
  }

  return DEFAULT_REDIRECT_PATH;
}
