import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight } from "@phosphor-icons/react";

type Tone = "neutral" | "success" | "danger" | "warning" | "info" | "brand";

const toneAccent: Record<Tone, string> = {
  neutral: "bg-surface-soft text-ink-muted",
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
};

export default function StatTile({
  label,
  value,
  sub,
  delta,
  icon,
  tone = "neutral",
  className = "",
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  delta?: { value: string; positive?: boolean };
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={[
        "group relative flex flex-col gap-1 rounded-lg border border-hairline bg-surface px-4 py-3.5 transition-colors duration-150 hover:border-hairline-strong",
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-ink-faint">{label}</span>
        {icon && (
          <span className={["inline-flex h-7 w-7 items-center justify-center rounded-md", toneAccent[tone]].join(" ")}>
            {icon}
          </span>
        )}
      </div>
      <div className="font-tabular text-[22px] font-semibold leading-tight tracking-tight text-ink">
        {value}
      </div>
      <div className="flex items-center justify-between gap-2 text-[12px] text-ink-faint">
        <div className="min-w-0 truncate">{sub}</div>
        {delta && (
          <span
            className={[
              "inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 font-medium",
              delta.positive ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            ].join(" ")}
          >
            {delta.positive ? <ArrowUpRight size={12} weight="bold" /> : <ArrowDownRight size={12} weight="bold" />}
            {delta.value}
          </span>
        )}
      </div>
    </div>
  );
}
