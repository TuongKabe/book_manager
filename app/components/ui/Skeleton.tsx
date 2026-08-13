import type { ReactNode } from "react";

export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={["animate-pulse rounded-md bg-hairline-strong/60", className].join(" ")}
      aria-hidden
    />
  );
}

export function StatSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-hairline bg-surface px-4 py-3.5">
          <Skeleton className="mb-2 h-3.5 w-20" />
          <Skeleton className="mb-2 h-7 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border border-hairline bg-surface p-5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-60" />
      <div className="space-y-2 pt-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

export function InlineSpinner({ children }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-ink-faint">
      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-hairline-strong border-r-transparent" />
      {children}
    </span>
  );
}
