"use client";

import { useState } from "react";
import PurchaseEditForm from "./PurchaseEditForm";

type PurchaseRow = {
  id: string;
  date: Date | string;
  supplier: string;
  totalCost: number;
  note: string | null;
  _count: { books: number };
  books: { id: string; title: string }[];
};

export default function PurchaseListClient({ initialPurchases }: { initialPurchases: PurchaseRow[] }) {
  const [purchases, setPurchases] = useState(initialPurchases);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), supplier: "", totalCost: "" });
  const [editing, setEditing] = useState<PurchaseRow | null>(null);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, totalCost: Number(form.totalCost || 0) }),
    });
    if (res.ok) {
      const created = await res.json();
      setPurchases((list) => [{ ...created, _count: { books: 0 }, books: [] }, ...list]);
      setForm({ date: new Date().toISOString().slice(0, 10), supplier: "", totalCost: "" });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  async function remove(p: PurchaseRow) {
    if (!confirm(`Xóa lô "${p.supplier}"?`)) return;
    const res = await fetch(`/api/purchases/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      setPurchases((list) => list.filter((x) => x.id !== p.id));
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
        <label className="flex flex-1 flex-col text-sm">
          Nhà cung cấp
          <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} required className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">
          Tổng chi (đ)
          <input type="number" value={form.totalCost} onChange={(e) => setForm({ ...form, totalCost: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <button className="rounded bg-blue-600 px-4 py-2 text-white">Thêm lô</button>
      </form>

      {purchases.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-400">
          Chưa có lô nhập — tạo lô bên trên
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {purchases.map((p) => (
            <div key={p.id} className="rounded-xl border bg-white p-4">
              <div className="flex justify-between">
                <p className="font-semibold">{p.supplier}</p>
                <span className="text-sm text-slate-500">{new Date(p.date).toLocaleDateString("vi-VN")}</span>
              </div>
              <p className="mt-1 text-sm">Tổng chi: {p.totalCost.toLocaleString("vi-VN")}đ</p>
              <p className="text-sm text-slate-500">{p._count.books} cuốn</p>
              {p.books.length > 0 && (
                <ul className="mt-2 max-h-24 overflow-auto border-t pt-2 text-xs text-slate-600">
                  {p.books.map((b) => <li key={b.id}>{b.title}</li>)}
                </ul>
              )}
              <div className="mt-2 flex gap-2">
                <button onClick={() => setEditing(p)} className="rounded bg-slate-100 px-3 py-1 text-sm">Sửa</button>
                <button onClick={() => remove(p)} className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <PurchaseEditForm
          purchase={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setPurchases((list) => list.map((x) => (x.id === updated.id ? updated : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}