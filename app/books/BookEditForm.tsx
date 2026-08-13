"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import type { BookRow } from "./BookListClient";
import EditModal from "@/app/components/EditModal";
import { Field, Input, Select, Textarea } from "@/app/components/ui/Field";
import Banner from "@/app/components/ui/Banner";

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
    listPriceVnd: book.listPriceVnd != null ? String(book.listPriceVnd) : "",
    purchaseCostVnd: book.purchaseCostVnd != null ? String(book.purchaseCostVnd) : "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
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
    <EditModal
      title="Sửa sách"
      description={book.title}
      onClose={onClose}
      onSave={submit}
      saving={saving}
    >
      {error && <Banner tone="danger">{error}</Banner>}
      <div className="space-y-3">
        <Field label="Tiêu đề">
          <Input value={form.title} onChange={set("title")} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tác giả">
            <Input value={form.author} onChange={set("author")} placeholder="Tác giả" />
          </Field>
          <Field label="Phân loại">
            <Input value={form.category} onChange={set("category")} placeholder="Phân loại" />
          </Field>
        </div>
        <Field label="Tình trạng">
          <Select value={form.condition} onChange={set("condition")}>
            {book.condition && !CONDITIONS.includes(book.condition) && (
              <option value={book.condition}>{book.condition}</option>
            )}
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Giá bán (đ)">
            <Input
              value={form.listPriceVnd}
              onChange={set("listPriceVnd")}
              type="number"
              inputMode="numeric"
              placeholder="0"
            />
          </Field>
          <Field label="Giá nhập (đ)">
            <Input
              value={form.purchaseCostVnd}
              onChange={set("purchaseCostVnd")}
              type="number"
              inputMode="numeric"
              placeholder="0"
            />
          </Field>
        </div>
        <Field label="Ghi chú">
          <Textarea value={form.notes} onChange={set("notes")} placeholder="Ghi chú thêm…" />
        </Field>
      </div>
    </EditModal>
  );
}
