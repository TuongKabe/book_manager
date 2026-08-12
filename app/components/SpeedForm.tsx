"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import type { BookInfo } from "./SpeedScanner";

export type PurchaseOption = { id: string; supplier: string; date: string };

const CONDITIONS = ["NEW", "LIKE_NEW", "VG", "GOOD", "FAIR", "POOR"];

export default function SpeedForm({
  isbn,
  book,
  onReset,
}: {
  isbn: string;
  book: BookInfo;
  onReset: () => void;
}) {
  const [form, setForm] = useState({
    title: book.title,
    author: book.author,
    category: book.category,
    condition: "VG",
    weightGrams: "",
    purchaseCostVnd: "",
    listPriceVnd: "",
    defectsNote: "",
    purchaseId: "",
  });
  const [purchases, setPurchases] = useState<PurchaseOption[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/purchases")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPurchases(data);
      })
      .catch(() => {});
  }, []);

  const set = (k: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

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
        purchaseId: form.purchaseId || null,
        status: "LISTED",
        coverPhotoUrl: book.thumbnail || null,
      }),
    });
    if (res.ok) {
      setSaved(true);
    } else {
      const data = await res.json();
      setError(data.error ?? "Lưu thất bại");
    }
    setSubmitting(false);
  }

  if (saved) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
        <p className="mb-2 font-semibold text-green-700">Đã lưu: {form.title}</p>
        <button onClick={onReset} className="rounded bg-blue-600 px-4 py-2 text-white">Thêm cuốn khác</button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
      <div className="sm:col-span-2 flex gap-4">
        {book.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.thumbnail} alt={book.title} className="h-32 w-24 rounded object-cover" />
        )}
        <div>
          <p className="text-lg font-bold">{book.title}</p>
          <p className="text-sm text-slate-500">{book.author}</p>
          <p className="text-xs text-slate-400">ISBN: {isbn}</p>
        </div>
      </div>
      <label className="contents">
        <input value={form.title} onChange={set("title")} required className="sm:col-span-2 rounded border border-slate-300 px-3 py-2" />
      </label>
      <input value={form.author} onChange={set("author")} placeholder="Tác giả" className="rounded border border-slate-300 px-3 py-2" />
      <input value={form.category} onChange={set("category")} placeholder="Phân loại" className="rounded border border-slate-300 px-3 py-2" />
      <select value={form.condition} onChange={set("condition")} className="rounded border border-slate-300 px-3 py-2">
        {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={form.purchaseId} onChange={set("purchaseId")} className="rounded border border-slate-300 px-3 py-2">
        <option value="">— Lô nhập (nếu có) —</option>
        {purchases.map((p) => (
          <option key={p.id} value={p.id}>{p.supplier} · {new Date(p.date).toLocaleDateString("vi-VN")}</option>
        ))}
      </select>
      <input value={form.weightGrams} onChange={set("weightGrams")} type="number" placeholder="Khối lượng (g)" className="rounded border border-slate-300 px-3 py-2" />
      <input value={form.purchaseCostVnd} onChange={set("purchaseCostVnd")} type="number" placeholder="Giá nhập (đ)" className="rounded border border-slate-300 px-3 py-2" />
      <input value={form.listPriceVnd} onChange={set("listPriceVnd")} type="number" placeholder="Giá bán (đ)" className="rounded border border-slate-300 px-3 py-2" />
      <input value={form.defectsNote} onChange={set("defectsNote")} placeholder="Lỗi / ghi chú (vd góc cong nhẹ)" className="sm:col-span-2 rounded border border-slate-300 px-3 py-2" />
      {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button type="button" onClick={onReset} className="rounded bg-slate-200 px-4 py-2">Hủy</button>
        <button type="submit" disabled={submitting} className="rounded bg-blue-600 px-6 py-2 text-white disabled:opacity-50">{submitting ? "Đang lưu..." : "Lưu vào kho"}</button>
      </div>
    </form>
  );
}