"use client";

import { useState } from "react";
import OrderEditForm from "./OrderEditForm";

type OrderRow = { id: string; date: Date | string; channel: string | null; totalVnd: number | null; note: string | null };

export default function OrderClient({ initialOrders }: { initialOrders: OrderRow[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), channel: "", totalVnd: "" });
  const [editing, setEditing] = useState<OrderRow | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, totalVnd: form.totalVnd ? Number(form.totalVnd) : null }),
    });
    if (res.ok) {
      const created = await res.json();
      setOrders((list) => [created, ...list]);
      setForm({ date: new Date().toISOString().slice(0, 10), channel: "", totalVnd: "" });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
    setSubmitting(false);
  }

  async function remove(o: OrderRow) {
    if (!confirm("Xóa đơn?")) return;
    const res = await fetch(`/api/orders/${o.id}`, { method: "DELETE" });
    if (res.ok) {
      setOrders((list) => list.filter((x) => x.id !== o.id));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={create} className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4">
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
        <button disabled={submitting} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{submitting ? "Đang ghi..." : "Ghi đơn"}</button>
      </form>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-400">
          Chưa có đơn hàng — ghi đơn đầu tiên bên trên
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
              <div>
                <p className="font-semibold">{o.channel ?? "Không kênh"}</p>
                <p className="text-sm text-slate-500">{new Date(o.date).toLocaleDateString("vi-VN")}</p>
                {o.totalVnd != null && <p className="mt-1 text-sm">{o.totalVnd.toLocaleString("vi-VN")}đ</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(o)} className="rounded bg-slate-100 px-3 py-1 text-sm">Sửa</button>
                <button onClick={() => remove(o)} className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <OrderEditForm
          order={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setOrders((list) => list.map((x) => (x.id === updated.id ? updated : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}