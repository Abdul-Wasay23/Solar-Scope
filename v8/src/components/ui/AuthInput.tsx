"use client";

import { useId, useState, forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./AuthInput.css";

export type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  helperText?: string;
  allowTogglePassword?: boolean;
};

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  (
    {
      label,
      error,
      helperText,
      type = "text",
      allowTogglePassword = true,
      id,
      required = false,
      className = "",
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const isPasswordType = type === "password";
    const [showPassword, setShowPassword] = useState(false);

    const actualType = isPasswordType
      ? showPassword
        ? "text"
        : "password"
      : type;

    const classes = [
      "ss-auth-input",
      error ? "ss-auth-input--error" : "",
      isPasswordType && allowTogglePassword ? "ss-auth-input--has-toggle" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const describedBy = [
      error ? errorId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

    return (
      <div className="ss-auth-input-group">
        <label className="ss-auth-input-label" htmlFor={inputId}>
          {label}
          {required && (
            <span className="ss-auth-input-required" aria-hidden="true">
              {" "}*
            </span>
          )}
        </label>

        <div className="ss-auth-input-wrapper">
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            className={classes}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            {...props}
          />

          {isPasswordType && allowTogglePassword && (
            <button
              type="button"
              className="ss-auth-toggle-pwd"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={props.disabled}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              title={showPassword ? "Hide password" : "Show password"}
              tabIndex={0}
            >
              {showPassword ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {error ? (
          <p
            id={errorId}
            className="ss-auth-input-error"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="ss-auth-input-helper">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

AuthInput.displayName = "AuthInput";

export default AuthInput;
