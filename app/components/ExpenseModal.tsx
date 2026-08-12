"use client";

import { useState } from "react";
import { toDateInputValue } from "@/lib/date";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

type InitialExpense = {
  id: string;
  date: Date | string;
  category: string;
  amountVnd: number;
  note: string | null;
};

export default function ExpenseModal({
  isOpen,
  onClose,
  onSaved,
  initialExpense,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (expense: { id: string; date: Date | string; category: string; amountVnd: number; note: string | null }) => void;
  initialExpense?: InitialExpense;
}) {
  const isEdit = !!initialExpense;

  const [form, setForm] = useState(() => ({
    date: initialExpense ? toDateInputValue(initialExpense.date) : new Date().toISOString().slice(0, 10),
    category: initialExpense?.category ?? EXPENSE_CATEGORIES[0],
    amountVnd: initialExpense ? String(initialExpense.amountVnd ?? "") : "",
    note: initialExpense?.note ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!form.amountVnd || Number(form.amountVnd) <= 0) {
      setError("Nhập số tiền");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (isEdit && initialExpense) {
        const res = await fetch(`/api/expenses/${initialExpense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: form.date,
            category: form.category,
            amountVnd: Number(form.amountVnd),
            note: form.note || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Lỗi cập nhật");
          setSaving(false);
          return;
        }
        const updated = await res.json();
        onSaved({ ...updated, date: updated.date });
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: form.date,
            category: form.category,
            amountVnd: Number(form.amountVnd),
            note: form.note || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Có lỗi xảy ra");
          setSaving(false);
          return;
        }
        const created = await res.json();
        onSaved({ ...created, date: created.date });
      }
      resetAndClose();
    } catch {
      setError("Lỗi kết nối — thử lại");
    }
    setSaving(false);
  }

  function resetAndClose() {
    setForm({ date: new Date().toISOString().slice(0, 10), category: EXPENSE_CATEGORIES[0], amountVnd: "", note: "" });
    setError("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{isEdit ? "Sửa chi phí" : "Thêm chi phí"}</h2>
          <button onClick={resetAndClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
        </div>

        {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="space-y-2">
          <label className="block text-sm">
            Ngày *
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm">
            Loại *
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            Số tiền (đ) *
            <input type="number" value={form.amountVnd} onChange={(e) => setForm({ ...form, amountVnd: e.target.value })} required className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm">
            Ghi chú
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <button onClick={resetAndClose} className="rounded bg-slate-200 px-4 py-2">Hủy</button>
          <button onClick={handleSave} disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
            {saving ? "Đang lưu..." : isEdit ? "Cập nhật" : "Thêm"}
          </button>
        </div>
      </div>
    </div>
  );
}