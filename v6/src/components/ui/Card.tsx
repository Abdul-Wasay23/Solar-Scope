import type { HTMLAttributes, ReactNode } from "react";
import "./Card.css";

export type CardProps = HTMLAttributes<HTMLElement> & {
  title?: string;
  description?: string;
  children: ReactNode;
  headerAction?: ReactNode;
};

export default function Card({
  title,
  description,
  children,
  headerAction,
  className = "",
  ...props
}: CardProps) {
  const classes = ["ss-card", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} {...props}>
      {(title || description || headerAction) && (
        <div className="ss-card-header">
          <div className="ss-card-header-text">
            {title && <h3 className="ss-card-title">{title}</h3>}
            {description && (
              <p className="ss-card-description">{description}</p>
            )}
          </div>
          {headerAction && <div className="ss-card-action">{headerAction}</div>}
        </div>
      )}

      <div className="ss-card-content">{children}</div>
    </section>
  );
}
