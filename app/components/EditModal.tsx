"use client";

import type { ReactNode } from "react";

export default function EditModal({
  title,
  onClose,
  onSave,
  saving = false,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-auto rounded-xl bg-white p-5">
        <h2 className="text-lg font-bold">{title}</h2>
        {children}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded bg-slate-200 px-4 py-2">Hủy</button>
          <button onClick={onSave} disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white">
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}