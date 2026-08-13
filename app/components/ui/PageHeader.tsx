import type { ReactNode } from "react";
import { Plus } from "@phosphor-icons/react";
import Link from "next/link";
import Button from "./Button";

export default function PageHeader({
  title,
  description,
  period,
  toolbar,
  primaryAction,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  period?: ReactNode;
  toolbar?: ReactNode;
  primaryAction?: { label: string; href?: string; onClick?: () => void; icon?: ReactNode };
  className?: string;
}) {
  return (
    <header className={["flex flex-wrap items-end justify-between gap-3", className].join(" ")}>
      <div className="min-w-0">
        <h1 className="font-tabular text-[22px] font-semibold leading-tight tracking-tight text-ink">
          {title}
        </h1>
        <div className="mt-1 flex items-center gap-2 text-[12.5px] text-ink-faint">
          {description && <span>{description}</span>}
          {period && (
            <span className="inline-flex items-center rounded-md bg-surface-soft px-2 py-0.5 font-medium text-ink-muted">
              {period}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {toolbar}
        {primaryAction &&
          (primaryAction.href ? (
            <Link href={primaryAction.href}>
              <Button variant="primary" iconLeft={primaryAction.icon ?? <Plus size={16} weight="bold" />}>
                {primaryAction.label}
              </Button>
            </Link>
          ) : (
            <Button variant="primary" onClick={primaryAction.onClick} iconLeft={primaryAction.icon ?? <Plus size={16} weight="bold" />}>
              {primaryAction.label}
            </Button>
          ))}
      </div>
    </header>
  );
}
