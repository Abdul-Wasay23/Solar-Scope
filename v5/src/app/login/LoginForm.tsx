"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sun, ArrowRight, CheckCircle2 } from "lucide-react";
import AuthInput from "@/components/ui/AuthInput";
import { useAuth } from "@/hooks/useAuth";
import { getSafeRedirect } from "@/lib/utils/redirect";
import "@/styles/auth.css";

type LoginErrors = {
  email?: string;
  password?: string;
  form?: string;
};

/**
 * LoginForm — the actual login form implementation.
 * Split from page.tsx so it can be wrapped in Suspense (required for
 * useSearchParams in Next.js 14 App Router).
 */
export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, login, completeGoogleLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleCallbackHandled = useRef(false);

  // Resolve guaranteed-safe ?next= redirect target with /dashboard fallback
  const rawNext = searchParams.get("next");
  const googleStatus = searchParams.get("google_status");
  const googleError = searchParams.get("google_error");
  const redirectTo = getSafeRedirect(rawNext, "/dashboard");

  // Redirect already-authenticated users away from the login page
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const roleHome = user?.role === "ADMIN" ? "/admin" : user?.role === "SELLER" ? "/seller" : "/dashboard";
      router.replace(rawNext && rawNext !== "/dashboard" ? redirectTo : roleHome);
    }
  }, [isAuthenticated, isLoading, rawNext, redirectTo, router, user?.role]);

  useEffect(() => {
    if (googleError) {
      const messages: Record<string, string> = {
        not_configured: "Google sign-in is not configured yet. Contact the administrator.",
        google_secret_missing: "Google callback credentials are missing on the server. Add GOOGLE_CLIENT_SECRET to .env.local and restart Next.js.",
        account_backend_not_configured: "Google identity was received, but the existing-account login API is not configured.",
        invalid_configuration: "Google sign-in settings are invalid. Contact the administrator.",
        cancelled: "Google sign-in was cancelled.",
        invalid_callback: "The Google sign-in response could not be validated. Please try again.",
        google_failed: "Google could not authenticate this account. Please try again.",
        invalid_identity: "Google returned an invalid or unverified identity.",
        account_not_found: "No existing SolarScope account is linked to this Google account. Register first or contact support to link it.",
        account_link_conflict: "This Google account is linked to a different SolarScope account. Contact support.",
        backend_unavailable: "SolarScope account sign-in is unavailable. Please try again later.",
        backend_invalid_response: "SolarScope returned an invalid sign-in response. Contact support.",
      };
      setErrors({ form: messages[googleError] || "Google sign-in could not be completed." });
      return;
    }

    if (googleStatus !== "success" || googleCallbackHandled.current) return;
    googleCallbackHandled.current = true;
    setIsSubmitting(true);
    fetch("/api/auth/google/session", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.user) throw new Error(result.message || "Google sign-in session expired.");
        completeGoogleLogin(result.user);
        setSuccessMessage("Google sign-in successful. Opening your workspace…");
      })
      .catch((error: unknown) => {
        setErrors({ form: error instanceof Error ? error.message : "Could not complete Google sign-in." });
      })
      .finally(() => setIsSubmitting(false));
  }, [completeGoogleLogin, googleError, googleStatus]);

  function validate(): boolean {
    const nextErrors: LoginErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return; // Guard against accidental double submit

    setSuccessMessage("");
    setErrors({});

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const role = await login(email, password);
      setSuccessMessage("Sign-in successful! Redirecting to your workspace…");
      setTimeout(() => {
        const roleHome = role === "ADMIN" ? "/admin" : role === "SELLER" ? "/seller" : "/dashboard";
        router.replace(rawNext && rawNext !== "/dashboard" ? redirectTo : roleHome);
      }, 800);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please verify your credentials.";
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  // While auth is hydrating, show nothing (avoids flash before redirect)
  if (isLoading) return null;

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-brand-wrap">
          <Link href="/" className="auth-brand">
            <span className="auth-brand-icon">
              <Sun size={22} aria-hidden="true" />
            </span>
            <span className="auth-brand-name">SolarScope</span>
          </Link>
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">
          Sign in to access your solar planning workspace and projects.
        </p>

        {successMessage && (
          <div
            className="auth-message auth-message--success"
            role="status"
            aria-live="polite"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {errors.form && (
          <div
            className="auth-message auth-message--error"
            role="alert"
            aria-live="polite"
          >
            <span>{errors.form}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <AuthInput
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            required
            autoComplete="email"
            disabled={isSubmitting}
            error={errors.email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email || errors.form) {
                setErrors((prev) => ({
                  ...prev,
                  email: undefined,
                  form: undefined,
                }));
              }
            }}
          />

          <AuthInput
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            required
            autoComplete="current-password"
            disabled={isSubmitting}
            error={errors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password || errors.form) {
                setErrors((prev) => ({
                  ...prev,
                  password: undefined,
                  form: undefined,
                }));
              }
            }}
          />

          <div className="auth-row-options">
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                className="auth-checkbox"
                checked={rememberMe}
                disabled={isSubmitting}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <Link href="/forgot-password" className="auth-forgot-link">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="auth-spinner" aria-hidden="true" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="auth-divider" aria-label="or">
          <span />
          <span className="auth-divider-label">OR</span>
          <span />
        </div>

        <Link
          href="/api/auth/google/start"
          className="auth-google-btn"
          aria-disabled={isSubmitting}
          onClick={(event) => {
            if (isSubmitting) event.preventDefault();
            else { setErrors({}); setSuccessMessage(""); }
          }}
        >
          <span className="auth-google-mark" aria-hidden="true">G</span>
          <span>Sign in with Google</span>
        </Link>

        <p className="auth-footer-switch">
          Don&apos;t have an account?
          <Link href="/register" className="auth-footer-link">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
