/**
 * SolarScope — useAuth hook (Module 2, Step 4)
 *
 * Re-exports the hook from AuthContext so consumers can import from
 * a stable hooks path without coupling to the provider implementation.
 *
 *   import { useAuth } from "@/hooks/useAuth";
 */
export { useAuth } from "@/providers/AuthContext";
export type { AuthUser, AuthState, AuthContextValue } from "@/providers/AuthContext";
