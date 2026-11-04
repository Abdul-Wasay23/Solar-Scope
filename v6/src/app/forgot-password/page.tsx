"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Sun, ArrowRight, CheckCircle2 } from "lucide-react";
import AuthInput from "@/components/ui/AuthInput";
import "@/styles/auth.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Email address is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setMessage(
      "If an account exists with this email, recovery instructions have been sent (Demo Mode)."
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand-wrap">
          <Link href="/" className="auth-brand">
            <span className="pub-brand-icon">
              <Sun size={22} />
            </span>
            <span className="auth-brand-name">SolarScope</span>
          </Link>
        </div>

        <h1 className="auth-title">Reset Password</h1>
        <p className="auth-subtitle">
          Enter your email to receive recovery instructions.
        </p>

        {message && (
          <div className="auth-message auth-message--success" role="status">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} />
              <span>{message}</span>
            </div>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <AuthInput
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            required
            autoComplete="email"
            error={error}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
          />

          <button type="submit" className="auth-submit-btn">
            <span>Send Instructions</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <p className="auth-footer-switch">
          Remember your password?
          <Link href="/login" className="auth-footer-link">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
