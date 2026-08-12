"use client";

import { useState } from "react";
import EditModal from "@/app/components/EditModal";
import { toDateInputValue } from "@/lib/date";

type PurchaseRow = {
  id: string;
  date: Date | string;
  supplier: string;
  totalCost: number;
  note: string | null;
  _count: { books: number };
  books: { id: string; title: string; isbn: string | null; coverPhotoUrl: string | null; status: string }[];
};

export default function PurchaseEditForm({
  purchase,
  onClose,
  onSaved,
}: {
  purchase: PurchaseRow;
  onClose: () => void;
  onSaved: (updated: PurchaseRow) => void;
}) {
  const [form, setForm] = useState({
    date: toDateInputValue(purchase.date),
    supplier: purchase.supplier,
    totalCost: String(purchase.totalCost ?? ""),
    note: purchase.note ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/purchases/${purchase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date,
        supplier: form.supplier,
        totalCost: form.totalCost ? Number(form.totalCost) : 0,
        note: form.note || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      onSaved({ ...updated, _count: purchase._count, books: purchase.books });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  return (
    <EditModal title="Sửa lô nhập" onClose={onClose} onSave={save} saving={saving}>
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
      <label className="flex flex-col text-sm">
        Ngày
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Nhà cung cấp
        <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} required className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Tổng chi (đ)
        <input type="number" value={form.totalCost} onChange={(e) => setForm({ ...form, totalCost: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Ghi chú
        <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
    </EditModal>
  );
}