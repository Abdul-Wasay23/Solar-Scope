"use client";

/**
 * SolarScope — RouteGuard (Module 2, Step 4)
 *
 * Client-side access control for the authenticated (app) route group.
 *
 * Behaviour:
 *  - While auth is loading  → show a full-screen spinner (no premature redirect)
 *  - Unauthenticated        → redirect to /login?next=<intended-path>
 *  - Authenticated          → render children normally
 *
 * NOTE: This is UI-level protection only. Server-side / API authorization
 * must be enforced separately once the FastAPI backend is wired.
 */

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sun } from "lucide-react";
import "./RouteGuard.css";

type RouteGuardProps = {
  children: ReactNode;
};

export default function RouteGuard({ children }: RouteGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Still hydrating — wait before making any routing decision
    if (isLoading) return;

    if (!isAuthenticated) {
      // Encode the intended path so login can redirect back after success.
      // Only pass the pathname (never the full URL) to prevent open-redirect.
      const next = encodeURIComponent(pathname ?? "/dashboard");
      router.replace(`/login?next=${next}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // 1. Loading state — prevent flicker / premature redirect
  if (isLoading) {
    return (
      <div className="rg-loading" role="status" aria-label="Loading workspace">
        <div className="rg-loading-inner">
          <span className="rg-loading-icon">
            <Sun size={28} />
          </span>
          <span className="rg-loading-text">Loading workspace…</span>
        </div>
      </div>
    );
  }

  // 2. Not authenticated — render nothing (useEffect handles the redirect)
  if (!isAuthenticated) {
    return null;
  }

  // 3. Authenticated — render the protected content
  return <>{children}</>;
}
