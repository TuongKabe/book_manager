# Book Sold Link to Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce rằng mọi sách `status = SOLD` phải có `soldOrderId` hợp lệ — xóa nút "Đã bán" ngoài luồng trong `/books`, thêm link tới đơn cho sách đã bán, và reset dữ liệu legacy về `LISTED`.

**Architecture:** Backend guard trên `PATCH /api/books/[id]` (reject status=SOLD không có soldOrderId) + endpoint mới `POST /api/books/reset-orphans` + frontend `BookListClient` refactor (xóa markSold, hiển thị link tới đơn qua OrderModal, thêm nút cleanup).

**Tech Stack:** Next.js 16.3 (App Router), Prisma 6, PostgreSQL, React 19, Phosphor Icons, Vitest 4.

## Global Constraints

- Tất cả thông báo UI bằng tiếng Việt (giọng ngắn gọn, hiện có).
- KHÔNG thêm dependencies mới; dùng `@phosphor-icons/react` cho icon mới (`Receipt`, `Broom`).
- KHÔNG sửa `prisma/schema.prisma` (đã có `soldOrderId` FK).
- KHÔNG sửa `POST/PATCH /api/orders` (đã đúng).
- Test pattern: vitest + mock `@/lib/prisma` (xem `tests/lookup-route.test.ts`).
- Build command: `npm run build`. Lint: `npm run lint`. Test: `npm test`.

---

### Task 1: Backend guard — reject status=SOLD without soldOrderId

**Files:**
- Modify: `app/api/books/[id]/route.ts:7-27`
- Test: `tests/books-id-route.test.ts`

**Interfaces:**
- Consumes: Prisma `book.update` (existing)
- Produces: `PATCH /api/books/[id]` returns:
  - `400 { error: "Sách đã bán phải gắn với đơn hàng (soldOrderId)" }` khi `body.status === "SOLD"` và `body.soldOrderId` null/undefined.
  - `200 <book>` cho mọi case khác (giữ nguyên).

- [ ] **Step 1: Write the failing test**

Tạo `tests/books-id-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/books/[id]/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    book: { update: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("@/lib/date", () => ({
  parseDateOnly: (s: string) => new Date(s),
}));

import { prisma } from "@/lib/prisma";

const mockedUpdate = vi.mocked(prisma.book.update);

function req(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/books/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("PATCH /api/books/[id] — SOLD guard", () => {
  beforeEach(() => {
    mockedUpdate.mockReset();
  });

  it("rejects status=SOLD without soldOrderId with 400", async () => {
    const res = await PATCH(req("book1", { status: "SOLD" }), {
      params: Promise.resolve({ id: "book1" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/soldOrderId/);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("accepts status=SOLD with soldOrderId", async () => {
    mockedUpdate.mockResolvedValue({ id: "book1", status: "SOLD" } as never);
    const res = await PATCH(
      req("book1", { status: "SOLD", soldOrderId: "order1" }),
      { params: Promise.resolve({ id: "book1" }) },
    );
    expect(res.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalled();
  });

  it("accepts status=LISTED without soldOrderId", async () => {
    mockedUpdate.mockResolvedValue({ id: "book1", status: "LISTED" } as never);
    const res = await PATCH(req("book1", { status: "LISTED" }), {
      params: Promise.resolve({ id: "book1" }),
    });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/books-id-route.test.ts`
Expected: FAIL — chưa có guard, status 200 cho mọi case.

- [ ] **Step 3: Modify `app/api/books/[id]/route.ts`**

Thay toàn bộ hàm `PATCH` (dòng 7–27) bằng:

```ts
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  if (body.status === "SOLD" && !body.soldOrderId) {
    return NextResponse.json(
      { error: "Sách đã bán phải gắn với đơn hàng (soldOrderId)" },
      { status: 400 },
    );
  }
  const data: Record<string, unknown> = {};
  for (const key of [
    "title", "isbn", "barcode", "author", "category", "condition",
    "defectsNote", "purchaseId", "soldChannel", "soldOrderId", "notes",
  ]) {
    if (key in body) data[key] = body[key];
  }
  for (const key of ["weightGrams", "purchaseCostVnd", "listPriceVnd", "soldPriceVnd"]) {
    if (key in body) data[key] = body[key] ? Number(body[key]) : null;
  }
  if ("status" in body) data.status = body.status;
  if (body.status && body.status !== "SOLD") data.soldDate = null;
  const book = await prisma.book.update({ where: { id }, data });
  return NextResponse.json(book);
}
```

Lưu ý: Bỏ nhánh `if (body.status === "SOLD") { data.soldDate = ... }` cũ. Lý do: `POST/PATCH /api/orders` đã tự set `soldDate = now` đúng lúc — không cần PATCH sách tự set lại.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/books-id-route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run full test suite + lint**

Run: `npm test && npm run lint`
Expected: all tests pass; no lint errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/books/\[id\]/route.ts tests/books-id-route.test.ts
git commit -m "feat(api): reject SOLD books without soldOrderId"
```

---

### Task 2: Backend reset-orphans endpoint

**Files:**
- Create: `app/api/books/reset-orphans/route.ts`
- Test: `tests/reset-orphans-route.test.ts`

**Interfaces:**
- Consumes: Prisma `book.updateMany`
- Produces: `POST /api/books/reset-orphans` returns `200 { resetCount: number }`. Logic: set `status = "LISTED"`, `soldDate = null`, `soldPriceVnd = null`, `soldChannel = null`, `soldOrderId = null` cho mọi book có `status = "SOLD"` và `soldOrderId = null`.

- [ ] **Step 1: Write the failing test**

Tạo `tests/reset-orphans-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/books/reset-orphans/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    book: { updateMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockedUpdateMany = vi.mocked(prisma.book.updateMany);

describe("POST /api/books/reset-orphans", () => {
  beforeEach(() => {
    mockedUpdateMany.mockReset();
  });

  it("calls updateMany with SOLD + soldOrderId null and returns resetCount", async () => {
    mockedUpdateMany.mockResolvedValue({ count: 7 } as never);
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ resetCount: 7 });
    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: { status: "SOLD", soldOrderId: null },
      data: {
        status: "LISTED",
        soldDate: null,
        soldPriceVnd: null,
        soldChannel: null,
        soldOrderId: null,
      },
    });
  });

  it("returns resetCount: 0 when nothing to reset", async () => {
    mockedUpdateMany.mockResolvedValue({ count: 0 } as never);
    const res = await POST();
    expect(await res.json()).toEqual({ resetCount: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/reset-orphans-route.test.ts`
Expected: FAIL — module `@/app/api/books/reset-orphans/route` not found.

- [ ] **Step 3: Create `app/api/books/reset-orphans/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const result = await prisma.book.updateMany({
    where: { status: "SOLD", soldOrderId: null },
    data: {
      status: "LISTED",
      soldDate: null,
      soldPriceVnd: null,
      soldChannel: null,
      soldOrderId: null,
    },
  });
  return NextResponse.json({ resetCount: result.count });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/reset-orphans-route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run full test suite + lint**

Run: `npm test && npm run lint`
Expected: all tests pass; no lint errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/books/reset-orphans/route.ts tests/reset-orphans-route.test.ts
git commit -m "feat(api): endpoint to reset orphan SOLD books to LISTED"
```

---

### Task 3: Frontend — BookListClient refactor

**Files:**
- Modify: `app/books/BookListClient.tsx` (entire file rewrite of relevant sections)

**Interfaces:**
- Consumes:
  - `GET /api/books?...` (existing, không đổi)
  - `GET /api/orders/[id]` (existing, trả `{...order, books: BookRow[]}`)
  - `POST /api/books/reset-orphans` (Task 2)
  - Component `OrderModal` từ `@/app/components/OrderModal` (existing — props `isOpen`, `initialOrder`, `onClose`, `onSaved`)
- Produces:
  - `BookCard` không còn nút "Đã bán".
  - Sách SOLD có `soldOrderId` → button "Xem đơn #abc123" → mở OrderModal.
  - Sách SOLD không `soldOrderId` → text "Bán ngoài hệ thống".
  - Nút "Dọn sách SOLD lỗi" ở `PageHeader.toolbar` → POST reset-orphans → hiển thị Banner success/error.

- [ ] **Step 1: Update imports**

Trong `app/books/BookListClient.tsx`, thay block import hiện tại (dòng 4–14) bằng:

```tsx
import {
  MagnifyingGlass,
  CurrencyDollar,
  Tag,
  Book,
  PencilSimple,
  TrashSimple,
  Package,
  Coins,
  Receipt,
  Broom,
} from "@phosphor-icons/react";
import BookEditForm from "./BookEditForm";
import PageHeader from "@/app/components/ui/PageHeader";
import StatTile from "@/app/components/ui/StatTile";
import EmptyState from "@/app/components/ui/EmptyState";
import Pill from "@/app/components/ui/Pill";
import Banner from "@/app/components/ui/Banner";
import Button from "@/app/components/ui/Button";
import Card, { CardHeader, CardBody } from "@/app/components/ui/Card";
import { Select, Input } from "@/app/components/ui/Field";
import { StatSkeletonGrid } from "@/app/components/ui/Skeleton";
import OrderModal from "@/app/components/OrderModal";
```

- [ ] **Step 2: Extend types**

Trong `app/books/BookListClient.tsx`, thêm type cho OrderRow ngay sau `BookRow` (sau dòng 39):

```tsx
export type OrderRow = {
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
  books: {
    id: string;
    title: string;
    isbn: string | null;
    coverPhotoUrl: string | null;
    listPriceVnd: number | null;
    weightGrams: number | null;
  }[];
};
```

Và sửa `BookRow` (dòng 27–39) — thêm 2 field:

```tsx
export type BookRow = {
  id: string;
  isbn: string | null;
  title: string;
  author: string | null;
  category: string | null;
  condition: string | null;
  coverPhotoUrl: string | null;
  listPriceVnd: number | null;
  purchaseCostVnd: number | null;
  status: string;
  soldOrderId: string | null;
  purchase: Purchase;
};
```

- [ ] **Step 3: Thêm state + helper cho OrderModal**

Trong function `BookListClient` (dòng 49), thêm sau `const [loading, setLoading] = useState(false);` (dòng 55):

```tsx
  const [viewingOrder, setViewingOrder] = useState<OrderRow | null>(null);
  const [notice, setNotice] = useState("");
  const [resetting, setResetting] = useState(false);
```

Thêm helpers (sau function `remove`, trước `const maxCatCount`):

```tsx
  async function openOrderForBook(book: BookRow) {
    if (!book.soldOrderId) return;
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/orders/${book.soldOrderId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Không tải được đơn hàng");
        return;
      }
      const order = (await res.json()) as OrderRow;
      setViewingOrder(order);
    } catch {
      setError("Không thể kết nối tới máy chủ");
    }
  }

  async function resetOrphans() {
    if (!confirm("Reset tất cả sách SOLD không có đơn về LISTED?")) return;
    setResetting(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/books/reset-orphans", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Có lỗi xảy ra");
        return;
      }
      const n = data.resetCount ?? 0;
      setNotice(`Đã dọn ${n} sách SOLD lỗi`);
      fetchBooks(q, status);
    } catch {
      setError("Không thể kết nối tới máy chủ");
    } finally {
      setResetting(false);
    }
  }
```

- [ ] **Step 4: Xóa hàm `markSold`**

Xóa toàn bộ function `markSold` (dòng 132–146 cũ).

- [ ] **Step 5: Thêm cleanup button vào PageHeader**

Sửa block `PageHeader` (dòng 164–167) — thêm `toolbar` và `primaryAction`:

```tsx
      <PageHeader
        title="Kho sách"
        description="Toàn bộ sách đang có trong kho, đang bán và đã bán."
        toolbar={
          <Button
            variant="secondary"
            onClick={resetOrphans}
            loading={resetting}
            iconLeft={<Broom size={14} weight="bold" />}
          >
            Dọn sách SOLD lỗi
          </Button>
        }
      />
```

- [ ] **Step 6: Render Banner cho notice**

Ngay sau block `{error && <Banner tone="danger">{error}</Banner>}` (dòng 169), thêm:

```tsx
      {notice && <Banner tone="success">{notice}</Banner>}
```

- [ ] **Step 7: Render OrderModal cuối component**

Trước thẻ đóng `</div>` cuối cùng của `BookListClient` (dòng 351), thêm:

```tsx
      <OrderModal
        isOpen={!!viewingOrder}
        initialOrder={viewingOrder ?? undefined}
        onClose={() => setViewingOrder(null)}
        onSaved={() => setViewingOrder(null)}
      />
```

- [ ] **Step 8: Update BookCard**

Sửa toàn bộ function `BookCard` (dòng 355–447):

- Thêm prop `onOpenOrder`:
```tsx
function BookCard({
  book,
  onEdit,
  onOpenOrder,
  onDelete,
}: {
  book: BookRow;
  onEdit: () => void;
  onOpenOrder: () => void;
  onDelete: () => void;
}) {
```

- Thay block footer (dòng 426–445) bằng:
```tsx
      <div className="flex items-center justify-between gap-1 border-t border-hairline bg-surface-soft px-2 py-1.5">
        <Button variant="ghost" size="sm" onClick={onEdit} iconLeft={<PencilSimple size={12} weight="bold" />}>
          Sửa
        </Button>
        {book.status === "SOLD" ? (
          book.soldOrderId ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenOrder}
              iconLeft={<Receipt size={12} weight="bold" />}
            >
              Xem đơn #{book.soldOrderId.slice(0, 6)}
            </Button>
          ) : (
            <span className="text-[12px] text-ink-faint">Bán ngoài hệ thống</span>
          )
        ) : null}
        <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Xóa">
          <TrashSimple size={14} weight="bold" />
        </Button>
      </div>
```

- [ ] **Step 9: Update prop wiring ở chỗ render BookCard**

Trong JSX render list (dòng 329–337), sửa prop `onMarkSold` thành `onOpenOrder`:

```tsx
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={() => setEditing(book)}
              onOpenOrder={() => openOrderForBook(book)}
              onDelete={() => remove(book)}
            />
          ))}
```

- [ ] **Step 10: Run full test + lint + build**

Run: `npm test && npm run lint && npm run build`
Expected: tests pass, no lint errors, build succeeds.

Nếu build fail vì TS error ở `initialOrder={viewingOrder ?? undefined}`, kiểm tra `OrderModal.props` — `initialOrder?: InitialOrder`. Có thể đổi sang `initialOrder={viewingOrder || undefined}` nếu cần.

- [ ] **Step 11: Manual smoke test**

Trên dev server (`npm run dev`):

1. Mở `/books`. Sách chưa SOLD: chỉ thấy Sửa + Xóa (không có nút "Đã bán").
2. Sách SOLD có `soldOrderId`: hiển thị "Xem đơn #abc123" → click → modal mở đúng đơn.
3. Bấm "Dọn sách SOLD lỗi" → confirm → Banner success hiển thị "Đã dọn N sách" → list refresh, sách legacy về LISTED.

- [ ] **Step 12: Commit**

```bash
git add app/books/BookListClient.tsx
git commit -m "feat(books): remove mark-sold button, link sold books to order"
```

---

### Task 4: Update API client include to fetch soldOrderId

**Files:**
- Modify: `app/api/books/route.ts:16-20`
- Modify: `app/books/page.tsx:16-20`

**Interfaces:**
- Produces: `GET /api/books` và server-rendered `app/books/page.tsx` đều trả `Book` có kèm `soldOrderId`.

Lý do: Frontend `BookRow` (Task 3) cần `soldOrderId` để render link. Nếu API không select field này, type `BookRow.soldOrderId` sẽ là `undefined` → button "Xem đơn" không hiển thị.

- [ ] **Step 1: Verify select**

Đọc `app/api/books/route.ts`. Hiện `findMany` không có `select`, mặc định trả tất cả scalar fields → `soldOrderId` đã có sẵn. Không cần sửa file này.

Đọc `app/books/page.tsx`. Cũng dùng `findMany` không select → đã có `soldOrderId`. Không cần sửa.

- [ ] **Step 2: Verify bằng manual test**

Trên dev server (`npm run dev`), mở `/books`. Trong DevTools Network tab, xem response của `/api/books?status=SOLD` — mỗi book phải có field `soldOrderId` (string hoặc null).

Expected: field tồn tại. Nếu thiếu → quay lại Task 3 kiểm tra.

- [ ] **Step 3: Commit (chỉ khi có thay đổi)**

Nếu không có thay đổi (khả năng cao), bỏ qua commit. Nếu có:

```bash
git add app/api/books/route.ts app/books/page.tsx
git commit -m "chore(api): ensure soldOrderId is returned in book list"
```

---

### Task 5: Final verification

**Files:** None (read-only verification).

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all tests pass (lookup-route, books-id-route, reset-orphans-route, stats, db, smoke, isbn, date, categories, auth, google-books).

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: build succeeds. Next.js 16 may print "agent rules" reminder — bỏ qua.

- [ ] **Step 4: Curl smoke test**

Trên dev server (`npm run dev`):

```bash
# Phải 400
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH http://localhost:3000/api/books/test \
  -H 'Content-Type: application/json' \
  -d '{"status":"SOLD"}'

# Phải 200
curl -s -X POST http://localhost:3000/api/books/reset-orphans
```

Expected: `400` rồi `{"resetCount":N}`.

- [ ] **Step 5: Done**

Không commit gì thêm. Plan hoàn tất.