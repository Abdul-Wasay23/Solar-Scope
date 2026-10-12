import { useId } from "react";
import type { InputHTMLAttributes } from "react";
import "./Input.css";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  helperText?: string;
};

export default function Input({
  label,
  error,
  helperText,
  id,
  required = false,
  className = "",
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const classes = [
    "ss-input",
    error ? "ss-input--error" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="ss-input-group">
      <label className="ss-input-label" htmlFor={inputId}>
        {label}
        {required && (
          <span className="ss-input-required" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>

      <input
        id={inputId}
        className={classes}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        {...props}
      />

      {error ? (
        <p id={errorId} className="ss-input-error" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="ss-input-helper">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
