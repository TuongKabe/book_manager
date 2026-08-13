"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, MagnifyingGlass, Book } from "@phosphor-icons/react";
import { toDateInputValue } from "@/lib/date";
import Modal from "./ui/Modal";
import { Field, Input, Select, Textarea } from "./ui/Field";
import Banner from "./ui/Banner";
import Button from "./ui/Button";

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
    [orderBooks],
  );
  const totalWeight = useMemo(
    () => orderBooks.reduce((sum, b) => sum + (b.weightGrams ?? 0), 0),
    [orderBooks],
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

  function clearAll() {
    const ids = orderBooks.map((b) => b.id);
    setOrderBooks([]);
    setRemovedBookIds((prev) => Array.from(new Set([...prev, ...ids])));
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
    setForm({
      date: new Date().toISOString().slice(0, 10),
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      channel: "",
      note: "",
      weightGrams: "",
      shippingFee: "",
      shippingUnit: "GHN",
    });
    setOrderBooks([]);
    setRemovedBookIds([]);
    setAvailableBooks([]);
    setBookSearch("");
    setError("");
    onClose();
  }

  return (
    <Modal
      open={isOpen}
      onClose={resetAndClose}
      title={isEdit ? "Sửa đơn bán" : "Tạo đơn bán"}
      description={isEdit ? "Cập nhật thông tin đơn và sách đã chọn." : "Chọn sách từ kho, nhập thông tin khách và hoàn tất đơn."}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={orderBooks.length === 0}
          >
            {isEdit ? "Cập nhật" : "Lưu"} đơn ({orderBooks.length} sách)
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Banner tone="danger">{error}</Banner>}

        {/* Customer */}
        <fieldset className="space-y-3">
          <legend className="mb-1 text-[12px] font-medium uppercase tracking-wider text-ink-faint">
            Khách hàng
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ngày" required>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Kênh bán">
              <Input
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                placeholder="Chợ Tốt, Shopee, Facebook…"
              />
            </Field>
          </div>
          <Field label="Tên khách">
            <Input
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SĐT">
              <Input
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              />
            </Field>
            <Field
              label="Cân nặng (g)"
              hint={totalWeight > 0 ? `Tự động: ${totalWeight}g` : undefined}
            >
              <Input
                type="number"
                value={form.weightGrams}
                onChange={(e) => setForm({ ...form, weightGrams: e.target.value })}
                placeholder={totalWeight > 0 ? `${totalWeight}` : "auto từ sách"}
              />
            </Field>
          </div>
          <Field label="Địa chỉ">
            <Input
              value={form.customerAddress}
              onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
            />
          </Field>
          <Field label="Ghi chú">
            <Textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Ví dụ: đóng gói cẩn thận, giao giờ hành chính…"
            />
          </Field>
        </fieldset>

        {/* Order books */}
        <fieldset>
          <div className="mb-2 flex items-center justify-between">
            <legend className="text-[12px] font-medium uppercase tracking-wider text-ink-faint">
              Sách trong đơn · {orderBooks.length}
            </legend>
            {orderBooks.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Bỏ tất cả
              </Button>
            )}
          </div>
          {orderBooks.length === 0 ? (
            <div className="rounded-md border border-dashed border-hairline-strong bg-surface-soft px-3 py-6 text-center text-[12.5px] text-ink-faint">
              Chưa có sách — chọn từ kho bên dưới.
            </div>
          ) : (
            <ul className="max-h-40 space-y-1.5 overflow-auto rounded-md border border-hairline bg-surface-soft p-2">
              {orderBooks.map((b) => (
                <li key={b.id} className="flex items-center gap-2 rounded-md bg-surface p-2">
                  <div className="flex h-8 w-6 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-hairline bg-surface-soft">
                    {b.coverPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.coverPhotoUrl} alt={b.title} className="h-full w-full object-cover" />
                    ) : (
                      <Book size={12} weight="duotone" className="text-ink-faint" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{b.title}</p>
                    <p className="font-tabular text-[10.5px] text-ink-faint">
                      {b.isbn ?? "—"} · {b.listPriceVnd?.toLocaleString("vi-VN")}đ · {b.weightGrams ?? 0}g
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeOrderBook(b.id)}>
                    Bỏ
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        {/* Pick from inventory */}
        <fieldset>
          <legend className="mb-2 block text-[12px] font-medium uppercase tracking-wider text-ink-faint">
            Thêm sách từ kho
          </legend>
          <div className="relative mb-2">
            <MagnifyingGlass
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <Input
              value={bookSearch}
              onChange={(e) => setBookSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc ISBN…"
              className="pl-8"
            />
          </div>
          <div className="max-h-44 overflow-auto rounded-md border border-hairline bg-surface p-1">
            {filteredAvailable.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12.5px] text-ink-faint">
                {bookSearch ? "Không tìm thấy sách khả dụng" : "Hết sách khả dụng trong kho"}
              </p>
            ) : (
              <ul className="space-y-0.5">
                {filteredAvailable.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-soft"
                  >
                    <div className="flex h-8 w-6 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-hairline bg-surface-soft">
                      {b.coverPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.coverPhotoUrl} alt={b.title} className="h-full w-full object-cover" />
                      ) : (
                        <Book size={12} weight="duotone" className="text-ink-faint" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-ink">{b.title}</p>
                      <p className="truncate font-mono text-[10px] text-ink-faint">
                        {b.isbn ?? "—"} · {b.listPriceVnd?.toLocaleString("vi-VN")}đ
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => addBook(b)}
                      iconLeft={<Plus size={12} weight="bold" />}
                    >
                      Thêm
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </fieldset>

        {/* Shipping */}
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sm:col-span-2 -mb-2 text-[12px] font-medium uppercase tracking-wider text-ink-faint">
            Vận chuyển
          </legend>
          <Field label="Phí ship (đ)">
            <Input
              type="number"
              value={form.shippingFee}
              onChange={(e) => setForm({ ...form, shippingFee: e.target.value })}
              placeholder="0"
            />
          </Field>
          <Field label="Đơn vị vận chuyển">
            <Select
              value={form.shippingUnit}
              onChange={(e) => setForm({ ...form, shippingUnit: e.target.value })}
            >
              {SHIPPING_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </Field>
        </fieldset>

        {/* Summary */}
        <div className="grid grid-cols-3 divide-x divide-hairline rounded-lg border border-hairline bg-surface-soft">
          <SummaryCell label="Sách" value={String(orderBooks.length)} />
          <SummaryCell
            label="Tiền sách"
            value={subtotal > 0 ? `${subtotal.toLocaleString("vi-VN")}đ` : "—"}
          />
          <SummaryCell
            label="Tổng cộng"
            value={grandTotal > 0 ? `${grandTotal.toLocaleString("vi-VN")}đ` : "—"}
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
