import { useId, type KeyboardEvent, type ClipboardEvent } from "react";
import type { InputHTMLAttributes } from "react";
import "./Input.css";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  helperText?: string;
  allowNegative?: boolean;
};

export default function Input({
  label,
  error,
  helperText,
  id,
  required = false,
  className = "",
  type,
  min,
  step,
  onKeyDown,
  onPaste,
  allowNegative,
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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (type === "number") {
      // Always block scientific notation and plus sign
      if (e.key === "e" || e.key === "E" || e.key === "+") {
        e.preventDefault();
        return;
      }

      // Block minus sign if min is >= 0 or allowNegative is explicitly false
      const disallowNegative =
        allowNegative === false ||
        (allowNegative === undefined && min !== undefined && Number(min) >= 0);

      if (e.key === "-" && disallowNegative) {
        e.preventDefault();
        return;
      }

      // Block decimal dot if step is integer "1"
      if (e.key === "." && step === "1") {
        e.preventDefault();
        return;
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (type === "number") {
      const text = e.clipboardData.getData("text");
      // If paste contains letters or invalid characters, prevent paste or let sanitizers handle
      const disallowNegative =
        allowNegative === false ||
        (allowNegative === undefined && min !== undefined && Number(min) >= 0);

      const invalidChars = disallowNegative ? /[^0-9.]/ : /[^0-9.-]/;
      if (invalidChars.test(text)) {
        e.preventDefault();
        const cleaned = text.replace(invalidChars, "");
        if (cleaned) {
          document.execCommand("insertText", false, cleaned);
        }
        return;
      }
    }

    if (onPaste) {
      onPaste(e);
    }
  };

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
        type={type}
        min={min}
        step={step}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
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
