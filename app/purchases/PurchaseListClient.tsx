"use client";

import { useState } from "react";

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

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, totalCost: Number(form.totalCost || 0) }),
    });
    if (res.ok) {
      const created = await res.json();
      setPurchases((list) => [{ ...created, _count: { books: 0 }, books: [] }, ...list]);
      setForm({ date: new Date().toISOString().slice(0, 10), supplier: "", totalCost: "" });
    }
  }

  return (
    <div className="space-y-4">
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
          </div>
        ))}
      </div>
    </div>
  );
}