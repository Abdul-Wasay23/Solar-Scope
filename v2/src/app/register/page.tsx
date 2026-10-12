"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sun, ArrowRight, CheckCircle2 } from "lucide-react";
import AuthInput from "@/components/ui/AuthInput";
import { useAuth } from "@/hooks/useAuth";
import "@/styles/auth.css";

type RegisterErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  form?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect already-authenticated users away from the register page
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  function validate(): boolean {
    const nextErrors: RegisterErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters long.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (!agreeTerms) {
      nextErrors.terms = "You must agree to the Terms of Service to continue.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return; // Guard against duplicate submissions

    setSuccessMessage("");
    setErrors({});

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register(fullName, email, password);
      setSuccessMessage("Account created successfully! Redirecting to dashboard…");
      setTimeout(() => {
        router.replace("/dashboard");
      }, 800);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Registration failed. Please check your information and try again.";
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

        <h1 className="auth-title">Create an Account</h1>
        <p className="auth-subtitle">
          Start designing solar rooftop systems and calculating energy returns.
        </p>

        {/* Demo Mode Notice */}
        <div className="auth-demo-badge" role="note">
          <span>Demo Authentication — Frontend Simulation</span>
        </div>

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

        {/* Register Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <AuthInput
            label="Full Name"
            type="text"
            placeholder="e.g. Abdul Wasay"
            value={fullName}
            required
            autoComplete="name"
            disabled={isSubmitting}
            error={errors.fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName || errors.form) {
                setErrors((prev) => ({
                  ...prev,
                  fullName: undefined,
                  form: undefined,
                }));
              }
            }}
          />

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
            placeholder="Minimum 8 characters"
            value={password}
            required
            autoComplete="new-password"
            disabled={isSubmitting}
            error={errors.password}
            helperText="At least 8 characters with letters & numbers"
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

          <AuthInput
            label="Confirm Password"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            required
            autoComplete="new-password"
            disabled={isSubmitting}
            error={errors.confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword || errors.form) {
                setErrors((prev) => ({
                  ...prev,
                  confirmPassword: undefined,
                  form: undefined,
                }));
              }
            }}
          />

          <div>
            <label className="auth-checkbox-label" htmlFor="agree-terms">
              <input
                id="agree-terms"
                type="checkbox"
                className="auth-checkbox"
                checked={agreeTerms}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.terms)}
                aria-describedby={errors.terms ? "terms-error" : undefined}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (errors.terms || errors.form) {
                    setErrors((prev) => ({
                      ...prev,
                      terms: undefined,
                      form: undefined,
                    }));
                  }
                }}
              />
              <span style={{ fontSize: "13px" }}>
                I agree to the{" "}
                <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                  Terms of Service
                </span>{" "}
                and Privacy Policy
              </span>
            </label>
            {errors.terms && (
              <p
                id="terms-error"
                className="ss-auth-input-error"
                role="alert"
                aria-live="polite"
              >
                {errors.terms}
              </p>
            )}
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
                <span>Creating Account…</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight size={16} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <p className="auth-footer-switch">
          Already have an account?
          <Link href="/login" className="auth-footer-link">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
