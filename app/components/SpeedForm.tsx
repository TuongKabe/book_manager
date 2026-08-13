"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { CheckCircle, X } from "@phosphor-icons/react";
import type { BookInfo } from "./SpeedScanner";
import Button from "./ui/Button";
import { Field, Input, Select, Textarea } from "./ui/Field";
import Banner from "./ui/Banner";

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

  const set =
    (k: string) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
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
      <div className="flex flex-col items-center gap-3 rounded-lg border border-success bg-success-soft p-6 text-center">
        <CheckCircle size={32} weight="duotone" className="text-success" />
        <div>
          <p className="font-semibold text-success">Đã lưu &ldquo;{form.title}&rdquo; vào kho.</p>
          <p className="mt-1 text-[13px] text-ink-faint">Tiếp tục quét cuốn tiếp theo.</p>
        </div>
        <Button variant="primary" onClick={onReset}>
          Thêm cuốn khác
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4 rounded-lg border border-hairline bg-surface p-4 shadow-xs">
      <div className="flex gap-4 border-b border-hairline pb-3">
        <div className="flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-hairline bg-surface-soft">
          {book.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.thumbnail} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <X size={20} className="text-ink-faint" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-tabular text-[15px] font-semibold leading-tight tracking-tight text-ink">
            {book.title}
          </p>
          <p className="mt-1 truncate text-[13px] text-ink-muted">{book.author}</p>
          <p className="mt-2 font-mono text-[11px] text-ink-faint">ISBN · {isbn}</p>
        </div>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tiêu đề" required className="sm:col-span-2">
          <Input value={form.title} onChange={set("title")} required />
        </Field>
        <Field label="Tác giả">
          <Input value={form.author} onChange={set("author")} placeholder="Tác giả" />
        </Field>
        <Field label="Phân loại">
          <Input value={form.category} onChange={set("category")} placeholder="Phân loại" />
        </Field>
        <Field label="Tình trạng">
          <Select value={form.condition} onChange={set("condition")}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lô nhập (tuỳ chọn)">
          <Select value={form.purchaseId} onChange={set("purchaseId")}>
            <option value="">— Lô nhập (nếu có) —</option>
            {purchases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.supplier} · {new Date(p.date).toLocaleDateString("vi-VN")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Khối lượng (g)">
          <Input value={form.weightGrams} onChange={set("weightGrams")} type="number" inputMode="numeric" placeholder="0" />
        </Field>
        <Field label="Giá nhập (đ)">
          <Input value={form.purchaseCostVnd} onChange={set("purchaseCostVnd")} type="number" inputMode="numeric" placeholder="0" />
        </Field>
        <Field label="Giá bán (đ)">
          <Input value={form.listPriceVnd} onChange={set("listPriceVnd")} type="number" inputMode="numeric" placeholder="0" />
        </Field>
        <Field label="Lỗi / ghi chú" className="sm:col-span-2">
          <Textarea
            value={form.defectsNote}
            onChange={set("defectsNote")}
            placeholder="vd: góc cong nhẹ, bìa xước"
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 border-t border-hairline pt-3">
        <Button variant="secondary" type="button" onClick={onReset}>
          Hủy
        </Button>
        <Button variant="primary" type="submit" loading={submitting}>
          Lưu vào kho
        </Button>
      </div>
    </form>
  );
}
