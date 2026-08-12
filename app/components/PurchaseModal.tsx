"use client";

import { useState, useMemo } from "react";
import ISBNScanner from "./ISBNScanner";
import { toDateInputValue } from "@/lib/date";

type BookInfo = {
  title: string;
  author: string;
  category: string;
  thumbnail: string;
  description: string;
};

type ExistingBook = {
  id: string;
  isbn: string | null;
  title: string;
  author: string | null;
  coverPhotoUrl: string | null;
  condition: string | null;
  status: string;
};

type PendingBook = {
  isbn: string;
  title: string;
  author: string;
  category: string;
  coverPhotoUrl: string;
  condition: string;
};

export type InitialPurchase = {
  id: string;
  date: Date | string;
  supplier: string;
  totalCost: number;
  weightGrams: number | null;
  note: string | null;
  books: ExistingBook[];
};

const CONDITIONS = ["NEW", "LIKE_NEW", "VG", "GOOD", "FAIR", "POOR"];

export default function PurchaseModal({
  isOpen,
  onClose,
  onSaved,
  initialPurchase,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (purchase: { id: string; supplier: string; date: Date | string; totalCost: number; weightGrams: number | null; note: string | null; _count: { books: number }; books?: ExistingBook[] }) => void;
  initialPurchase?: InitialPurchase;
}) {
  const isEdit = !!initialPurchase;

  const [batch, setBatch] = useState(() => ({
    date: initialPurchase ? toDateInputValue(initialPurchase.date) : new Date().toISOString().slice(0, 10),
    supplier: initialPurchase?.supplier ?? "",
    totalCost: initialPurchase ? String(initialPurchase.totalCost ?? "") : "",
    weightGrams: initialPurchase ? String(initialPurchase.weightGrams ?? "") : "",
    note: initialPurchase?.note ?? "",
  }));
  const [existingBooks, setExistingBooks] = useState<ExistingBook[]>(initialPurchase?.books ?? []);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [newBooks, setNewBooks] = useState<PendingBook[]>([]);
  const [currentBook, setCurrentBook] = useState<PendingBook | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [scanKey, setScanKey] = useState(0);

  const remainingExisting = existingBooks.filter((b) => !removedIds.includes(b.id));
  const totalBookCount = remainingExisting.length + newBooks.length;

  const stats = useMemo(() => {
    const totalCostNum = Number(batch.totalCost) || 0;
    const weightGramsNum = Number(batch.weightGrams) || 0;
    return {
      count: totalBookCount,
      avgCost: totalBookCount > 0 ? Math.floor(totalCostNum / totalBookCount) : 0,
      avgWeight: totalBookCount > 0 && weightGramsNum > 0 ? Math.floor(weightGramsNum / totalBookCount) : 0,
    };
  }, [totalBookCount, batch.totalCost, batch.weightGrams]);

  function handleScan(isbn: string, info: BookInfo) {
    setCurrentBook({
      isbn,
      title: info.title || "",
      author: info.author || "",
      category: info.category || "",
      coverPhotoUrl: info.thumbnail || "",
      condition: "VG",
    });
  }

  function addCurrentBook() {
    if (!currentBook || !currentBook.title.trim()) return;
    setNewBooks((prev) => [...prev, currentBook]);
    setCurrentBook(null);
    setScanKey((k) => k + 1);
  }

  function cancelCurrentBook() {
    setCurrentBook(null);
    setScanKey((k) => k + 1);
  }

  function removeExistingBook(id: string) {
    if (!confirm("Bỏ sách này khỏi lô? Sách vẫn còn trong kho.")) return;
    setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function removeNewBook(isbn: string) {
    setNewBooks((prev) => prev.filter((b) => b.isbn !== isbn));
  }

  async function handleSave() {
    if (!batch.supplier.trim()) {
      setError("Nhập nhà cung cấp");
      return;
    }
    if (totalBookCount === 0) {
      setError("Lô phải có ít nhất 1 sách");
      return;
    }
    setError("");
    setSaving(true);

    try {
      if (isEdit && initialPurchase) {
        const patchRes = await fetch(`/api/purchases/${initialPurchase.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: batch.date,
            supplier: batch.supplier,
            totalCost: batch.totalCost ? Number(batch.totalCost) : 0,
            weightGrams: batch.weightGrams ? Number(batch.weightGrams) : null,
            note: batch.note || null,
          }),
        });
        if (!patchRes.ok) {
          const data = await patchRes.json().catch(() => ({}));
          setError(data.error ?? "Lỗi cập nhật lô");
          setSaving(false);
          return;
        }

        for (const id of removedIds) {
          await fetch(`/api/books/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ purchaseId: null }),
          });
        }

        const totalCostNum = Number(batch.totalCost) || 0;
        const weightGramsNum = Number(batch.weightGrams) || 0;
        const numNew = newBooks.length;
        const perBookCost = numNew > 0 ? Math.floor(totalCostNum / totalBookCount) : 0;
        const perBookWeight = numNew > 0 && weightGramsNum > 0 ? Math.floor(weightGramsNum / totalBookCount) : null;

        for (const book of newBooks) {
          await fetch(`/api/books`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              isbn: book.isbn,
              title: book.title,
              author: book.author || null,
              category: book.category || null,
              condition: book.condition,
              coverPhotoUrl: book.coverPhotoUrl || null,
              purchaseId: initialPurchase.id,
              purchaseCostVnd: perBookCost,
              weightGrams: perBookWeight,
              status: "LISTED",
            }),
          });
        }

        const updated = await fetch(`/api/purchases/${initialPurchase.id}`).then((r) => r.json());
        onSaved({ ...updated, books: updated.books ?? [] });
        resetAndClose();
      } else {
        const res = await fetch("/api/purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: batch.date,
            supplier: batch.supplier,
            totalCost: batch.totalCost ? Number(batch.totalCost) : 0,
            weightGrams: batch.weightGrams ? Number(batch.weightGrams) : null,
            note: batch.note || null,
            books: newBooks,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          onSaved({ ...created, books: [] });
          resetAndClose();
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Có lỗi xảy ra");
        }
      }
    } catch {
      setError("Lỗi kết nối — thử lại");
    }
    setSaving(false);
  }

  function resetAndClose() {
    setBatch({ date: new Date().toISOString().slice(0, 10), supplier: "", totalCost: "", weightGrams: "", note: "" });
    setExistingBooks([]);
    setRemovedIds([]);
    setNewBooks([]);
    setCurrentBook(null);
    setError("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[95vh] w-full max-w-2xl space-y-3 overflow-auto rounded-xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{isEdit ? "Sửa lô nhập" : "Thêm lô nhập mới"}</h2>
          <button onClick={resetAndClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
        </div>

        {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="grid gap-2 rounded-lg border bg-slate-50 p-3 sm:grid-cols-2">
          <label className="text-sm">
            Ngày *
            <input type="date" value={batch.date} onChange={(e) => setBatch({ ...batch, date: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            Nhà cung cấp *
            <input value={batch.supplier} onChange={(e) => setBatch({ ...batch, supplier: e.target.value })} required className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            Tổng chi (đ) *
            <input type="number" value={batch.totalCost} onChange={(e) => setBatch({ ...batch, totalCost: e.target.value })} required className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            Cân nặng lô (g)
            <input type="number" value={batch.weightGrams} onChange={(e) => setBatch({ ...batch, weightGrams: e.target.value })} placeholder="vd: 5000" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm sm:col-span-2">
            Ghi chú
            <input value={batch.note} onChange={(e) => setBatch({ ...batch, note: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">Sách trong lô ({stats.count})</h3>
            {(existingBooks.length > 0 || newBooks.length > 0) && (
              <button onClick={() => { setRemovedIds(existingBooks.map((b) => b.id)); setNewBooks([]); }} className="text-xs text-red-600 hover:underline">Xóa hết</button>
            )}
          </div>
          {stats.count === 0 ? (
            <div className="rounded border border-dashed bg-slate-50 p-4 text-center text-sm text-slate-400">
              Chưa có sách — quét barcode bên dưới để thêm
            </div>
          ) : (
            <div className="max-h-40 space-y-1 overflow-auto rounded border bg-slate-50 p-2">
              {remainingExisting.map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded bg-white p-2">
                  {b.coverPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.coverPhotoUrl} alt={b.title} className="h-10 w-7 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-7 items-center justify-center rounded bg-slate-200 text-[8px] text-slate-400">No</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {b.title} <span className="text-xs text-slate-400">(đã có)</span>
                    </p>
                    <p className="text-xs text-slate-400">{b.isbn || "—"} · {b.condition ?? "—"}</p>
                  </div>
                  <button onClick={() => removeExistingBook(b.id)} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">Bỏ</button>
                </div>
              ))}
              {newBooks.map((b, i) => (
                <div key={`${b.isbn}-${i}`} className="flex items-center gap-2 rounded bg-blue-50 p-2">
                  {b.coverPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.coverPhotoUrl} alt={b.title} className="h-10 w-7 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-7 items-center justify-center rounded bg-slate-200 text-[8px] text-slate-400">No</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {b.title} <span className="text-xs text-blue-600">(mới)</span>
                    </p>
                    <p className="text-xs text-slate-400">{b.isbn || "—"} · {b.condition}</p>
                  </div>
                  <button onClick={() => removeNewBook(b.isbn)} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">Xóa</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium">{isEdit ? "Thêm sách vào lô:" : "Thêm sách vào lô:"}</p>
          <ISBNScanner onFound={handleScan} autoStartKey={scanKey} />
        </div>

        {currentBook && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="mb-2 text-sm font-medium text-blue-900">Điều chỉnh thông tin sách trước khi thêm:</p>
            <div className="flex gap-3">
              {currentBook.coverPhotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentBook.coverPhotoUrl} alt={currentBook.title} className="h-20 w-14 rounded object-cover" />
              )}
              <div className="flex-1 space-y-2">
                <input value={currentBook.title} onChange={(e) => setCurrentBook({ ...currentBook, title: e.target.value })} placeholder="Tiêu đề *" required className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
                <input value={currentBook.author} onChange={(e) => setCurrentBook({ ...currentBook, author: e.target.value })} placeholder="Tác giả" className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
                <div className="flex gap-2">
                  <input value={currentBook.category} onChange={(e) => setCurrentBook({ ...currentBook, category: e.target.value })} placeholder="Phân loại" className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm" />
                  <select value={currentBook.condition} onChange={(e) => setCurrentBook({ ...currentBook, condition: e.target.value })} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
                    {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={cancelCurrentBook} className="rounded bg-slate-200 px-3 py-1.5 text-sm">Bỏ qua</button>
              <button onClick={addCurrentBook} disabled={!currentBook.title.trim()} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">+ Thêm vào lô</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
          <div className="text-center">
            <p className="text-xs text-slate-500">Tổng sách</p>
            <p className="text-xl font-bold">{stats.count}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Giá TB / sách mới</p>
            <p className="text-xl font-bold text-blue-600">{stats.avgCost > 0 ? `${stats.avgCost.toLocaleString("vi-VN")}đ` : "—"}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Cân nặng TB / sách mới</p>
            <p className="text-xl font-bold text-blue-600">{stats.avgWeight > 0 ? `${stats.avgWeight}g` : "—"}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <button onClick={resetAndClose} className="rounded bg-slate-200 px-4 py-2">Hủy</button>
          <button onClick={handleSave} disabled={saving || !batch.supplier.trim() || stats.count === 0} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
            {saving ? "Đang lưu..." : isEdit ? `Cập nhật lô (${stats.count} sách)` : `Lưu lô (${stats.count} sách)`}
          </button>
        </div>
      </div>
    </div>
  );
}