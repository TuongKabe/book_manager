"use client";

import { useState } from "react";
import EditModal from "@/app/components/EditModal";
import { toDateInputValue } from "@/lib/date";

type ExpenseRow = { id: string; date: Date | string; category: string; amountVnd: number; note: string | null };

const CATEGORIES = ["Vận chuyển", "Đóng gói", "Phí nền tảng", "Khác"];

export default function ExpenseEditForm({
  expense,
  onClose,
  onSaved,
}: {
  expense: ExpenseRow;
  onClose: () => void;
  onSaved: (updated: ExpenseRow) => void;
}) {
  const [form, setForm] = useState({
    date: toDateInputValue(expense.date),
    category: expense.category,
    amountVnd: String(expense.amountVnd ?? ""),
    note: expense.note ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date,
        category: form.category,
        amountVnd: form.amountVnd ? Number(form.amountVnd) : 0,
        note: form.note || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved(await res.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  return (
    <EditModal title="Sửa chi phí" onClose={onClose} onSave={save} saving={saving}>
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
      <label className="flex flex-col text-sm">
        Ngày
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Loại
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded border border-slate-300 px-3 py-2">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label className="flex flex-col text-sm">
        Số tiền (đ)
        <input type="number" value={form.amountVnd} onChange={(e) => setForm({ ...form, amountVnd: e.target.value })} required className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Ghi chú
        <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
    </EditModal>
  );
}
