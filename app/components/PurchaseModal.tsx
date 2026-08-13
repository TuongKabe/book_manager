"use client";

import { useState, useMemo } from "react";
import { Plus, Book } from "@phosphor-icons/react";
import ISBNScanner from "./ISBNScanner";
import { toDateInputValue } from "@/lib/date";
import Modal from "./ui/Modal";
import { Field, Input, Select, Textarea } from "./ui/Field";
import Banner from "./ui/Banner";
import Button from "./ui/Button";
import Pill from "./ui/Pill";

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

  function clearAll() {
    setRemovedIds(existingBooks.map((b) => b.id));
    setNewBooks([]);
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
        const perBookWeight =
          numNew > 0 && weightGramsNum > 0 ? Math.floor(weightGramsNum / totalBookCount) : null;

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
    setBatch({
      date: new Date().toISOString().slice(0, 10),
      supplier: "",
      totalCost: "",
      weightGrams: "",
      note: "",
    });
    setExistingBooks([]);
    setRemovedIds([]);
    setNewBooks([]);
    setCurrentBook(null);
    setError("");
    onClose();
  }

  return (
    <Modal
      open={isOpen}
      onClose={resetAndClose}
      title={isEdit ? "Sửa lô nhập" : "Thêm lô nhập mới"}
      description={
        isEdit
          ? "Cập nhật thông tin lô và quản lý sách trong lô."
          : "Quét ISBN hoặc nhập thủ công để thêm sách vào lô."
      }
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>Hủy</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={!batch.supplier.trim() || stats.count === 0}
          >
            {isEdit ? `Cập nhật lô (${stats.count} sách)` : `Lưu lô (${stats.count} sách)`}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Banner tone="danger">{error}</Banner>}

        {/* Batch info */}
        <fieldset className="space-y-3">
          <legend className="mb-1 text-[12px] font-medium uppercase tracking-wider text-ink-faint">
            Thông tin lô
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ngày" required>
              <Input
                type="date"
                value={batch.date}
                onChange={(e) => setBatch({ ...batch, date: e.target.value })}
              />
            </Field>
            <Field label="Nhà cung cấp" required>
              <Input
                value={batch.supplier}
                onChange={(e) => setBatch({ ...batch, supplier: e.target.value })}
              />
            </Field>
            <Field label="Tổng chi (đ)" required>
              <Input
                type="number"
                value={batch.totalCost}
                onChange={(e) => setBatch({ ...batch, totalCost: e.target.value })}
              />
            </Field>
            <Field label="Cân nặng lô (g)">
              <Input
                type="number"
                value={batch.weightGrams}
                onChange={(e) => setBatch({ ...batch, weightGrams: e.target.value })}
                placeholder="vd: 5000"
              />
            </Field>
          </div>
          <Field label="Ghi chú">
            <Textarea
              value={batch.note}
              onChange={(e) => setBatch({ ...batch, note: e.target.value })}
              placeholder="Nguồn sách, tình trạng tổng thể…"
            />
          </Field>
        </fieldset>

        {/* Books in batch */}
        <fieldset>
          <div className="mb-2 flex items-center justify-between">
            <legend className="text-[12px] font-medium uppercase tracking-wider text-ink-faint">
              Sách trong lô · {stats.count}
            </legend>
            {(existingBooks.length > 0 || newBooks.length > 0) && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Bỏ tất cả
              </Button>
            )}
          </div>
          {stats.count === 0 ? (
            <div className="rounded-md border border-dashed border-hairline-strong bg-surface-soft px-3 py-6 text-center text-[12.5px] text-ink-faint">
              Chưa có sách — quét ISBN bên dưới để thêm.
            </div>
          ) : (
            <ul className="max-h-44 space-y-1.5 overflow-auto rounded-md border border-hairline bg-surface-soft p-2">
              {remainingExisting.map((b) => (
                <li key={b.id} className="flex items-center gap-2 rounded-md bg-surface p-2">
                  <div className="flex h-10 w-7 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-hairline bg-surface-soft">
                    {b.coverPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.coverPhotoUrl} alt={b.title} className="h-full w-full object-cover" />
                    ) : (
                      <Book size={12} weight="duotone" className="text-ink-faint" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {b.title} <Pill tone="neutral" size="sm">đã có</Pill>
                    </p>
                    <p className="truncate font-mono text-[10.5px] text-ink-faint">
                      {b.isbn ?? "—"} · {b.condition ?? "—"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeExistingBook(b.id)}>
                    Bỏ
                  </Button>
                </li>
              ))}
              {newBooks.map((b, i) => (
                <li
                  key={`${b.isbn}-${i}`}
                  className="flex items-center gap-2 rounded-md bg-brand-soft p-2"
                >
                  <div className="flex h-10 w-7 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-hairline bg-surface">
                    {b.coverPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.coverPhotoUrl} alt={b.title} className="h-full w-full object-cover" />
                    ) : (
                      <Book size={12} weight="duotone" className="text-ink-faint" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {b.title} <Pill tone="brand" size="sm">mới</Pill>
                    </p>
                    <p className="truncate font-mono text-[10.5px] text-ink-faint">
                      {b.isbn ?? "—"} · {b.condition}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeNewBook(b.isbn)}>
                    Xóa
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        {/* Scanner */}
        <fieldset>
          <legend className="mb-2 block text-[12px] font-medium uppercase tracking-wider text-ink-faint">
            Thêm sách vào lô
          </legend>
          <div className="rounded-md border border-hairline bg-surface-soft p-3">
            <ISBNScanner onFound={handleScan} autoStartKey={scanKey} />
          </div>
        </fieldset>

        {/* Current scan adjustment */}
        {currentBook && (
          <div className="rounded-md border border-brand bg-brand-soft p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12.5px] font-medium text-brand-deep">
                Điều chỉnh thông tin sách trước khi thêm
              </p>
              <button
                onClick={cancelCurrentBook}
                className="text-[12px] text-ink-faint underline-offset-2 hover:underline"
              >
                Bỏ qua
              </button>
            </div>
            <div className="flex gap-3">
              {currentBook.coverPhotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentBook.coverPhotoUrl}
                  alt={currentBook.title}
                  className="h-20 w-14 shrink-0 rounded-md object-cover"
                />
              )}
              <div className="flex-1 space-y-2">
                <Input
                  value={currentBook.title}
                  onChange={(e) => setCurrentBook({ ...currentBook, title: e.target.value })}
                  placeholder="Tiêu đề *"
                />
                <Input
                  value={currentBook.author}
                  onChange={(e) => setCurrentBook({ ...currentBook, author: e.target.value })}
                  placeholder="Tác giả"
                />
                <div className="flex gap-2">
                  <Input
                    value={currentBook.category}
                    onChange={(e) => setCurrentBook({ ...currentBook, category: e.target.value })}
                    placeholder="Phân loại"
                  />
                  <Select
                    value={currentBook.condition}
                    onChange={(e) => setCurrentBook({ ...currentBook, condition: e.target.value })}
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={addCurrentBook}
                disabled={!currentBook.title.trim()}
                iconLeft={<Plus size={14} weight="bold" />}
              >
                Thêm vào lô
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-hairline rounded-lg border border-hairline bg-surface-soft">
          <SummaryCell label="Tổng sách" value={String(stats.count)} />
          <SummaryCell
            label="Giá TB / sách mới"
            value={stats.avgCost > 0 ? `${stats.avgCost.toLocaleString("vi-VN")}đ` : "—"}
            accent="brand"
          />
          <SummaryCell
            label="Cân nặng TB / sách mới"
            value={stats.avgWeight > 0 ? `${stats.avgWeight}g` : "—"}
            accent="brand"
          />
        </div>
      </div>
    </Modal>
  );
}

function SummaryCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "brand" | "neutral";
}) {
  return (
    <div className="px-4 py-3 text-center">
      <p className="text-[10.5px] font-medium uppercase tracking-wider text-ink-faint">{label}</p>
      <p
        className={[
          "font-tabular text-[18px] font-semibold leading-tight",
          accent === "brand" ? "text-brand" : "text-ink",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
