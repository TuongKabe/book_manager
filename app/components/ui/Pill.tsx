import type { ReactNode } from "react";

type Tone =
  | "neutral"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "brand"
  | "intake"
  | "listed"
  | "sold";

const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-soft text-ink-muted border-hairline",
  success: "bg-success-soft text-success border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  info: "bg-info-soft text-info border-transparent",
  brand: "bg-brand-soft text-brand border-transparent",
  intake: "bg-surface-soft text-ink-muted border-hairline",
  listed: "bg-info-soft text-info border-transparent",
  sold: "bg-success-soft text-success border-transparent",
};

export default function Pill({
  children,
  tone = "neutral",
  size = "md",
  icon,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  size?: "sm" | "md";
  icon?: ReactNode;
  className?: string;
}) {
  const sizeClass = size === "sm" ? "h-5 px-1.5 text-[10.5px] gap-1" : "h-6 px-2 text-[12px] gap-1.5";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border font-medium tracking-tight",
        sizeClass,
        toneClass[tone],
        className,
      ].join(" ")}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
