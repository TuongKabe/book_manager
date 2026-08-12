"use client";

import { useState } from "react";
import OrderModal from "@/app/components/OrderModal";

type BookRow = { id: string; title: string; isbn: string | null; coverPhotoUrl: string | null; listPriceVnd: number | null; weightGrams: number | null };
type OrderRow = {
  id: string;
  date: Date | string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  channel: string | null;
  totalVnd: number | null;
  shippingFee: number | null;
  shippingUnit: string | null;
  weightGrams: number | null;
  note: string | null;
  books: BookRow[];
};

export default function OrderClient({ initialOrders }: { initialOrders: OrderRow[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [modalState, setModalState] = useState<{ mode: "create" } | { mode: "edit"; order: OrderRow } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function remove(o: OrderRow) {
    if (!confirm("Xóa đơn? Sách sẽ được trả về kho.")) return;
    const res = await fetch(`/api/orders/${o.id}`, { method: "DELETE" });
    if (res.ok) {
      setOrders((list) => list.filter((x) => x.id !== o.id));
      if (expandedId === o.id) setExpandedId(null);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  function handleSaved(saved: { id: string; date: Date | string; customerName: string | null; customerPhone: string | null; customerAddress: string | null; channel: string | null; totalVnd: number | null; shippingFee: number | null; shippingUnit: string | null; weightGrams: number | null; note: string | null; books?: BookRow[] }) {
    const withBooks: OrderRow = {
      id: saved.id,
      date: saved.date,
      customerName: saved.customerName,
      customerPhone: saved.customerPhone,
      customerAddress: saved.customerAddress,
      channel: saved.channel,
      totalVnd: saved.totalVnd,
      shippingFee: saved.shippingFee,
      shippingUnit: saved.shippingUnit,
      weightGrams: saved.weightGrams,
      note: saved.note,
      books: saved.books ?? [],
    };
    setOrders((list) => {
      const idx = list.findIndex((x) => x.id === saved.id);
      if (idx >= 0) {
        const updated = [...list];
        updated[idx] = withBooks;
        return updated;
      }
      return [withBooks, ...list];
    });
    setExpandedId(saved.id);
  }

  const editingOrder = modalState?.mode === "edit" ? modalState.order : undefined;

  return (
    <div className="space-y-4">
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex justify-end">
        <button
          onClick={() => setModalState({ mode: "create" })}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          + Tạo đơn bán
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-400">
          Chưa có đơn hàng — bấm &quot;Tạo đơn bán&quot;
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const isExpanded = expandedId === o.id;
            return (
              <div key={o.id} className="overflow-hidden rounded-xl border bg-white">
                <div
                  className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-50"
                  onClick={() => setExpandedId(isExpanded ? null : o.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs transition-transform ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                    <div>
                      <p className="font-semibold">
                        {o.customerName || "Không tên"}
                        {o.channel && <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">{o.channel}</span>}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(o.date).toLocaleDateString("vi-VN")} · {o.books.length} sách · {o.totalVnd?.toLocaleString("vi-VN") ?? "—"}đ
                        {o.shippingFee != null && o.shippingFee > 0 && ` (gồm ship ${o.shippingFee.toLocaleString("vi-VN")}đ${o.shippingUnit ? ` · ${o.shippingUnit}` : ""})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setModalState({ mode: "edit", order: o })} className="rounded bg-slate-100 px-3 py-1 text-sm">Sửa</button>
                    <button onClick={() => remove(o)} className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">Xóa</button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-3 border-t bg-slate-50 p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      {o.customerPhone && <div><p className="text-xs text-slate-500">SĐT</p><p>{o.customerPhone}</p></div>}
                      {o.customerAddress && <div className="sm:col-span-3"><p className="text-xs text-slate-500">Địa chỉ</p><p>{o.customerAddress}</p></div>}
                      {o.weightGrams != null && <div><p className="text-xs text-slate-500">Cân nặng</p><p>{o.weightGrams}g</p></div>}
                      {o.shippingUnit && <div><p className="text-xs text-slate-500">Đơn vị ship</p><p>{o.shippingUnit}</p></div>}
                      {o.shippingFee != null && <div><p className="text-xs text-slate-500">Phí ship</p><p>{o.shippingFee.toLocaleString("vi-VN")}đ</p></div>}
                      {o.note && <div className="sm:col-span-4"><p className="text-xs text-slate-500">Ghi chú</p><p>{o.note}</p></div>}
                    </div>
                    {o.books.length > 0 ? (
                      <div>
                        <p className="mb-2 text-sm font-medium text-slate-600">Sách trong đơn ({o.books.length})</p>
                        <div className="space-y-2">
                          {o.books.map((b) => (
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
                              <span className="text-sm text-slate-700">{b.listPriceVnd?.toLocaleString("vi-VN") ?? "—"}đ</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">Chưa có sách — bấm &quot;Sửa&quot; để thêm</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <OrderModal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        onSaved={handleSaved}
        initialOrder={editingOrder}
      />
    </div>
  );
}