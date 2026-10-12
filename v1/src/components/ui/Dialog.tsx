"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import "./Dialog.css";

export type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
}: DialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    }

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ss-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="ss-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ss-dialog-header">
          <div>
            <h3 id="dialog-title" className="ss-dialog-title">
              {title}
            </h3>
            {description && (
              <p className="ss-dialog-description">{description}</p>
            )}
          </div>
          <button
            type="button"
            className="ss-dialog-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="ss-dialog-body">{children}</div>

        {footer && <div className="ss-dialog-footer">{footer}</div>}
      </div>
    </div>
  );
}
