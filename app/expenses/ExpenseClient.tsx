"use client";

import { useState } from "react";

type ExpenseRow = { id: string; date: Date | string; category: string; amountVnd: number; note: string | null };

const CATEGORIES = ["Vận chuyển", "Đóng gói", "Phí nền tảng", "Khác"];

export default function ExpenseClient({ initialExpenses }: { initialExpenses: ExpenseRow[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: "Vận chuyển", amountVnd: "" });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amountVnd: Number(form.amountVnd || 0) }),
    });
    if (res.ok) {
      const created = await res.json();
      setExpenses((list) => [created, ...list]);
      setForm({ date: new Date().toISOString().slice(0, 10), category: "Vận chuyển", amountVnd: "" });
    }
  }

  async function remove(x: ExpenseRow) {
    if (!confirm("Xóa chi phí?")) return;
    await fetch(`/api/expenses/${x.id}`, { method: "DELETE" });
    setExpenses((list) => list.filter((e) => e.id !== x.id));
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4">
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
        <button className="rounded bg-blue-600 px-4 py-2 text-white">Thêm</button>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr><th className="px-3 py-2">Ngày</th><th className="px-3 py-2">Loại</th><th className="px-3 py-2">Số tiền</th><th /></tr>
          </thead>
          <tbody>
            {expenses.map((x) => (
              <tr key={x.id} className="border-t">
                <td className="px-3 py-2">{new Date(x.date).toLocaleDateString("vi-VN")}</td>
                <td className="px-3 py-2">{x.category}</td>
                <td className="px-3 py-2">{x.amountVnd.toLocaleString("vi-VN")}đ</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => remove(x)} className="rounded bg-red-100 px-2 py-1 text-red-700">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}