"use client";

import { useSearchParams } from "next/navigation";

export default function ExportButton({
  path,
  label = "Xuất Excel",
}: {
  path: string;
  label?: string;
}) {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const href = qs ? `${path}?${qs}` : path;
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-1 rounded border border-green-600 bg-white px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
    >
      <span>📥</span>
      {label}
    </a>
  );
}
