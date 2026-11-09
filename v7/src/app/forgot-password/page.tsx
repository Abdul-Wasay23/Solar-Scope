"use client";

import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { Sun, ArrowRight, CheckCircle2, AlertCircle, User, Mail } from "lucide-react";
import AuthInput from "@/components/ui/AuthInput";
import "@/styles/auth.css";

type Suggestion = {
  email: string;
  fullName: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autocomplete / suggestion states
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpenSuggestions, setIsOpenSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search for registered accounts as user types
  useEffect(() => {
    const trimmed = email.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setIsOpenSuggestions(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/forgot-password/suggest?q=${encodeURIComponent(trimmed)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
            setIsOpenSuggestions(true);
            setActiveIndex(-1);
          } else {
            setSuggestions([]);
            setIsOpenSuggestions(false);
          }
        }
      } catch (err) {
        console.error("Failed to load suggestions:", err);
      }
    }, 150);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [email]);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpenSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleSelectSuggestion(item: Suggestion) {
    setEmail(item.email);
    setSuggestions([]);
    setIsOpenSuggestions(false);
    setActiveIndex(-1);
    if (error) setError("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpenSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpenSuggestions(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setSuccessMessage("");
    setIsOpenSuggestions(false);

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Email address is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Requirement 2: "Account not found. Please enter your registered email address."
        setError(
          data.message ||
            "Account not found. Please enter your registered email address."
        );
        return;
      }

      setSuccessMessage(
        data.message ||
          `Password reset instructions have been sent to ${normalizedEmail}. Please check your inbox.`
      );
    } catch (err) {
      console.error("Forgot password submit error:", err);
      setError("Failed to send reset link. Please check your network and try again.");
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

        <h1 className="auth-title">Forgot Password</h1>
        <p className="auth-subtitle">
          Enter your registered email address to receive password reset instructions.
        </p>

        {/* Success Alert */}
        {successMessage && (
          <div
            className="auth-message auth-message--success"
            role="status"
            aria-live="polite"
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
              <div>
                <p style={{ fontWeight: 600, margin: "0 0 4px" }}>Email Sent!</p>
                <p style={{ margin: 0 }}>{successMessage}</p>
                <p style={{ fontSize: "12px", marginTop: "6px", opacity: 0.9 }}>
                  The recovery link is valid for 60 minutes. If you don&apos;t see the email, please check your spam folder.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            className="auth-message auth-message--error"
            role="alert"
            aria-live="polite"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-autocomplete-wrapper" ref={dropdownRef}>
            <AuthInput
              label="Registered Email Address"
              type="email"
              placeholder="e.g. info.solarscope@gmail.com"
              value={email}
              required
              autoComplete="off"
              disabled={isSubmitting}
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
                if (successMessage) setSuccessMessage("");
              }}
              onFocus={() => {
                if (suggestions.length > 0) setIsOpenSuggestions(true);
              }}
            />

            {/* Suggestions dropdown displaying matching accounts and account holder names */}
            {isOpenSuggestions && suggestions.length > 0 && (
              <div className="auth-suggestions-dropdown" role="listbox">
                <div className="auth-suggestions-header">Matching Registered Accounts</div>
                {suggestions.map((item, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={item.email}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`auth-suggestion-btn ${isActive ? "auth-suggestion-btn--active" : ""}`}
                      onClick={() => handleSelectSuggestion(item)}
                    >
                      <span className="auth-suggestion-avatar">
                        <User size={16} />
                      </span>
                      <span className="auth-suggestion-info">
                        <span className="auth-suggestion-name">{item.fullName}</span>
                        <span className="auth-suggestion-email">{item.email}</span>
                      </span>
                      <span className="auth-suggestion-badge">Select</span>
                    </button>
                  );
                })}
              </div>
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
                <span>Sending Recovery Link…</span>
              </>
            ) : (
              <>
                <span>Send Reset Link</span>
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
      </div>
    </div>
  );
}
