"use client";

import { useEffect, useMemo, useState } from "react";
import BookEditForm from "./BookEditForm";

type Purchase = { id: string; supplier: string; date: Date | string } | null;
export type BookRow = {
  id: string;
  isbn: string | null;
  title: string;
  author: string | null;
  category: string | null;
  condition: string | null;
  coverPhotoUrl: string | null;
  listPriceVnd: number | null;
  purchaseCostVnd: number | null;
  status: string;
  purchase: Purchase;
};

const fmt = (n: number) => n.toLocaleString("vi-VN");

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  INTAKE: { label: "Nhập kho", color: "text-slate-700", bg: "bg-slate-200" },
  LISTED: { label: "Đang bán", color: "text-blue-700", bg: "bg-blue-100" },
  SOLD: { label: "Đã bán", color: "text-green-700", bg: "bg-green-100" },
};

export default function BookListClient({ initialBooks }: { initialBooks: BookRow[] }) {
  const [books, setBooks] = useState(initialBooks);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<BookRow | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchBooks(searchQ: string, searchStatus: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQ) params.set("q", searchQ);
    if (searchStatus) params.set("status", searchStatus);
    const res = await fetch(`/api/books?${params}`);
    setBooks(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => fetchBooks(q, status));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const stats = useMemo(() => {
    const total = books.length;
    const totalCost = books.reduce((s, b) => s + (b.purchaseCostVnd ?? 0), 0);
    const totalPrice = books.reduce((s, b) => s + (b.listPriceVnd ?? 0), 0);
    const soldBooks = books.filter((b) => b.status === "SOLD");
    const listedBooks = books.filter((b) => b.status === "LISTED");
    const intakeBooks = books.filter((b) => b.status === "INTAKE");
    const soldRevenue = soldBooks.reduce((s, b) => s + (b.listPriceVnd ?? 0), 0);
    const soldCost = soldBooks.reduce((s, b) => s + (b.purchaseCostVnd ?? 0), 0);
    const listedValue = listedBooks.reduce((s, b) => s + (b.listPriceVnd ?? 0), 0);
    const listedCost = listedBooks.reduce((s, b) => s + (b.purchaseCostVnd ?? 0), 0);
    const potentialProfit = totalPrice - totalCost;
    const realizedProfit = soldRevenue - soldCost;
    const listedPotentialProfit = listedValue - listedCost;
    return {
      total,
      totalCost,
      totalPrice,
      potentialProfit,
      realizedProfit,
      soldCount: soldBooks.length,
      listedCount: listedBooks.length,
      intakeCount: intakeBooks.length,
      soldRevenue,
      listedValue,
      listedPotentialProfit,
    };
  }, [books]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; cost: number; price: number }>();
    for (const b of books) {
      const key = b.category ?? "Khác";
      const ex = map.get(key) ?? { count: 0, cost: 0, price: 0 };
      ex.count += 1;
      ex.cost += b.purchaseCostVnd ?? 0;
      ex.price += b.listPriceVnd ?? 0;
      map.set(key, ex);
    }
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data, profit: data.price - data.cost }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [books]);

  async function markSold(book: BookRow) {
    const res = await fetch(`/api/books/${book.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SOLD" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
      return;
    }
    setError("");
    fetchBooks(q, status);
  }

  async function remove(book: BookRow) {
    if (!confirm(`Xóa "${book.title}"?`)) return;
    const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
      return;
    }
    setError("");
    fetchBooks(q, status);
  }

  const maxCatCount = Math.max(...categoryBreakdown.map((c) => c.count), 1);

  return (
    <div className="space-y-3">
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Tổng sách" value={String(stats.total)} sub="trong kỳ" />
        <StatTile label="Tổng giá nhập" value={fmt(stats.totalCost) + "đ"} color="amber" />
        <StatTile label="Tổng giá bán" value={fmt(stats.totalPrice) + "đ"} color="blue" />
        <StatTile
          label="Lợi nhuận tiềm năng"
          value={fmt(stats.potentialProfit) + "đ"}
          color={stats.potentialProfit >= 0 ? "green" : "red"}
          sub={`Đã thực hiện: ${fmt(stats.realizedProfit)}đ`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium">Phân bổ theo trạng thái</h2>
          {stats.total === 0 ? (
            <p className="text-xs text-slate-400">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-2">
              {(["INTAKE", "LISTED", "SOLD"] as const).map((s) => {
                const cfg = STATUS_LABEL[s];
                const count = s === "INTAKE" ? stats.intakeCount : s === "LISTED" ? stats.listedCount : stats.soldCount;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                const value = s === "INTAKE" ? 0 : s === "LISTED" ? stats.listedValue : stats.soldRevenue;
                return (
                  <div key={s} className="flex items-center gap-2 text-sm">
                    <span className={`w-20 shrink-0 rounded ${cfg.bg} px-2 py-0.5 text-center text-xs ${cfg.color}`}>{cfg.label}</span>
                    <div className="h-5 flex-1 rounded bg-slate-100">
                      <div className={`h-5 rounded ${s === "SOLD" ? "bg-green-400" : s === "LISTED" ? "bg-blue-400" : "bg-slate-400"}`} style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }} />
                    </div>
                    <span className="w-16 text-right text-sm font-medium">{count}</span>
                    <span className="w-24 text-right text-xs text-slate-500">{value > 0 ? fmt(value) + "đ" : "—"}</span>
                  </div>
                );
              })}
              <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs text-slate-500">
                <span>Đang bán giá trị tiềm năng: <strong className="text-blue-700">{fmt(stats.listedPotentialProfit)}đ</strong></span>
                <span>Đã bán lợi nhuận: <strong className="text-green-700">{fmt(stats.realizedProfit)}đ</strong></span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium">Top 5 phân loại</h2>
          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-1.5">
              {categoryBreakdown.map((c) => (
                <div key={c.category} className="flex items-center gap-2 text-sm">
                  <span className="w-24 shrink-0 text-slate-700">{c.category}</span>
                  <div className="h-4 flex-1 rounded bg-slate-100">
                    <div className="h-4 rounded bg-blue-400" style={{ width: `${(c.count / maxCatCount) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs">{c.count}</span>
                  <span className="w-20 text-right text-xs text-slate-500">{fmt(c.price)}đ</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchBooks(q, status)}
          placeholder="Tìm tên / tác giả / ISBN"
          className="rounded border border-slate-300 px-3 py-2"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-slate-300 px-3 py-2">
          <option value="">Tất cả trạng thái</option>
          <option value="INTAKE">Nhập kho</option>
          <option value="LISTED">Đang bán</option>
          <option value="SOLD">Đã bán</option>
        </select>
        <button onClick={() => fetchBooks(q, status)} disabled={loading} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {loading ? "Đang tìm..." : "Tìm"}
        </button>
      </div>

      {books.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-400">
          {q || status ? "Không tìm thấy sách" : "Chưa có sách — dùng Scan hoặc nhập kho"}
        </div>
      ) : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <div key={book.id} className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="flex gap-3">
              {book.coverPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.coverPhotoUrl} alt={book.title} className="h-24 w-16 rounded object-cover" />
              ) : (
                <div className="flex h-24 w-16 items-center justify-center rounded bg-slate-200 text-xs text-slate-500">No cover</div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold">{book.title}</p>
                <p className="text-sm text-slate-500">{book.author}</p>
                <p className="text-xs text-slate-400">{book.isbn}</p>
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5">{book.category}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5">{book.condition}</span>
                  <span className={`rounded px-1.5 py-0.5 ${
                    book.status === "SOLD" ? "bg-green-100 text-green-700"
                    : book.status === "LISTED" ? "bg-blue-100 text-blue-700" : "bg-slate-200"
                  }`}>{book.status}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span>Giá bán: {book.listPriceVnd?.toLocaleString("vi-VN") ?? "-"}đ</span>
              <span>Giá nhập: {book.purchaseCostVnd?.toLocaleString("vi-VN") ?? "-"}đ</span>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => setEditing(book)} className="rounded bg-slate-100 px-3 py-1 text-sm">Sửa</button>
              {book.status !== "SOLD" && (
                <button onClick={() => markSold(book)} className="rounded bg-green-600 px-3 py-1 text-sm text-white">Đã bán</button>
              )}
              <button onClick={() => remove(book)} className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">Xóa</button>
            </div>
          </div>
        ))}
      </div>
      )}

      {editing && (
        <BookEditForm
          book={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchBooks(q, status); }}
        />
      )}
    </div>
  );
}

function StatTile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: "green" | "red" | "blue" | "amber" }) {
  const valueColor = color === "green" ? "text-green-700" : color === "red" ? "text-red-700" : color === "blue" ? "text-blue-700" : color === "amber" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}