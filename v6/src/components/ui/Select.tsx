import { useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import "./Select.css";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  placeholder?: string;
};

export default function Select({
  label,
  options,
  error,
  helperText,
  placeholder,
  id,
  required = false,
  className = "",
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;

  const classes = [
    "ss-select",
    error ? "ss-select--error" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="ss-select-group">
      <label className="ss-select-label" htmlFor={selectId}>
        {label}
        {required && (
          <span className="ss-select-required" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>

      <div className="ss-select-wrapper">
        <select
          id={selectId}
          className={classes}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <span className="ss-select-chevron" aria-hidden="true">
          <ChevronDown size={18} />
        </span>
      </div>

      {error ? (
        <p id={errorId} className="ss-select-error" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="ss-select-helper">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
