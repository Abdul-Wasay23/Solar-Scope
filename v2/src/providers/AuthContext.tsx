"use client";

/**
 * SolarScope — Authentication Context (Module 2, Step 5)
 *
 * Frontend-only demo authentication with localStorage persistence.
 * Session survives page refreshes within the same browser.
 *
 * ⚠️  SECURITY NOTICE:
 *  This is NOT real authentication security.
 *  Only non-sensitive demo profile fields are stored (id, name, email, role).
 *  No passwords, tokens, or secrets are persisted.
 *  Production access control must be enforced server-side via FastAPI + JWT.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserRole } from "@/types";
import {
  readPersistedUser,
  writePersistedUser,
  clearPersistedUser,
  type PersistedUser,
} from "./storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthUser = PersistedUser;

export type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /**
   * True only during the initial hydration tick (reading localStorage).
   * RouteGuard must wait for isLoading → false before deciding to redirect.
   */
  isLoading: boolean;
};

export type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Safe-redirect utility re-exports (Module 2, Step 6)
// ---------------------------------------------------------------------------

export {
  isSafeRedirect,
  getSafeRedirect,
  DEFAULT_REDIRECT_PATH,
} from "@/lib/utils/redirect";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  /**
   * Start as true; set to false once we've attempted to read localStorage.
   * RouteGuard shows a spinner during this tick to prevent redirect flicker.
   */
  const [isLoading, setIsLoading] = useState(true);

  // ── Hydration ─────────────────────────────────────────────────────────────
  // Runs once on mount (client-side only). Reads localStorage with full error
  // handling provided by readPersistedUser(). App never crashes here.
  useEffect(() => {
    const restored = readPersistedUser();
    setUser(restored);      // null if missing / invalid / storage unavailable
    setIsLoading(false);    // hydration complete — RouteGuard can now decide
  }, []);

  // ── Internal helpers ───────────────────────────────────────────────────────

  /** Updates React state and persists to localStorage in one call. */
  const applyUser = useCallback((u: AuthUser | null) => {
    if (u) {
      writePersistedUser(u);
    } else {
      clearPersistedUser();
    }
    setUser(u);
  }, []);

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Demo login — accepts any syntactically-valid credentials.
   * ↳ Replace with POST /api/auth/login + JWT handling in Module 5 (FastAPI).
   */
  const login = useCallback(
    async (email: string, _password: string): Promise<void> => {
      // Simulate network latency so the UI loading state is visible
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      const demoUser: AuthUser = {
        id: "demo-001",
        fullName: "SolarScope User",
        email: email.trim().toLowerCase(),
        role: "BUYER",
      };
      applyUser(demoUser);
    },
    [applyUser],
  );

  /**
   * Demo register — creates a user from the supplied form fields.
   * ↳ Replace with POST /api/auth/register in Module 5 (FastAPI).
   */
  const register = useCallback(
    async (fullName: string, email: string, _password: string): Promise<void> => {
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      const demoUser: AuthUser = {
        id: "demo-001",
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role: "BUYER",
      };
      applyUser(demoUser);
    },
    [applyUser],
  );

  /**
   * Logout — clears React state and removes persisted user from localStorage.
   */
  const logout = useCallback(() => {
    applyUser(null);
  }, [applyUser]);

  // ── Context value ──────────────────────────────────────────────────────────

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useAuth — consume the authentication context.
 * Throws if used outside <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
