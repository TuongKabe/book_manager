"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { CaretDown, CalendarBlank } from "@phosphor-icons/react";
import Button from "./ui/Button";

const PRESETS: { value: string; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "today", label: "Hôm nay" },
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "year", label: "Năm nay" },
  { value: "custom", label: "Tùy chỉnh…" },
];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const [preset, setPreset] = useState<string>(!from && !to ? "all" : "custom");
  const [open, setOpen] = useState(false);

  function updateUrl(newFrom: string, newTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newFrom) params.set("from", newFrom);
    else params.delete("from");
    if (newTo) params.set("to", newTo);
    else params.delete("to");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function applyPreset(p: string) {
    setPreset(p);
    setOpen(false);
    const now = new Date();
    const todayStr = isoDate(now);

    if (p === "all") {
      updateUrl("", "");
      return;
    }
    if (p === "today") {
      updateUrl(todayStr, todayStr);
      return;
    }
    if (p === "week") {
      const dow = now.getDay();
      const mondayOffset = dow === 0 ? 6 : dow - 1;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
      updateUrl(isoDate(monday), todayStr);
      return;
    }
    if (p === "month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      updateUrl(isoDate(first), todayStr);
      return;
    }
    if (p === "year") {
      const first = new Date(now.getFullYear(), 0, 1);
      updateUrl(isoDate(first), todayStr);
      return;
    }
  }

  const currentLabel = PRESETS.find((p) => p.value === preset)?.label ?? "Tùy chỉnh";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          iconLeft={<CalendarBlank size={12} weight="bold" className="text-brand" />}
          iconRight={<CaretDown size={12} weight="bold" className={open ? "rotate-180" : ""} />}
        >
          {currentLabel}
        </Button>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden />
            <div className="absolute right-0 top-[calc(100%+4px)] z-30 w-44 rounded-lg border border-hairline bg-surface p-1 shadow-popover">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => applyPreset(p.value)}
                  className={[
                    "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors",
                    preset === p.value
                      ? "bg-brand-soft text-brand"
                      : "text-ink hover:bg-surface-soft",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {preset === "custom" && (
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={from}
            onChange={(e) => updateUrl(e.target.value, to)}
            className="h-8 rounded-md border border-hairline-strong bg-surface px-2 text-[13px] text-ink transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
          />
          <span className="text-ink-faint">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => updateUrl(from, e.target.value)}
            className="h-8 rounded-md border border-hairline-strong bg-surface px-2 text-[13px] text-ink transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
