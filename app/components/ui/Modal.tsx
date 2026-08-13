"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { X } from "@phosphor-icons/react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-3xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: Props) {
  // Close on ESC + lock body scroll
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Scrim with subtle warm tint */}
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={[
          "relative z-10 w-full overflow-hidden rounded-xl bg-surface shadow-popover",
          "border border-hairline",
          sizeClass[size],
          "transition-all",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[12.5px] text-ink-faint">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="-mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-soft hover:text-ink"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-5 pb-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-hairline bg-surface-soft px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
