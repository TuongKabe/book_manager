"use client";

import { useState } from "react";
import PurchaseEditForm from "./PurchaseEditForm";
import PurchaseModal from "@/app/components/PurchaseModal";

type BookRow = { id: string; title: string; isbn: string | null; coverPhotoUrl: string | null; status: string };
type PurchaseRow = {
  id: string;
  date: Date | string;
  supplier: string;
  totalCost: number;
  weightGrams: number | null;
  note: string | null;
  _count: { books: number };
  books: BookRow[];
};

export default function PurchaseListClient({ initialPurchases }: { initialPurchases: PurchaseRow[] }) {
  const [purchases, setPurchases] = useState(initialPurchases);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PurchaseRow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState("");

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

  function handleCreated(created: { id: string; supplier: string; date: Date | string; totalCost: number; weightGrams: number | null; note: string | null; _count: { books: number } }) {
    setPurchases((list) => [
      { ...created, books: [] },
      ...list,
    ]);
    setExpandedId(created.id);
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          + Thêm lô nhập
        </button>
      </div>

      {purchases.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-400">
          Chưa có lô nhập — bấm &quot;Thêm lô nhập&quot; để tạo
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
                        {p.weightGrams != null && ` · ${p.weightGrams.toLocaleString("vi-VN")}g`}
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
                      <p className="mb-3 text-sm text-slate-400">Chưa có sách</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PurchaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />

      {editing && (
        <PurchaseEditForm
          purchase={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setPurchases((list) => list.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}