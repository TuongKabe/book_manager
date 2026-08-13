import type { ReactNode } from "react";
import { CheckCircle, WarningCircle, Info, XCircle } from "@phosphor-icons/react";

type Tone = "info" | "success" | "warning" | "danger";

const toneClass: Record<Tone, { wrap: string; icon: ReactNode; iconColor: string }> = {
  info: {
    wrap: "bg-info-soft text-info border-transparent",
    icon: <Info size={16} weight="fill" />,
    iconColor: "text-info",
  },
  success: {
    wrap: "bg-success-soft text-success border-transparent",
    icon: <CheckCircle size={16} weight="fill" />,
    iconColor: "text-success",
  },
  warning: {
    wrap: "bg-warning-soft text-warning border-transparent",
    icon: <WarningCircle size={16} weight="fill" />,
    iconColor: "text-warning",
  },
  danger: {
    wrap: "bg-danger-soft text-danger border-transparent",
    icon: <XCircle size={16} weight="fill" />,
    iconColor: "text-danger",
  },
};

export default function Banner({
  tone = "info",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  const t = toneClass[tone];
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : undefined}
      className={[
        "flex items-start gap-2.5 rounded-md border px-3 py-2 text-[13px]",
        t.wrap,
        className,
      ].join(" ")}
    >
      <span className={["mt-0.5 shrink-0", t.iconColor].join(" ")}>{t.icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
