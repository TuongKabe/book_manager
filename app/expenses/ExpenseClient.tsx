"use client";

import { useState, useMemo } from "react";
import ExpenseModal from "@/app/components/ExpenseModal";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

type ExpenseRow = { id: string; date: Date | string; category: string; amountVnd: number; note: string | null };

const SORTS = [
  { value: "dateDesc", label: "Ngày mới nhất" },
  { value: "dateAsc", label: "Ngày cũ nhất" },
  { value: "amountDesc", label: "Tiền cao → thấp" },
  { value: "amountAsc", label: "Tiền thấp → cao" },
  { value: "category", label: "Theo loại" },
] as const;

type SortValue = (typeof SORTS)[number]["value"];

export default function ExpenseClient({ initialExpenses }: { initialExpenses: ExpenseRow[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [modalState, setModalState] = useState<{ mode: "create" } | { mode: "edit"; expense: ExpenseRow } | null>(null);
  const [error, setError] = useState("");

  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(EXPENSE_CATEGORIES));
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortValue>("dateDesc");

  const minNum = minAmount ? Number(minAmount) : null;
  const maxNum = maxAmount ? Number(maxAmount) : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = expenses.filter((x) => {
      if (!selectedCats.has(x.category)) return false;
      if (minNum != null && x.amountVnd < minNum) return false;
      if (maxNum != null && x.amountVnd > maxNum) return false;
      if (q && !(x.note ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
    result.sort((a, b) => {
      switch (sort) {
        case "dateDesc": return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "dateAsc": return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amountDesc": return b.amountVnd - a.amountVnd;
        case "amountAsc": return a.amountVnd - b.amountVnd;
        case "category": return a.category.localeCompare(b.category) || new Date(b.date).getTime() - new Date(a.date).getTime();
        default: return 0;
      }
    });
    return result;
  }, [expenses, selectedCats, minNum, maxNum, search, sort]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, x) => s + x.amountVnd, 0);
    const count = filtered.length;
    const byCategory = new Map<string, number>();
    for (const x of filtered) byCategory.set(x.category, (byCategory.get(x.category) ?? 0) + x.amountVnd);
    return { total, count, byCategory };
  }, [filtered]);

  function toggleCat(c: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });
  }

  function selectAll() { setSelectedCats(new Set(EXPENSE_CATEGORIES)); }
  function clearAll() { setSelectedCats(new Set()); }

  function resetFilters() {
    setSelectedCats(new Set(EXPENSE_CATEGORIES));
    setMinAmount("");
    setMaxAmount("");
    setSearch("");
    setSort("dateDesc");
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

  function handleSaved(saved: { id: string; date: Date | string; category: string; amountVnd: number; note: string | null }) {
    setExpenses((list) => {
      const idx = list.findIndex((x) => x.id === saved.id);
      if (idx >= 0) {
        const updated = [...list];
        updated[idx] = saved as ExpenseRow;
        return updated;
      }
      return [saved as ExpenseRow, ...list];
    });
  }

  const editingExpense = modalState?.mode === "edit" ? modalState.expense : undefined;
  const hasActiveFilter = selectedCats.size !== EXPENSE_CATEGORIES.length || minAmount || maxAmount || search;

  return (
    <div className="space-y-4">
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex justify-end">
        <button onClick={() => setModalState({ mode: "create" })} className="rounded bg-blue-600 px-4 py-2 text-white">+ Thêm chi phí</button>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Bộ lọc</h2>
          {hasActiveFilter && (
            <button onClick={resetFilters} className="text-xs text-blue-600 hover:underline">Đặt lại</button>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs text-slate-500">Danh mục</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={selectAll} className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs hover:bg-slate-100">Tất cả</button>
              <button onClick={clearAll} className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs hover:bg-slate-100">Bỏ chọn</button>
              {EXPENSE_CATEGORIES.map((c) => {
                const active = selectedCats.has(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCat(c)}
                    className={`rounded border px-3 py-1 text-xs ${active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-400"}`}
                  >
                    {active ? "✓" : "○"} {c}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-sm">
              Từ (đ)
              <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm">
              Đến (đ)
              <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="∞" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm">
              Sắp xếp
              <select value={sort} onChange={(e) => setSort(e.target.value as SortValue)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm trong ghi chú..." className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Tổng (đang lọc)" value={stats.total.toLocaleString("vi-VN") + "đ"} color="red" />
        <StatTile label="Số mục" value={String(stats.count)} />
        <StatTile label="TB / mục" value={stats.count > 0 ? Math.floor(stats.total / stats.count).toLocaleString("vi-VN") + "đ" : "—"} />
        <StatTile label="Tổng tất cả" value={expenses.reduce((s, x) => s + x.amountVnd, 0).toLocaleString("vi-VN") + "đ"} sub="không lọc" />
      </div>

      {stats.byCategory.size > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium">Phân bổ theo loại (đang lọc)</h2>
          <div className="space-y-1.5">
            {Array.from(stats.byCategory.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([cat, total]) => {
                const max = Math.max(...Array.from(stats.byCategory.values()));
                return (
                  <div key={cat} className="flex items-center gap-2 text-sm">
                    <span className="w-28 shrink-0 text-slate-700">{cat}</span>
                    <div className="h-4 flex-1 rounded bg-slate-100">
                      <div className="h-4 rounded bg-red-400" style={{ width: `${(total / max) * 100}%` }} />
                    </div>
                    <span className="w-28 text-right font-medium">{total.toLocaleString("vi-VN")}đ</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-400">
          {hasActiveFilter ? "Không có chi phí khớp bộ lọc" : "Chưa có chi phí — bấm \"Thêm chi phí\""}
        </div>
      ) : (
        <div className="max-h-[28rem] overflow-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Ngày</th>
                <th className="px-3 py-2">Loại</th>
                <th className="px-3 py-2">Ghi chú</th>
                <th className="px-3 py-2 text-right">Số tiền</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((x) => (
                <tr key={x.id} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2">{new Date(x.date).toLocaleDateString("vi-VN")}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{x.category}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{x.note ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-medium">{x.amountVnd.toLocaleString("vi-VN")}đ</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setModalState({ mode: "edit", expense: x })} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">Sửa</button>
                      <button onClick={() => remove(x)} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ExpenseModal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        onSaved={handleSaved}
        initialExpense={editingExpense}
      />
    </div>
  );
}

function StatTile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: "red" | "green" | "blue" }) {
  const valueColor = color === "red" ? "text-red-700" : color === "green" ? "text-green-700" : color === "blue" ? "text-blue-700" : "text-slate-900";
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}