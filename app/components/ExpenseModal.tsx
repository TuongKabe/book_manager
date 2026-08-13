"use client";

import { useState } from "react";
import { toDateInputValue } from "@/lib/date";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import Modal from "./ui/Modal";
import { Field, Input, Select, Textarea } from "./ui/Field";
import Banner from "./ui/Banner";
import Button from "./ui/Button";

type InitialExpense = {
  id: string;
  date: Date | string;
  category: string;
  amountVnd: number;
  note: string | null;
};

export default function ExpenseModal({
  isOpen,
  onClose,
  onSaved,
  initialExpense,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (expense: { id: string; date: Date | string; category: string; amountVnd: number; note: string | null }) => void;
  initialExpense?: InitialExpense;
}) {
  const isEdit = !!initialExpense;

  const [form, setForm] = useState(() => ({
    date: initialExpense ? toDateInputValue(initialExpense.date) : new Date().toISOString().slice(0, 10),
    category: initialExpense?.category ?? EXPENSE_CATEGORIES[0],
    amountVnd: initialExpense ? String(initialExpense.amountVnd ?? "") : "",
    note: initialExpense?.note ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!form.amountVnd || Number(form.amountVnd) <= 0) {
      setError("Nhập số tiền hợp lệ");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (isEdit && initialExpense) {
        const res = await fetch(`/api/expenses/${initialExpense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: form.date,
            category: form.category,
            amountVnd: Number(form.amountVnd),
            note: form.note || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Lỗi cập nhật");
          setSaving(false);
          return;
        }
        const updated = await res.json();
        onSaved({ ...updated, date: updated.date });
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: form.date,
            category: form.category,
            amountVnd: Number(form.amountVnd),
            note: form.note || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Có lỗi xảy ra");
          setSaving(false);
          return;
        }
        const created = await res.json();
        onSaved({ ...created, date: created.date });
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
      category: EXPENSE_CATEGORIES[0],
      amountVnd: "",
      note: "",
    });
    setError("");
    onClose();
  }

  return (
    <Modal
      open={isOpen}
      onClose={resetAndClose}
      title={isEdit ? "Sửa chi phí" : "Thêm chi phí"}
      description={isEdit ? "Cập nhật khoản chi đã ghi nhận." : "Ghi nhận một khoản chi ngoài giá vốn sách."}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>Hủy</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            {isEdit ? "Cập nhật" : "Thêm"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Banner tone="danger">{error}</Banner>}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ngày" required>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label="Số tiền (đ)" required>
            <Input
              type="number"
              inputMode="numeric"
              value={form.amountVnd}
              onChange={(e) => setForm({ ...form, amountVnd: e.target.value })}
              placeholder="0"
            />
          </Field>
        </div>
        <Field label="Loại" required>
          <Select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ghi chú">
          <Textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Mô tả ngắn gọn…"
          />
        </Field>
      </div>
    </Modal>
  );
}
