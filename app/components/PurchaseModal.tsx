"use client";

import { useState, useMemo } from "react";
import ISBNScanner from "./ISBNScanner";

type BookInfo = {
  title: string;
  author: string;
  category: string;
  thumbnail: string;
  description: string;
};

type PendingBook = {
  isbn: string;
  title: string;
  author: string;
  category: string;
  coverPhotoUrl: string;
  condition: string;
};

const CONDITIONS = ["NEW", "LIKE_NEW", "VG", "GOOD", "FAIR", "POOR"];

export default function PurchaseModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (purchase: { id: string; supplier: string; date: Date | string; totalCost: number; weightGrams: number | null; note: string | null; _count: { books: number } }) => void;
}) {
  const [batch, setBatch] = useState({
    date: new Date().toISOString().slice(0, 10),
    supplier: "",
    totalCost: "",
    weightGrams: "",
    note: "",
  });
  const [books, setBooks] = useState<PendingBook[]>([]);
  const [currentBook, setCurrentBook] = useState<PendingBook | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [scanKey, setScanKey] = useState(0);

  const stats = useMemo(() => {
    const count = books.length;
    const totalCostNum = Number(batch.totalCost) || 0;
    const weightGramsNum = Number(batch.weightGrams) || 0;
    return {
      count,
      avgCost: count > 0 ? Math.floor(totalCostNum / count) : 0,
      avgWeight: count > 0 && weightGramsNum > 0 ? Math.floor(weightGramsNum / count) : 0,
    };
  }, [books.length, batch.totalCost, batch.weightGrams]);

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
    setBooks((prev) => [...prev, currentBook]);
    setCurrentBook(null);
    setScanKey((k) => k + 1);
  }

  function cancelCurrentBook() {
    setCurrentBook(null);
    setScanKey((k) => k + 1);
  }

  function removeBook(isbn: string) {
    setBooks((prev) => prev.filter((b) => b.isbn !== isbn));
  }

  async function handleSave() {
    if (!batch.supplier.trim()) {
      setError("Nhập nhà cung cấp");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: batch.date,
          supplier: batch.supplier,
          totalCost: batch.totalCost ? Number(batch.totalCost) : 0,
          weightGrams: batch.weightGrams ? Number(batch.weightGrams) : null,
          note: batch.note || null,
          books,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        onCreated({
          ...created,
          books: [],
        });
        resetAndClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Có lỗi xảy ra");
      }
    } catch {
      setError("Lỗi kết nối — thử lại");
    }
    setSaving(false);
  }

  function resetAndClose() {
    setBatch({ date: new Date().toISOString().slice(0, 10), supplier: "", totalCost: "", weightGrams: "", note: "" });
    setBooks([]);
    setCurrentBook(null);
    setError("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[95vh] w-full max-w-2xl space-y-3 overflow-auto rounded-xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Thêm lô nhập mới</h2>
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
            {stats.count > 0 && (
              <button onClick={() => setBooks([])} className="text-xs text-red-600 hover:underline">Xóa hết</button>
            )}
          </div>
          {stats.count === 0 ? (
            <div className="rounded border border-dashed bg-slate-50 p-4 text-center text-sm text-slate-400">
              Chưa có sách — quét barcode bên dưới để thêm
            </div>
          ) : (
            <div className="max-h-40 space-y-1 overflow-auto rounded border bg-slate-50 p-2">
              {books.map((b, i) => (
                <div key={`${b.isbn}-${i}`} className="flex items-center gap-2 rounded bg-white p-2">
                  {b.coverPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.coverPhotoUrl} alt={b.title} className="h-10 w-7 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-7 items-center justify-center rounded bg-slate-200 text-[8px] text-slate-400">No</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.title}</p>
                    <p className="text-xs text-slate-400">{b.isbn || "—"} · {b.condition}</p>
                  </div>
                  <button onClick={() => removeBook(b.isbn)} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">Xóa</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium">Thêm sách vào lô:</p>
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
            <p className="text-xs text-slate-500">Số sách</p>
            <p className="text-xl font-bold">{stats.count}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Giá TB / sách</p>
            <p className="text-xl font-bold text-blue-600">{stats.avgCost > 0 ? `${stats.avgCost.toLocaleString("vi-VN")}đ` : "—"}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Cân nặng TB / sách</p>
            <p className="text-xl font-bold text-blue-600">{stats.avgWeight > 0 ? `${stats.avgWeight}g` : "—"}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <button onClick={resetAndClose} className="rounded bg-slate-200 px-4 py-2">Hủy</button>
          <button onClick={handleSave} disabled={saving || !batch.supplier.trim() || stats.count === 0} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
            {saving ? "Đang lưu..." : `Lưu lô (${stats.count} sách)`}
          </button>
        </div>
      </div>
    </div>
  );
}