"use client";

import { useState, useEffect, useMemo } from "react";
import { toDateInputValue } from "@/lib/date";

type BookRow = {
  id: string;
  title: string;
  isbn: string | null;
  coverPhotoUrl: string | null;
  listPriceVnd: number | null;
  weightGrams: number | null;
};

type InitialOrder = {
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

const SHIPPING_UNITS = ["GHN", "GHTK", "Viettel Post", "J&T", "Bưu điện", "Khác"];

export default function OrderModal({
  isOpen,
  onClose,
  onSaved,
  initialOrder,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (order: { id: string; date: Date | string; customerName: string | null; customerPhone: string | null; customerAddress: string | null; channel: string | null; totalVnd: number | null; shippingFee: number | null; shippingUnit: string | null; weightGrams: number | null; note: string | null; books?: BookRow[] }) => void;
  initialOrder?: InitialOrder;
}) {
  const isEdit = !!initialOrder;

  const [form, setForm] = useState(() => ({
    date: initialOrder ? toDateInputValue(initialOrder.date) : new Date().toISOString().slice(0, 10),
    customerName: initialOrder?.customerName ?? "",
    customerPhone: initialOrder?.customerPhone ?? "",
    customerAddress: initialOrder?.customerAddress ?? "",
    channel: initialOrder?.channel ?? "",
    note: initialOrder?.note ?? "",
    weightGrams: initialOrder ? String(initialOrder.weightGrams ?? "") : "",
    shippingFee: initialOrder ? String(initialOrder.shippingFee ?? "") : "",
    shippingUnit: initialOrder?.shippingUnit ?? "GHN",
  }));

  const [orderBooks, setOrderBooks] = useState<BookRow[]>(initialOrder?.books ?? []);
  const [removedBookIds, setRemovedBookIds] = useState<string[]>([]);
  const [availableBooks, setAvailableBooks] = useState<BookRow[]>([]);
  const [bookSearch, setBookSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/books?status=LISTED")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAvailableBooks(data);
      })
      .catch(() => {});
  }, [isOpen]);

  const filteredAvailable = useMemo(() => {
    const q = bookSearch.trim().toLowerCase();
    const inOrder = new Set(orderBooks.map((b) => b.id));
    return availableBooks
      .filter((b) => !inOrder.has(b.id))
      .filter((b) => {
        if (!q) return true;
        return b.title.toLowerCase().includes(q) || (b.isbn ?? "").includes(q);
      })
      .slice(0, 30);
  }, [availableBooks, orderBooks, bookSearch]);

  const subtotal = useMemo(
    () => orderBooks.reduce((sum, b) => sum + (b.listPriceVnd ?? 0), 0),
    [orderBooks]
  );
  const totalWeight = useMemo(
    () => orderBooks.reduce((sum, b) => sum + (b.weightGrams ?? 0), 0),
    [orderBooks]
  );
  const shippingFee = Number(form.shippingFee) || 0;
  const grandTotal = subtotal + shippingFee;

  function addBook(book: BookRow) {
    setOrderBooks((prev) => [...prev, book]);
  }

  function removeOrderBook(bookId: string) {
    setOrderBooks((prev) => prev.filter((b) => b.id !== bookId));
    if (initialOrder && orderBooks.find((b) => b.id === bookId)) {
      setRemovedBookIds((prev) => (prev.includes(bookId) ? prev : [...prev, bookId]));
    }
  }

  async function handleSave() {
    setError("");
    setSaving(true);

    try {
      if (isEdit && initialOrder) {
        const patchRes = await fetch(`/api/orders/${initialOrder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: form.date,
            customerName: form.customerName || null,
            customerPhone: form.customerPhone || null,
            customerAddress: form.customerAddress || null,
            channel: form.channel || null,
            totalVnd: grandTotal,
            shippingFee: form.shippingFee ? Number(form.shippingFee) : null,
            shippingUnit: form.shippingUnit || null,
            weightGrams: totalWeight || (form.weightGrams ? Number(form.weightGrams) : null),
            note: form.note || null,
            addBookIds: orderBooks.filter((b) => !initialOrder.books.some((ob) => ob.id === b.id)).map((b) => b.id),
            removeBookIds: removedBookIds,
          }),
        });
        if (!patchRes.ok) {
          const data = await patchRes.json().catch(() => ({}));
          setError(data.error ?? "Lỗi cập nhật đơn");
          setSaving(false);
          return;
        }
        const updated = await patchRes.json();
        onSaved({ ...updated, books: updated.books ?? [] });
      } else {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: form.date,
            customerName: form.customerName || null,
            customerPhone: form.customerPhone || null,
            customerAddress: form.customerAddress || null,
            channel: form.channel || null,
            totalVnd: grandTotal,
            shippingFee: form.shippingFee ? Number(form.shippingFee) : null,
            shippingUnit: form.shippingUnit || null,
            weightGrams: totalWeight || (form.weightGrams ? Number(form.weightGrams) : null),
            note: form.note || null,
            bookIds: orderBooks.map((b) => b.id),
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Có lỗi xảy ra");
          setSaving(false);
          return;
        }
        const created = await res.json();
        onSaved({ ...created, books: created.books ?? [] });
      }
      resetAndClose();
    } catch {
      setError("Lỗi kết nối — thử lại");
    }
    setSaving(false);
  }

  function resetAndClose() {
    setForm({ date: new Date().toISOString().slice(0, 10), customerName: "", customerPhone: "", customerAddress: "", channel: "", note: "", weightGrams: "", shippingFee: "", shippingUnit: "GHN" });
    setOrderBooks([]);
    setRemovedBookIds([]);
    setAvailableBooks([]);
    setBookSearch("");
    setError("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[95vh] w-full max-w-2xl space-y-3 overflow-auto rounded-xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{isEdit ? "Sửa đơn bán" : "Tạo đơn bán hàng"}</h2>
          <button onClick={resetAndClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
        </div>

        {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="grid gap-2 rounded-lg border bg-slate-50 p-3 sm:grid-cols-2">
          <label className="text-sm">
            Ngày *
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            Kênh bán
            <input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} placeholder="Chợ Tốt / Shopee / Facebook..." className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm sm:col-span-2">
            Tên khách
            <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            SĐT
            <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm sm:col-span-2">
            Địa chỉ
            <input value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm sm:col-span-2">
            Ghi chú
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">Sách trong đơn ({orderBooks.length})</h3>
            {orderBooks.length > 0 && (
              <button onClick={() => { const ids = orderBooks.map((b) => b.id); setOrderBooks([]); setRemovedBookIds((prev) => Array.from(new Set([...prev, ...ids]))); }} className="text-xs text-red-600 hover:underline">Xóa hết</button>
            )}
          </div>
          {orderBooks.length === 0 ? (
            <div className="rounded border border-dashed bg-slate-50 p-4 text-center text-sm text-slate-400">
              Chưa có sách — chọn từ kho bên dưới
            </div>
          ) : (
            <div className="max-h-32 space-y-1 overflow-auto rounded border bg-slate-50 p-2">
              {orderBooks.map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded bg-white p-2">
                  {b.coverPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.coverPhotoUrl} alt={b.title} className="h-8 w-6 rounded object-cover" />
                  ) : (
                    <div className="flex h-8 w-6 items-center justify-center rounded bg-slate-200 text-[8px] text-slate-400">No</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.title}</p>
                    <p className="text-xs text-slate-400">{b.isbn || "—"} · {b.listPriceVnd?.toLocaleString("vi-VN")}đ · {b.weightGrams ?? 0}g</p>
                  </div>
                  <button onClick={() => removeOrderBook(b.id)} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">Bỏ</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium">Thêm sách từ kho:</p>
          <input
            value={bookSearch}
            onChange={(e) => setBookSearch(e.target.value)}
            placeholder="Tìm tên / ISBN..."
            className="mb-2 w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
          />
          <div className="max-h-40 space-y-1 overflow-auto rounded border bg-white p-2">
            {filteredAvailable.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-2">Không có sách khả dụng</p>
            ) : (
              filteredAvailable.map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded p-1.5 hover:bg-slate-50">
                  {b.coverPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.coverPhotoUrl} alt={b.title} className="h-8 w-6 rounded object-cover" />
                  ) : (
                    <div className="flex h-8 w-6 items-center justify-center rounded bg-slate-200 text-[8px] text-slate-400">No</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{b.title}</p>
                    <p className="text-[10px] text-slate-400">{b.isbn || "—"} · {b.listPriceVnd?.toLocaleString("vi-VN")}đ</p>
                  </div>
                  <button onClick={() => addBook(b)} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">+ Thêm</button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-2 rounded-lg border bg-slate-50 p-3 sm:grid-cols-3">
          <label className="text-sm">
            Cân nặng (g)
            <input type="number" value={form.weightGrams} onChange={(e) => setForm({ ...form, weightGrams: e.target.value })} placeholder={totalWeight ? String(totalWeight) : "auto từ sách"} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
            {totalWeight > 0 && <p className="mt-1 text-xs text-slate-500">Auto: {totalWeight}g</p>}
          </label>
          <label className="text-sm">
            Phí ship (đ)
            <input type="number" value={form.shippingFee} onChange={(e) => setForm({ ...form, shippingFee: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            Đơn vị ship
            <select value={form.shippingUnit} onChange={(e) => setForm({ ...form, shippingUnit: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
              {SHIPPING_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg border-2 border-slate-200 bg-slate-50 p-3 text-center">
          <div>
            <p className="text-xs text-slate-500">Sách</p>
            <p className="text-xl font-bold">{orderBooks.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Tiền sách</p>
            <p className="text-xl font-bold">{subtotal > 0 ? `${subtotal.toLocaleString("vi-VN")}đ` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Tổng cộng</p>
            <p className="text-xl font-bold text-blue-600">{grandTotal > 0 ? `${grandTotal.toLocaleString("vi-VN")}đ` : "—"}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <button onClick={resetAndClose} className="rounded bg-slate-200 px-4 py-2">Hủy</button>
          <button onClick={handleSave} disabled={saving || orderBooks.length === 0} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
            {saving ? "Đang lưu..." : `${isEdit ? "Cập nhật" : "Lưu"} đơn (${orderBooks.length} sách)`}
          </button>
        </div>
      </div>
    </div>
  );
}