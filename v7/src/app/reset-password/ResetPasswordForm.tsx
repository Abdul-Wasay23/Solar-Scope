"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sun, ArrowRight, CheckCircle2, AlertCircle, Lock, Mail, ArrowLeft } from "lucide-react";
import AuthInput from "@/components/ui/AuthInput";
import "@/styles/auth.css";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountName, setAccountName] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setIsLoadingToken(false);
      setTokenError("No password reset token was provided. Please request a new link.");
      return;
    }

    async function checkToken() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setTokenError(
            data.message || "This password reset link is invalid or has expired. Please request a new one."
          );
        } else {
          setAccountEmail(data.email || "");
          setAccountName(data.fullName || "");
        }
      } catch (err) {
        console.error("Token verification error:", err);
        setTokenError("Failed to verify reset token. Please check your network connection.");
      } finally {
        setIsLoadingToken(false);
      }
    }

    checkToken();
  }, [token]);

  function validate(): boolean {
    const nextErrors: { password?: string; confirm?: string } = {};

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters long.";
    }

    if (!confirmPassword) {
      nextErrors.confirm = "Please confirm your new password.";
    } else if (password !== confirmPassword) {
      nextErrors.confirm = "Passwords do not match.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting || isLoadingToken || tokenError) return;

    setFormError("");
    setSuccessMessage("");

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.message || "Failed to reset password. Please try again.");
        return;
      }

      setSuccessMessage("Your password has been successfully reset! Redirecting to sign in…");

      // Auto redirect to login after brief delay
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      console.error("Reset password submit error:", err);
      setFormError("An unexpected error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  }

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

        <h1 className="auth-title">Create New Password</h1>
        <p className="auth-subtitle">
          Enter a secure password for your SolarScope account.
        </p>

        {/* Loading Token State */}
        {isLoadingToken && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <span className="auth-spinner" style={{ width: "28px", height: "28px" }} />
            <p style={{ marginTop: "12px", fontSize: "14px", color: "var(--color-text-muted)" }}>
              Verifying reset token…
            </p>
          </div>
        )}

        {/* Token Error State */}
        {!isLoadingToken && tokenError && (
          <div>
            <div
              className="auth-message auth-message--error"
              role="alert"
              aria-live="polite"
              style={{ marginBottom: "20px" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
                <div>
                  <p style={{ fontWeight: 600, margin: "0 0 4px" }}>Link Expired or Invalid</p>
                  <p style={{ margin: 0 }}>{tokenError}</p>
                </div>
              </div>
            </div>

            <Link
              href="/forgot-password"
              className="auth-submit-btn"
              style={{ textDecoration: "none" }}
            >
              <span>Request New Reset Link</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>

            <p className="auth-footer-switch">
              <Link href="/login" className="auth-footer-link" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </p>
          </div>
        )}

        {/* Success State */}
        {!isLoadingToken && !tokenError && successMessage && (
          <div>
            <div
              className="auth-message auth-message--success"
              role="status"
              aria-live="polite"
              style={{ marginBottom: "20px" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
                <div>
                  <p style={{ fontWeight: 600, margin: "0 0 4px" }}>Password Updated!</p>
                  <p style={{ margin: 0 }}>{successMessage}</p>
                </div>
              </div>
            </div>

            <Link
              href="/login"
              className="auth-submit-btn"
              style={{ textDecoration: "none" }}
            >
              <span>Sign In Now</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* Password Reset Form */}
        {!isLoadingToken && !tokenError && !successMessage && (
          <>
            {accountEmail && (
              <div style={{ textAlign: "center" }}>
                <div className="auth-email-badge">
                  <Mail size={14} />
                  <span>{accountEmail}</span>
                </div>
              </div>
            )}

            {formError && (
              <div
                className="auth-message auth-message--error"
                role="alert"
                aria-live="polite"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <AuthInput
                label="New Password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                required
                autoComplete="new-password"
                disabled={isSubmitting}
                error={fieldErrors.password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password || formError) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    setFormError("");
                  }
                }}
              />

              <AuthInput
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                required
                autoComplete="new-password"
                disabled={isSubmitting}
                error={fieldErrors.confirm}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirm || formError) {
                    setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
                    setFormError("");
                  }
                }}
              />

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" />
                    <span>Updating Password…</span>
                  </>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <p className="auth-footer-switch">
              Remember your password?
              <Link href="/login" className="auth-footer-link">
                Back to Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

