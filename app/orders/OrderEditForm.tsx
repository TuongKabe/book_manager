"use client";

import { useState } from "react";
import EditModal from "@/app/components/EditModal";
import { toDateInputValue } from "@/lib/date";

type OrderRow = { id: string; date: Date | string; channel: string | null; totalVnd: number | null; note: string | null };

export default function OrderEditForm({
  order,
  onClose,
  onSaved,
}: {
  order: OrderRow;
  onClose: () => void;
  onSaved: (updated: OrderRow) => void;
}) {
  const [form, setForm] = useState({
    date: toDateInputValue(order.date),
    channel: order.channel ?? "",
    totalVnd: order.totalVnd ?? "",
    note: order.note ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date,
        channel: form.channel || null,
        totalVnd: form.totalVnd ? Number(form.totalVnd) : null,
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
    <EditModal title="Sửa đơn" onClose={onClose} onSave={save} saving={saving}>
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
      <label className="flex flex-col text-sm">
        Ngày
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Kênh
        <input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} placeholder="Chợ Tốt / Shopee /..." className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Tổng thu (đ)
        <input type="number" value={form.totalVnd} onChange={(e) => setForm({ ...form, totalVnd: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Ghi chú
        <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
    </EditModal>
  );
}