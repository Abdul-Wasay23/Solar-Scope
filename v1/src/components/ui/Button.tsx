import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Button.css";

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
};

export default function Button({
  variant = "primary",
  loading = false,
  disabled = false,
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [
    "ss-button",
    `ss-button--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
