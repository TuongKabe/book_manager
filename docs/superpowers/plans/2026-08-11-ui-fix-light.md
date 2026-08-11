# Fix light UI + Edit cho 3 bảng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm edit (PATCH) cho Orders/Purchases/Expenses, fix res.ok + error UI toàn app, fix timezone date, thêm empty states, và review UI fix nhẹ.

**Architecture:** Mở rộng pattern PATCH đã có ở `/api/books/[id]` sang 3 route `[id]` còn lại; modal chung `EditModal` + 3 form edit riêng; helper `lib/date.ts` dùng cho mọi parse date-only; state message lỗi cục bộ mỗi component.

**Tech Stack:** Next.js 16.3 (App Router, Server/Client Components), Prisma (PostgreSQL/Neon), Tailwind v4, Vitest.

## Global Constraints

- Server component pages dùng `prisma` TRỰC TIẾP, tuyệt đối KHÔNG internal fetch self-call absolute URL (bài học Task 11 — fail prod + middleware 401 loop).
- `lib/date.ts` helper: `parseDateOnly` noon-UTC `new Date(s + "T12:00:00.000Z")`; `toDateInputValue` trả `YYYY-MM-DD` local.
- Mọi fetch ghi phải check `res.ok`; lỗi hiển thị banner đỏ `rounded bg-red-100 px-3 py-2 text-red-700 text-sm`.
- Date hiển thị giữ nguyên `toLocaleDateString("vi-VN")`.
- KHÔNG đụng schema/db migration. KHÔNG thêm thư viện. UI tiếng Việt.
- Next 16.3: route params là `Promise<{ id: string }>` (await params); `"use client"` cho mọi client component.
- Path alias `@/` → `src`-level: `@/lib/date`, `@/app/components/EditModal`, `@/lib/prisma`.

---

### Task 1: Helper lib/date.ts + unit test

**Files:**
- Create: `lib/date.ts`
- Test: `tests/date.test.ts`

**Interfaces:**
- Produces:
  - `parseDateOnly(s: string): Date` — trả `new Date(s + "T12:00:00.000Z")`.
  - `toDateInputValue(d: Date | string): string` — trả `YYYY-MM-DD` theo **local time** của `new Date(d)`.
- Consumes: không.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { parseDateOnly, toDateInputValue } from "@/lib/date";

describe("parseDateOnly", () => {
  it("noon UTC không đổi ngày ở mọi timezone phổ biến", () => {
    for (const tz of ["+07:00", "+00:00", "-08:00", "+12:00"]) {
      const d = parseDateOnly("2026-08-11");
      const iso = d.toISOString();
      expect(iso).toBe("2026-08-11T12:00:00.000Z");
    }
  });
});

describe("toDateInputValue", () => {
  it("chuyển Date thành YYYY-MM-DD local", () => {
    const d = new Date("2026-08-11T12:00:00.000Z");
    expect(toDateInputValue(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/date.test.ts`
Expected: FAIL — cannot find module `@/lib/date`.

- [ ] **Step 3: Write minimal implementation**

```ts
export function parseDateOnly(s: string): Date {
  return new Date(`${s}T12:00:00.000Z`);
}

export function toDateInputValue(d: Date | string): string {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/date.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/date.ts tests/date.test.ts
git commit -m "feat: add date helpers (parseDateOnly, toDateInputValue)"
```

---

### Task 2: PATCH /api/orders/[id] + parseDateOnly trong orders POST

**Files:**
- Modify: `app/api/orders/route.ts:9-20` (POST — dùng parseDateOnly cho date)
- Modify: `app/api/orders/[id]/route.ts` (thêm PATCH)

**Interfaces:**
- Consumes: `parseDateOnly` (Task 1).
- Produces: `PATCH /api/orders/[id]` nhận `{date?, channel?, totalVnd?, note?}` → `NextResponse.json(order)` (object updated).
- Consumer: `OrderEditForm` (Task 7).

- [ ] **Step 1: Sửa POST orders dùng parseDateOnly**

Trong `app/api/orders/route.ts`, thay dòng:
```ts
date: body.date ? new Date(body.date) : new Date(),
```
thành:
```ts
import { parseDateOnly } from "@/lib/date";
// ...
date: body.date ? parseDateOnly(body.date) : new Date(),
```
Thêm import `parseDateOnly` lên đầu file.

- [ ] **Step 2: Thêm PATCH vào app/api/orders/[id]/route.ts**

Thêm hàm (giữ nguyên DELETE):

```ts
import { parseDateOnly } from "@/lib/date";

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("date" in body) data.date = body.date ? parseDateOnly(body.date) : new Date();
  if ("channel" in body) data.channel = body.channel ?? null;
  if ("totalVnd" in body) data.totalVnd = body.totalVnd ? Number(body.totalVnd) : null;
  if ("note" in body) data.note = body.note ?? null;
  const order = await prisma.order.update({ where: { id }, data });
  return NextResponse.json(order);
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Test cũ vẫn pass**

Run: `npm test`
Expected: 18/18 pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/orders/route.ts app/api/orders/[id]/route.ts
git commit -m "feat: orders patch + date parse via lib/date"
```

---

### Task 3: PATCH /api/purchases/[id] + parseDateOnly trong purchases POST

**Files:**
- Modify: `app/api/purchases/route.ts:12-23` (POST — parseDateOnly)
- Modify: `app/api/purchases/[id]/route.ts` (create — thêm PATCH)

**Interfaces:**
- Consumes: `parseDateOnly` (Task 1).
- Produces: `PATCH /api/purchases/[id]` nhận `{date?, supplier?, totalCost?, note?}` → `NextResponse.json(purchase)`.
- Consumer: `PurchaseEditForm` (Task 8).

- [ ] **Step 1: Sửa POST purchases dùng parseDateOnly**

Trong `app/api/purchases/route.ts`, thêm import `parseDateOnly` từ `@/lib/date` và thay:
```ts
date: body.date ? new Date(body.date) : new Date(),
```
thành:
```ts
date: body.date ? parseDateOnly(body.date) : new Date(),
```

- [ ] **Step 2: Tạo app/api/purchases/[id]/route.ts**

File mới đầy đủ:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/date";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("date" in body) data.date = body.date ? parseDateOnly(body.date) : new Date();
  if ("supplier" in body) data.supplier = String(body.supplier ?? "");
  if ("totalCost" in body) data.totalCost = body.totalCost ? Number(body.totalCost) : 0;
  if ("note" in body) data.note = body.note ?? null;
  const purchase = await prisma.purchase.update({ where: { id }, data });
  return NextResponse.json(purchase);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.purchase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Test cũ vẫn pass**

Run: `npm test`
Expected: 18/18 pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/purchases/route.ts app/api/purchases/[id]/route.ts
git commit -m "feat: purchases patch + date parse via lib/date"
```

---

### Task 4: PATCH /api/expenses/[id] + parseDateOnly trong expenses POST

**Files:**
- Modify: `app/api/expenses/route.ts:9-20` (POST — parseDateOnly)
- Modify: `app/api/expenses/[id]/route.ts` (thêm PATCH)

**Interfaces:**
- Consumes: `parseDateOnly` (Task 1).
- Produces: `PATCH /api/expenses/[id]` nhận `{date?, category?, amountVnd?, note?}` → `NextResponse.json(expense)`.
- Consumer: `ExpenseEditForm` (Task 9).

- [ ] **Step 1: Sửa POST expenses dùng parseDateOnly**

Trong `app/api/expenses/route.ts`, thêm import `parseDateOnly` và thay:
```ts
date: body.date ? new Date(body.date) : new Date(),
```
thành:
```ts
date: body.date ? parseDateOnly(body.date) : new Date(),
```

- [ ] **Step 2: Thêm PATCH vào app/api/expenses/[id]/route.ts**

```ts
import { parseDateOnly } from "@/lib/date";

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("date" in body) data.date = body.date ? parseDateOnly(body.date) : new Date();
  if ("category" in body) data.category = String(body.category ?? "");
  if ("amountVnd" in body) data.amountVnd = body.amountVnd ? Number(body.amountVnd) : 0;
  if ("note" in body) data.note = body.note ?? null;
  const expense = await prisma.expense.update({ where: { id }, data });
  return NextResponse.json(expense);
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Test cũ vẫn pass**

Run: `npm test`
Expected: 18/18 pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/expenses/route.ts app/api/expenses/[id]/route.ts
git commit -m "feat: expenses patch + date parse via lib/date"
```

---

### Task 5: parseDateOnly trong books POST + PATCH

**Files:**
- Modify: `app/api/books/route.ts` (POST — soldDate parse)
- Modify: `app/api/books/[id]/route.ts:20-23` (PATCH — soldDate parse)

**Interfaces:**
- Consumes: `parseDateOnly` (Task 1).
- Produces: soldDate từ body dạng `"YYYY-MM-DD"` được lưu đúng ngày (không lệch 1 ngày).
- Consumer: không (API).

- [ ] **Step 1: Sửa app/api/books/route.ts**

Đọc file hiện tại để tìm chỗ set soldDate trong POST. Thêm import `parseDateOnly` từ `@/lib/date`. Với mọi chỗ `new Date(body.soldDate)` hoặc tương đương khi `body.soldDate` là chuỗi ngày-only, thay bằng `parseDateOnly(body.soldDate)`. Nếu POST không xử lý soldDate (chỉ SOLD default), chỉ cần thêm import và giữ nguyên phần còn lại — mục tiêu là khi có `body.soldDate` dạng date-only thì parse đúng.

- [ ] **Step 2: Sửa app/api/books/[id]/route.ts**

Thay khối:
```ts
  if (body.status === "SOLD") {
    data.soldDate = body.soldDate ? new Date(body.soldDate) : new Date();
  }
```
thành:
```ts
  if (body.status === "SOLD") {
    data.soldDate = body.soldDate ? parseDateOnly(body.soldDate) : new Date();
  }
```
và thêm import `parseDateOnly`.

- [ ] **Step 3: Build + test**

Run: `npm run build` → PASS; `npm test` → 18/18 pass.

- [ ] **Step 4: Commit**

```bash
git add app/api/books/route.ts "app/api/books/[id]/route.ts"
git commit -m "fix: use parseDateOnly for soldDate in books routes"
```

---

### Task 6: Component EditModal chung

**Files:**
- Create: `app/components/EditModal.tsx`

**Interfaces:**
- Consumes: không.
- Produces:
  ```
  EditModal({ title, onClose, onSave, saving?, children }):
    title: string; onClose: () => void; onSave: () => void;
    saving?: boolean; children: React.ReactNode
  ```
- Consumers: `OrderEditForm`, `PurchaseEditForm`, `ExpenseEditForm` (Task 7/8/9).

- [ ] **Step 1: Tạo file**

```tsx
"use client";

import type { ReactNode } from "react";

export default function EditModal({
  title,
  onClose,
  onSave,
  saving = false,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-auto rounded-xl bg-white p-5">
        <h2 className="text-lg font-bold">{title}</h2>
        {children}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded bg-slate-200 px-4 py-2">Hủy</button>
          <button onClick={onSave} disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white">
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/components/EditModal.tsx
git commit -m "feat: shared EditModal component"
```

---

### Task 7: OrderClient — nút Sửa + OrderEditForm + error UI + empty state

**Files:**
- Create: `app/orders/OrderEditForm.tsx`
- Modify: `app/orders/OrderClient.tsx`

**Interfaces:**
- Consumes: `EditModal` (Task 6), `toDateInputValue` (Task 1), `PATCH /api/orders/[id]` (Task 2).
- Produces: `OrderEditForm({ order, onClose, onSaved })` trong đó `onSaved: (updated: OrderRow) => void`.
- Consumer: không (trang orders).

- [ ] **Step 1: Tạo app/orders/OrderEditForm.tsx**

```tsx
"use client";

import { useState } from "react";
import EditModal from "@/app/components/EditModal";
import { toDateInputValue } from "@/lib/date";

type OrderRow = { id: string; date: Date | string; channel: string | null; totalVnd: number | null; note: string | null };

export default function OrderEditForm({
  order,
  onClose,
  onSaved,
}: {
  order: OrderRow;
  onClose: () => void;
  onSaved: (updated: OrderRow) => void;
}) {
  const [form, setForm] = useState({
    date: toDateInputValue(order.date),
    channel: order.channel ?? "",
    totalVnd: order.totalVnd ?? "",
    note: order.note ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date,
        channel: form.channel || null,
        totalVnd: form.totalVnd ? Number(form.totalVnd) : null,
        note: form.note || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved(await res.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  return (
    <EditModal title="Sửa đơn" onClose={onClose} onSave={save} saving={saving}>
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
      <label className="flex flex-col text-sm">
        Ngày
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Kênh
        <input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} placeholder="Chợ Tốt / Shopee /..." className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Tổng thu (đ)
        <input type="number" value={form.totalVnd} onChange={(e) => setForm({ ...form, totalVnd: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Ghi chú
        <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
    </EditModal>
  );
}
```

- [ ] **Step 2: Sửa app/orders/OrderClient.tsx**

Thay toàn bộ file:

```tsx
"use client";

import { useState } from "react";
import OrderEditForm from "./OrderEditForm";

type OrderRow = { id: string; date: Date | string; channel: string | null; totalVnd: number | null; note: string | null };

export default function OrderClient({ initialOrders }: { initialOrders: OrderRow[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), channel: "", totalVnd: "" });
  const [editing, setEditing] = useState<OrderRow | null>(null);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, totalVnd: form.totalVnd ? Number(form.totalVnd) : null }),
    });
    if (res.ok) {
      const created = await res.json();
      setOrders((list) => [created, ...list]);
      setForm({ date: new Date().toISOString().slice(0, 10), channel: "", totalVnd: "" });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  async function remove(o: OrderRow) {
    if (!confirm("Xóa đơn?")) return;
    const res = await fetch(`/api/orders/${o.id}`, { method: "DELETE" });
    if (res.ok) {
      setOrders((list) => list.filter((x) => x.id !== o.id));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={create} className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4">
        <label className="flex flex-col text-sm">
          Ngày
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">
          Kênh
          <input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} placeholder="Chợ Tốt / Shopee /..." className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">
          Tổng thu (đ)
          <input type="number" value={form.totalVnd} onChange={(e) => setForm({ ...form, totalVnd: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <button className="rounded bg-blue-600 px-4 py-2 text-white">Ghi đơn</button>
      </form>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-400">
          Chưa có đơn hàng — ghi đơn đầu tiên bên trên
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
              <div>
                <p className="font-semibold">{o.channel ?? "Không kênh"}</p>
                <p className="text-sm text-slate-500">{new Date(o.date).toLocaleDateString("vi-VN")}</p>
                {o.totalVnd != null && <p className="mt-1 text-sm">{o.totalVnd.toLocaleString("vi-VN")}đ</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(o)} className="rounded bg-slate-100 px-3 py-1 text-sm">Sửa</button>
                <button onClick={() => remove(o)} className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <OrderEditForm
          order={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setOrders((list) => list.map((x) => (x.id === updated.id ? updated : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Test cũ vẫn pass**

Run: `npm test`
Expected: 18/18 pass.

- [ ] **Step 5: Commit**

```bash
git add app/orders/
git commit -m "feat: edit orders + error banner + empty state"
```

---

### Task 8: PurchaseListClient — nút Sửa + PurchaseEditForm + error UI + empty state

**Files:**
- Create: `app/purchases/PurchaseEditForm.tsx`
- Modify: `app/purchases/PurchaseListClient.tsx`

**Interfaces:**
- Consumes: `EditModal` (Task 6), `toDateInputValue` (Task 1), `PATCH /api/purchases/[id]` (Task 3).
- Produces: `PurchaseEditForm({ purchase, onClose, onSaved })`, `onSaved: (updated: PurchaseRow) => void`.
- Consumer: trang purchases.

- [ ] **Step 1: Tạo app/purchases/PurchaseEditForm.tsx**

```tsx
"use client";

import { useState } from "react";
import EditModal from "@/app/components/EditModal";
import { toDateInputValue } from "@/lib/date";

type PurchaseRow = {
  id: string;
  date: Date | string;
  supplier: string;
  totalCost: number;
  note: string | null;
  _count: { books: number };
  books: { id: string; title: string }[];
};

export default function PurchaseEditForm({
  purchase,
  onClose,
  onSaved,
}: {
  purchase: PurchaseRow;
  onClose: () => void;
  onSaved: (updated: PurchaseRow) => void;
}) {
  const [form, setForm] = useState({
    date: toDateInputValue(purchase.date),
    supplier: purchase.supplier,
    totalCost: purchase.totalCost ?? "",
    note: purchase.note ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/purchases/${purchase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date,
        supplier: form.supplier,
        totalCost: form.totalCost ? Number(form.totalCost) : 0,
        note: form.note || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      onSaved({ ...updated, _count: purchase._count, books: purchase.books });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  return (
    <EditModal title="Sửa lô nhập" onClose={onClose} onSave={save} saving={saving}>
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
      <label className="flex flex-col text-sm">
        Ngày
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Nhà cung cấp
        <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} required className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Tổng chi (đ)
        <input type="number" value={form.totalCost} onChange={(e) => setForm({ ...form, totalCost: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Ghi chú
        <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
    </EditModal>
  );
}
```

- [ ] **Step 2: Sửa app/purchases/PurchaseListClient.tsx**

Thay toàn bộ file:

```tsx
"use client";

import { useState } from "react";
import PurchaseEditForm from "./PurchaseEditForm";

type PurchaseRow = {
  id: string;
  date: Date | string;
  supplier: string;
  totalCost: number;
  note: string | null;
  _count: { books: number };
  books: { id: string; title: string }[];
};

export default function PurchaseListClient({ initialPurchases }: { initialPurchases: PurchaseRow[] }) {
  const [purchases, setPurchases] = useState(initialPurchases);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), supplier: "", totalCost: "" });
  const [editing, setEditing] = useState<PurchaseRow | null>(null);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, totalCost: Number(form.totalCost || 0) }),
    });
    if (res.ok) {
      const created = await res.json();
      setPurchases((list) => [{ ...created, _count: { books: 0 }, books: [] }, ...list]);
      setForm({ date: new Date().toISOString().slice(0, 10), supplier: "", totalCost: "" });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  async function remove(p: PurchaseRow) {
    if (!confirm(`Xóa lô "${p.supplier}"?`)) return;
    const res = await fetch(`/api/purchases/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      setPurchases((list) => list.filter((x) => x.id !== p.id));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={create} className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4">
        <label className="flex flex-col text-sm">
          Ngày
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-1 flex-col text-sm">
          Nhà cung cấp
          <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} required className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">
          Tổng chi (đ)
          <input type="number" value={form.totalCost} onChange={(e) => setForm({ ...form, totalCost: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <button className="rounded bg-blue-600 px-4 py-2 text-white">Thêm lô</button>
      </form>

      {purchases.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-400">
          Chưa có lô nhập — tạo lô bên trên
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {purchases.map((p) => (
            <div key={p.id} className="rounded-xl border bg-white p-4">
              <div className="flex justify-between">
                <p className="font-semibold">{p.supplier}</p>
                <span className="text-sm text-slate-500">{new Date(p.date).toLocaleDateString("vi-VN")}</span>
              </div>
              <p className="mt-1 text-sm">Tổng chi: {p.totalCost.toLocaleString("vi-VN")}đ</p>
              <p className="text-sm text-slate-500">{p._count.books} cuốn</p>
              {p.books.length > 0 && (
                <ul className="mt-2 max-h-24 overflow-auto border-t pt-2 text-xs text-slate-600">
                  {p.books.map((b) => <li key={b.id}>{b.title}</li>)}
                </ul>
              )}
              <div className="mt-2 flex gap-2">
                <button onClick={() => setEditing(p)} className="rounded bg-slate-100 px-3 py-1 text-sm">Sửa</button>
                <button onClick={() => remove(p)} className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <PurchaseEditForm
          purchase={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setPurchases((list) => list.map((x) => (x.id === updated.id ? updated : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Test cũ vẫn pass**

Run: `npm test`
Expected: 18/18 pass.

- [ ] **Step 5: Commit**

```bash
git add app/purchases/
git commit -m "feat: edit purchases + error banner + empty state"
```

---

### Task 9: ExpenseClient — nút Sửa + ExpenseEditForm + error UI + empty state

**Files:**
- Create: `app/expenses/ExpenseEditForm.tsx`
- Modify: `app/expenses/ExpenseClient.tsx`

**Interfaces:**
- Consumes: `EditModal` (Task 6), `toDateInputValue` (Task 1), `PATCH /api/expenses/[id]` (Task 4).
- Produces: `ExpenseEditForm({ expense, onClose, onSaved })`, `onSaved: (updated: ExpenseRow) => void`.
- Consumer: trang expenses.

- [ ] **Step 1: Tạo app/expenses/ExpenseEditForm.tsx**

```tsx
"use client";

import { useState } from "react";
import EditModal from "@/app/components/EditModal";
import { toDateInputValue } from "@/lib/date";

type ExpenseRow = { id: string; date: Date | string; category: string; amountVnd: number; note: string | null };

const CATEGORIES = ["Vận chuyển", "Đóng gói", "Phí nền tảng", "Khác"];

export default function ExpenseEditForm({
  expense,
  onClose,
  onSaved,
}: {
  expense: ExpenseRow;
  onClose: () => void;
  onSaved: (updated: ExpenseRow) => void;
}) {
  const [form, setForm] = useState({
    date: toDateInputValue(expense.date),
    category: expense.category,
    amountVnd: expense.amountVnd ?? "",
    note: expense.note ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date,
        category: form.category,
        amountVnd: form.amountVnd ? Number(form.amountVnd) : 0,
        note: form.note || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved(await res.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  return (
    <EditModal title="Sửa chi phí" onClose={onClose} onSave={save} saving={saving}>
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
      <label className="flex flex-col text-sm">
        Ngày
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Loại
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded border border-slate-300 px-3 py-2">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label className="flex flex-col text-sm">
        Số tiền (đ)
        <input type="number" value={form.amountVnd} onChange={(e) => setForm({ ...form, amountVnd: e.target.value })} required className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col text-sm">
        Ghi chú
        <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
      </label>
    </EditModal>
  );
}
```

- [ ] **Step 2: Sửa app/expenses/ExpenseClient.tsx**

Thay toàn bộ file:

```tsx
"use client";

import { useState } from "react";
import ExpenseEditForm from "./ExpenseEditForm";

type ExpenseRow = { id: string; date: Date | string; category: string; amountVnd: number; note: string | null };

const CATEGORIES = ["Vận chuyển", "Đóng gói", "Phí nền tảng", "Khác"];

export default function ExpenseClient({ initialExpenses }: { initialExpenses: ExpenseRow[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: "Vận chuyển", amountVnd: "" });
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amountVnd: Number(form.amountVnd || 0) }),
    });
    if (res.ok) {
      const created = await res.json();
      setExpenses((list) => [created, ...list]);
      setForm({ date: new Date().toISOString().slice(0, 10), category: "Vận chuyển", amountVnd: "" });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  async function remove(x: ExpenseRow) {
    if (!confirm("Xóa chi phí?")) return;
    const res = await fetch(`/api/expenses/${x.id}`, { method: "DELETE" });
    if (res.ok) {
      setExpenses((list) => list.filter((e) => e.id !== x.id));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={create} className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4">
        <label className="flex flex-col text-sm">
          Ngày
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">
          Loại
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded border border-slate-300 px-3 py-2">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Số tiền (đ)
          <input type="number" value={form.amountVnd} onChange={(e) => setForm({ ...form, amountVnd: e.target.value })} required className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <button className="rounded bg-blue-600 px-4 py-2 text-white">Thêm</button>
      </form>

      {expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-400">
          Chưa có chi phí — thêm bên trên
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr><th className="px-3 py-2">Ngày</th><th className="px-3 py-2">Loại</th><th className="px-3 py-2">Số tiền</th><th /></tr>
            </thead>
            <tbody>
              {expenses.map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="px-3 py-2">{new Date(x.date).toLocaleDateString("vi-VN")}</td>
                  <td className="px-3 py-2">{x.category}</td>
                  <td className="px-3 py-2">{x.amountVnd.toLocaleString("vi-VN")}đ</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditing(x)} className="rounded bg-slate-100 px-2 py-1 text-red-700">Sửa</button>
                      <button onClick={() => remove(x)} className="rounded bg-red-100 px-2 py-1 text-red-700">Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ExpenseEditForm
          expense={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setExpenses((list) => list.map((x) => (x.id === updated.id ? updated : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Test cũ vẫn pass**

Run: `npm test`
Expected: 18/18 pass.

- [ ] **Step 5: Commit**

```bash
git add app/expenses/
git commit -m "feat: edit expenses + error banner + empty state"
```

---

### Task 10: BookListClient + BookEditForm — error UI, empty state, notes field, fix nhẹ

**Files:**
- Modify: `app/books/BookListClient.tsx`
- Modify: `app/books/BookEditForm.tsx`

**Interfaces:**
- Consumes: `PATCH/DELETE /api/books/[id]` (Task 8 cũ, có sẵn).
- Produces: UI books có error banner, empty state, edit có field notes, condition fallback, bỏ onBlur double-search.

- [ ] **Step 1: Sửa app/books/BookEditForm.tsx**

- Thêm field `notes` vào state (đã có `notes: ""`) và gửi `notes` trong body PATCH:
```tsx
body: JSON.stringify({
  title: form.title,
  author: form.author || null,
  category: form.category || null,
  condition: form.condition,
  listPriceVnd: form.listPriceVnd ? Number(form.listPriceVnd) : null,
  purchaseCostVnd: form.purchaseCostVnd ? Number(form.purchaseCostVnd) : null,
  notes: form.notes || null,
}),
```
- Thêm input Ghi chú trong modal (sau field purchaseCostVnd):
```tsx
<input value={form.notes} onChange={set("notes")} placeholder="Ghi chú" className="w-full rounded border border-slate-300 px-3 py-2" />
```
- Thêm error state + check `res.ok` trong `submit` (pattern như OrderEditForm Task 7 — setError → hiện banner đỏ trong modal khi `!res.ok`; chỉ `onSaved()` khi ok). Thêm error banner render trong modal.
- Condition fallback: khi `book.condition` không nằm trong `CONDITIONS`, thêm `<option value={book.condition}>` ẩn (chỉ render nếu có):
```tsx
{book.condition && !CONDITIONS.includes(book.condition) && (
  <option value={book.condition}>{book.condition}</option>
)}
```
- Đổi `submit` không cần await — giữ async nhưng đảm bảo check res.ok trước onSaved.

- [ ] **Step 2: Sửa app/books/BookListClient.tsx**

- Thêm `const [error, setError] = useState("")`.
- Trong `markSold`: check `res.ok` → lỗi setError; thành công thì giữ nguyên refresh+search. Bỏ `await` không cần thiết (dùng async).
- Trong `remove`: check `res.ok` → lỗi setError.
- Bỏ `onBlur={search}` ở select status (chỉ `onChange`).
- Empty state: khi `books.length === 0` hiển thị khối thay thế:
```tsx
<div className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-400">
  Chưa có sách — dùng Scan hoặc nhập kho
</div>
```
(giữ nguyên kết quả search: nếu user đang filter mà rỗng, vẫn hiện empty state này — chấp nhận, hoặc thêm điều kiện q/status để phân biệt; đơn giản: hiện "Không tìm thấy sách" nếu có q/status, ngược lại "Chưa có sách".)
- Render error banner phía trên cùng component (giống OrderClient).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Test cũ vẫn pass**

Run: `npm test`
Expected: 18/18 pass.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add app/books/
git commit -m "feat: books error banner + empty state + edit notes"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Edit Orders/Purchases/Expenses → Task 2/3/4 (API) + Task 7/8/9 (UI) ✅
   - EditModal chung → Task 6 ✅
   - res.ok + error UI → Task 7/8/9/10 (mọi create/edit/remove/markSold) ✅
   - Timezone date → Task 1 (helper) + Task 2/3/4/5 (dùng parseDateOnly) ✅
   - Empty states → Task 7/8/9/10 ✅
   - UI fix nhẹ (onBlur double-search, condition fallback, notes field, responsive verify) → Task 10 ✅
   - Test cho parseDateOnly → Task 1 ✅
   - Out of scope (schema, GSheet, linkage) → không task nào đụng ✅

2. **Placeholder scan:** Task 5 Step 1 có mô tả "đọc file hiện tại để tìm chỗ set soldDate" — cần concrete hơn. Implementer sẽ đọc `app/api/books/route.ts` (26 dòng) để tìm dòng set soldDate; nếu không có thì chỉ cần thêm import và bỏ qua. Đây là hướng dẫn đủ, không phải placeholder mơ hồ (route rất ngắn). Chấp nhận.

3. **Type consistency:**
   - `parseDateOnly(s: string): Date` — Task 1 định nghĩa, Task 2/3/4/5 dùng đúng tên ✅
   - `toDateInputValue(d: Date | string): string` — Task 1 định nghĩa, Task 7/8/9 dùng đúng ✅
   - `EditModal({ title, onClose, onSave, saving, children })` — Task 6 định nghĩa, Task 7/8/9 dùng đúng prop names ✅
   - `OrderRow`/`PurchaseRow`/`ExpenseRow` — mỗi cặp form+client khai báo cùng type (trùng nhưng đúng — pattern hiện có) ✅
   - `onSaved(updated: Row)` — 3 form khai báo đúng, client onSaved dùng `updated.id` ✅
