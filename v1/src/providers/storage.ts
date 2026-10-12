/**
 * SolarScope — Demo Session Storage Utility (Module 2, Step 5)
 *
 * Wraps localStorage access with:
 *  - SSR safety (typeof window guard)
 *  - Error resilience (quota errors, private browsing restrictions)
 *  - Schema validation so malformed data is rejected and cleared
 *
 * ⚠️  SECURITY NOTE:
 *  This persists only non-sensitive demo profile fields (id, fullName, email, role).
 *  No passwords, tokens, or secrets are stored.
 *  This does NOT provide real authentication security.
 *  Production security requires server-side JWT / session validation.
 */

import type { UserRole } from "@/types";

export type PersistedUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
};

const STORAGE_KEY = "ss_demo_user";

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

const VALID_ROLES: readonly UserRole[] = [
  "BUYER",
  "SELLER",
  "SERVICE_PROVIDER",
  "ADMIN",
];

/**
 * Validates that a parsed object has the shape of PersistedUser.
 * Rejects anything malformed or non-compliant.
 */
export function isValidAuthUser(value: unknown): value is PersistedUser {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    v.id.trim().length > 0 &&
    typeof v.fullName === "string" &&
    v.fullName.trim().length > 0 &&
    typeof v.email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()) &&
    typeof v.role === "string" &&
    (VALID_ROLES as readonly string[]).includes(v.role)
  );
}

// ---------------------------------------------------------------------------
// Safe localStorage wrappers
// ---------------------------------------------------------------------------

/** Returns true if localStorage is accessible (SSR + private-mode safe). */
export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return typeof window.localStorage !== "undefined" && window.localStorage !== null;
  } catch {
    return false;
  }
}

/**
 * Reads and validates the persisted demo user from localStorage.
 * Returns null if storage is unavailable, empty, or data is invalid/malformed.
 */
export function readPersistedUser(): PersistedUser | null {
  if (!isStorageAvailable()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isValidAuthUser(parsed)) {
      // Corrupt or outdated schema — clear it silently
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
      return null;
    }

    // Return strictly the safe fields (strip any extra or injected properties)
    return {
      id: parsed.id.trim(),
      fullName: parsed.fullName.trim(),
      email: parsed.email.trim().toLowerCase(),
      role: parsed.role,
    };
  } catch {
    // JSON parse failure or unexpected error — clear corrupt entry
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    return null;
  }
}

/**
 * Persists a demo user to localStorage.
 * Silently swallows errors (quota exceeded, private browsing, etc.)
 * so the app never crashes due to storage failure.
 */
export function writePersistedUser(user: PersistedUser): void {
  if (!isStorageAvailable()) return;
  try {
    // Only persist the safe subset of fields
    const safe: PersistedUser = {
      id: user.id.trim(),
      fullName: user.fullName.trim(),
      email: user.email.trim().toLowerCase(),
      role: user.role,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  } catch {
    // Storage quota exceeded or write blocked — app continues without persistence
  }
}

/**
 * Removes the persisted demo user from localStorage.
 * Called on logout. Silently ignores errors.
 */
export function clearPersistedUser(): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
