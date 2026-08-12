"use client";

import { useState } from "react";
import ExpenseEditForm from "./ExpenseEditForm";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

type ExpenseRow = { id: string; date: Date | string; category: string; amountVnd: number; note: string | null };

export default function ExpenseClient({ initialExpenses }: { initialExpenses: ExpenseRow[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: "Vận chuyển", amountVnd: "" });
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amountVnd: Number(form.amountVnd || 0) }),
    });
    if (res.ok) {
      const created = await res.json();
      setExpenses((list) => [created, ...list]);
      setForm({ date: new Date().toISOString().slice(0, 10), category: "Vận chuyển", amountVnd: "" });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
    setSubmitting(false);
  }

  async function remove(x: ExpenseRow) {
    if (!confirm("Xóa chi phí?")) return;
    const res = await fetch(`/api/expenses/${x.id}`, { method: "DELETE" });
    if (res.ok) {
      setExpenses((list) => list.filter((e) => e.id !== x.id));
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
          Loại
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded border border-slate-300 px-3 py-2">
            {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Số tiền (đ)
          <input type="number" value={form.amountVnd} onChange={(e) => setForm({ ...form, amountVnd: e.target.value })} required className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <button disabled={submitting} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{submitting ? "Đang thêm..." : "Thêm"}</button>
      </form>

      {expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-400">
          Chưa có chi phí — thêm bên trên
        </div>
      ) : (
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
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditing(x)} className="rounded bg-slate-100 px-2 py-1 text-slate-700">Sửa</button>
                      <button onClick={() => remove(x)} className="rounded bg-red-100 px-2 py-1 text-red-700">Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ExpenseEditForm
          expense={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setExpenses((list) => list.map((x) => (x.id === updated.id ? updated : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
