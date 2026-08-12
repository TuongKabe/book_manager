"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import type { BookRow } from "./BookListClient";
import EditModal from "@/app/components/EditModal";

const CONDITIONS = ["NEW", "LIKE_NEW", "VG", "GOOD", "FAIR", "POOR"];

export default function BookEditForm({
  book,
  onClose,
  onSaved,
}: {
  book: BookRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: book.title,
    author: book.author ?? "",
    category: book.category ?? "",
    condition: book.condition ?? "VG",
    listPriceVnd: book.listPriceVnd ?? "",
    purchaseCostVnd: book.purchaseCostVnd ?? "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/books/${book.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        author: form.author || null,
        category: form.category || null,
        condition: form.condition,
        listPriceVnd: form.listPriceVnd ? Number(form.listPriceVnd) : null,
        purchaseCostVnd: form.purchaseCostVnd ? Number(form.purchaseCostVnd) : null,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  return (
    <EditModal title="Sửa sách" onClose={onClose} onSave={submit} saving={saving}>
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
      <input value={form.title} onChange={set("title")} placeholder="Tiêu đề" className="w-full rounded border border-slate-300 px-3 py-2" />
      <input value={form.author} onChange={set("author")} placeholder="Tác giả" className="w-full rounded border border-slate-300 px-3 py-2" />
      <input value={form.category} onChange={set("category")} placeholder="Phân loại" className="w-full rounded border border-slate-300 px-3 py-2" />
      <select value={form.condition} onChange={set("condition")} className="w-full rounded border border-slate-300 px-3 py-2">
        {book.condition && !CONDITIONS.includes(book.condition) && (
          <option value={book.condition}>{book.condition}</option>
        )}
        {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input value={form.listPriceVnd} onChange={set("listPriceVnd")} type="number" placeholder="Giá bán (đ)" className="w-full rounded border border-slate-300 px-3 py-2" />
      <input value={form.purchaseCostVnd} onChange={set("purchaseCostVnd")} type="number" placeholder="Giá nhập (đ)" className="w-full rounded border border-slate-300 px-3 py-2" />
      <input value={form.notes} onChange={set("notes")} placeholder="Ghi chú" className="w-full rounded border border-slate-300 px-3 py-2" />
    </EditModal>
  );
}
