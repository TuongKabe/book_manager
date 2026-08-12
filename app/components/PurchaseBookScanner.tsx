"use client";

import { useState } from "react";
import ISBNScanner from "./ISBNScanner";

type BookInfo = {
  title: string;
  author: string;
  category: string;
  thumbnail: string;
  description: string;
};

const CONDITIONS = ["NEW", "LIKE_NEW", "VG", "GOOD", "FAIR", "POOR"];

export default function PurchaseBookScanner({
  purchaseId,
  purchaseSupplier,
  onBookAdded,
}: {
  purchaseId: string;
  purchaseSupplier: string;
  onBookAdded: () => void;
}) {
  const [book, setBook] = useState<BookInfo | null>(null);
  const [isbn, setIsbn] = useState("");
  const [form, setForm] = useState({
    title: "",
    author: "",
    category: "",
    condition: "VG",
    weightGrams: "",
    purchaseCostVnd: "",
    listPriceVnd: "",
    defectsNote: "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedBooks, setSavedBooks] = useState<{ title: string; isbn: string }[]>([]);

  function handleFound(code: string, info: BookInfo) {
    setIsbn(code);
    setBook(info);
    setForm({
      title: info.title,
      author: info.author,
      category: info.category,
      condition: "VG",
      weightGrams: "",
      purchaseCostVnd: "",
      listPriceVnd: "",
      defectsNote: "",
    });
    setSaved(false);
    setError("");
  }

  async function submit() {
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isbn,
        title: form.title,
        author: form.author || null,
        category: form.category || null,
        condition: form.condition,
        weightGrams: form.weightGrams ? Number(form.weightGrams) : null,
        purchaseCostVnd: form.purchaseCostVnd ? Number(form.purchaseCostVnd) : null,
        listPriceVnd: form.listPriceVnd ? Number(form.listPriceVnd) : null,
        defectsNote: form.defectsNote || null,
        purchaseId,
        status: "LISTED",
        coverPhotoUrl: book?.thumbnail || null,
      }),
    });
    if (res.ok) {
      setSavedBooks((prev) => [...prev, { title: form.title, isbn }]);
      setSaved(true);
      setBook(null);
      setIsbn("");
      onBookAdded();
    } else {
      const data = await res.json();
      setError(data.error ?? "Lưu thất bại");
    }
    setSubmitting(false);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Thêm sách vào lô: {purchaseSupplier}</h3>
        {savedBooks.length > 0 && (
          <span className="text-sm text-green-600">Đã thêm {savedBooks.length} cuốn</span>
        )}
      </div>

      <ISBNScanner onFound={handleFound} />

      {book && !saved && (
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-2 rounded-lg border bg-slate-50 p-3 sm:grid-cols-2">
          <div className="flex gap-3 sm:col-span-2">
            {book.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.thumbnail} alt={book.title} className="h-20 w-14 rounded object-cover" />
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{book.title}</p>
              <p className="text-sm text-slate-500">{book.author}</p>
              <p className="text-xs text-slate-400">ISBN: {isbn}</p>
            </div>
          </div>
          <input value={form.title} onChange={set("title")} required placeholder="Tiêu đề" className="rounded border border-slate-300 px-3 py-2 text-sm" />
          <input value={form.author} onChange={set("author")} placeholder="Tác giả" className="rounded border border-slate-300 px-3 py-2 text-sm" />
          <input value={form.category} onChange={set("category")} placeholder="Phân loại" className="rounded border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.condition} onChange={set("condition")} className="rounded border border-slate-300 px-3 py-2 text-sm">
            {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={form.purchaseCostVnd} onChange={set("purchaseCostVnd")} type="number" placeholder="Giá nhập (đ)" className="rounded border border-slate-300 px-3 py-2 text-sm" />
          <input value={form.listPriceVnd} onChange={set("listPriceVnd")} type="number" placeholder="Giá bán (đ)" className="rounded border border-slate-300 px-3 py-2 text-sm" />
          <input value={form.defectsNote} onChange={set("defectsNote")} placeholder="Lỗi / ghi chú" className="sm:col-span-2 rounded border border-slate-300 px-3 py-2 text-sm" />
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => { setBook(null); setIsbn(""); }} className="rounded bg-slate-200 px-3 py-1.5 text-sm">Hủy</button>
            <button type="submit" disabled={submitting} className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50">
              {submitting ? "Đang lưu..." : "Lưu vào lô"}
            </button>
          </div>
        </form>
      )}

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
          <p className="text-sm font-semibold text-green-700">Đã lưu: {form.title || savedBooks[savedBooks.length - 1]?.title}</p>
          <p className="mt-1 text-xs text-green-600">Quét tiếp cuốn khác hoặc đóng lại</p>
        </div>
      )}

      {savedBooks.length > 0 && (
        <div className="border-t pt-2">
          <p className="mb-1 text-xs font-medium text-slate-500">Sách đã thêm trong phiên:</p>
          <ul className="max-h-32 space-y-1 overflow-auto text-sm">
            {savedBooks.map((b, i) => (
              <li key={i} className="flex items-center gap-2 text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {b.title}
                {b.isbn && <span className="text-xs text-slate-400">({b.isbn})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
