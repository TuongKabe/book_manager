"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

const PRESETS: { value: string; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "today", label: "Hôm nay" },
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "year", label: "Năm nay" },
  { value: "custom", label: "Tùy chỉnh" },
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

  function updateUrl(newFrom: string, newTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newFrom) params.set("from", newFrom); else params.delete("from");
    if (newTo) params.set("to", newTo); else params.delete("to");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function applyPreset(p: string) {
    setPreset(p);
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={preset} onChange={(e) => applyPreset(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm">
        {PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      {preset === "custom" && (
        <>
          <input type="date" value={from} onChange={(e) => updateUrl(e.target.value, to)} className="rounded border border-slate-300 px-3 py-2 text-sm" />
          <span className="text-slate-400">→</span>
          <input type="date" value={to} onChange={(e) => updateUrl(from, e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm" />
        </>
      )}
    </div>
  );
}