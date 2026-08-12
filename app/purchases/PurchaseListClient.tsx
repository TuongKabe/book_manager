"use client";

import { useState } from "react";
import PurchaseEditForm from "./PurchaseEditForm";
import PurchaseBookScanner from "@/app/components/PurchaseBookScanner";

type BookRow = { id: string; title: string; isbn: string | null; coverPhotoUrl: string | null; status: string };
type PurchaseRow = {
  id: string;
  date: Date | string;
  supplier: string;
  totalCost: number;
  note: string | null;
  _count: { books: number };
  books: BookRow[];
};

export default function PurchaseListClient({ initialPurchases }: { initialPurchases: PurchaseRow[] }) {
  const [purchases, setPurchases] = useState(initialPurchases);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), supplier: "", totalCost: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PurchaseRow | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, totalCost: Number(form.totalCost || 0) }),
    });
    if (res.ok) {
      const created = await res.json();
      setPurchases((list) => [{ ...created, _count: { books: 0 }, books: [] }, ...list]);
      setForm({ date: new Date().toISOString().slice(0, 10), supplier: "", totalCost: "" });
      setExpandedId(created.id);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
    setSubmitting(false);
  }

  async function remove(p: PurchaseRow) {
    if (!confirm(`Xóa lô "${p.supplier}"?`)) return;
    const res = await fetch(`/api/purchases/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      setPurchases((list) => list.filter((x) => x.id !== p.id));
      if (expandedId === p.id) setExpandedId(null);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  function refreshPurchase(id: string) {
    fetch(`/api/purchases/${id}`)
      .then((r) => r.json())
      .then((updated) => {
        setPurchases((list) =>
          list.map((p) => (p.id === id ? { ...p, _count: updated._count, books: updated.books } : p))
        );
      })
      .catch(() => {});
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
        <button disabled={submitting} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {submitting ? "Đang thêm..." : "Thêm lô"}
        </button>
      </form>

      {purchases.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-400">
          Chưa có lô nhập — tạo lô bên trên
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map((p) => {
            const isExpanded = expandedId === p.id;
            return (
              <div key={p.id} className="overflow-hidden rounded-xl border bg-white">
                <div
                  className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-50"
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs transition-transform ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                    <div>
                      <p className="font-semibold">{p.supplier}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(p.date).toLocaleDateString("vi-VN")} · {p._count.books} cuốn · {p.totalCost.toLocaleString("vi-VN")}đ
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setEditing(p)} className="rounded bg-slate-100 px-3 py-1 text-sm">Sửa</button>
                    <button onClick={() => remove(p)} className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">Xóa</button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t bg-slate-50 p-4">
                    {p.books.length > 0 ? (
                      <div className="mb-4">
                        <p className="mb-2 text-sm font-medium text-slate-600">Sách trong lô ({p._count.books})</p>
                        <div className="max-h-60 space-y-2 overflow-auto">
                          {p.books.map((b) => (
                            <div key={b.id} className="flex items-center gap-3 rounded-lg bg-white p-2 border">
                              {b.coverPhotoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={b.coverPhotoUrl} alt={b.title} className="h-12 w-8 rounded object-cover" />
                              ) : (
                                <div className="flex h-12 w-8 items-center justify-center rounded bg-slate-200 text-[10px] text-slate-400">No</div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{b.title}</p>
                                <p className="text-xs text-slate-400">{b.isbn}</p>
                              </div>
                              <span className={`rounded px-1.5 py-0.5 text-xs ${
                                b.status === "SOLD" ? "bg-green-100 text-green-700"
                                : b.status === "LISTED" ? "bg-blue-100 text-blue-700" : "bg-slate-200"
                              }`}>{b.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="mb-3 text-sm text-slate-400">Chưa có sách — quét barcode bên dưới để thêm</p>
                    )}

                    <PurchaseBookScanner
                      purchaseId={p.id}
                      purchaseSupplier={p.supplier}
                      onBookAdded={() => refreshPurchase(p.id)}
                    />
                  </div>
                )}
              </div>
            );
          })}
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
