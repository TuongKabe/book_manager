# Dashboard Performance Fix — Double Fetch + DB Aggregation

## Vấn đề

Trang `/` (Dashboard) có 2 vấn đề performance:

1. **Double-fetch**: `app/page.tsx` chỉ render `<Dashboard />` (client component, không data). `Dashboard.tsx` mount → `useEffect` → gọi `GET /api/dashboard` → set state → re-render. Tổng cộng 2 round trip cho initial load, user thấy skeleton nhấp nháy 300-800ms trước khi data hiện.

2. **Over-fetch + JS aggregation**: `app/api/dashboard/route.ts` hiện tại dùng `findMany` lấy toàn bộ orders/expenses/booksSold trong date range, rồi aggregate trong JS (`reduce`, `Map`, `slice`). Với 1000 orders, payload >50KB và tốn CPU Node.

## Mục tiêu

- Initial dashboard load: 1 round trip (RSC fetch).
- Dashboard data: aggregate trực tiếp ở DB, payload <10KB.
- Logic chia sẻ giữa Server Component và API route.

## Approach đã chốt

| # | Hạng mục | Quyết định |
|---|----------|-----------|
| A | Server render | `app/page.tsx` (Server Component) gọi `getDashboardData()` → pass `initialData` vào `<Dashboard />` |
| B | Client state | `Dashboard.tsx` `useState(initialData)` → skip fetch on initial mount |
| C | Filter changes | Vẫn dùng `fetch /api/dashboard` (giữ hành vi cũ) |
| D | API route | Giữ, refactor thành thin wrapper gọi `getDashboardData()` |
| E | Logic tách | `lib/dashboard.ts` export `getDashboardData(from, to)` — single source of truth |
| F | DB aggregation | Stats summary + topExpenses + recent* dùng `prisma.aggregate/groupBy/findMany+select`. Monthly breakdown dùng `$queryRaw` với `date_trunc('month', ...)`. TopBooks aggregate trên `Book` (không qua Order). |
| G | `force-dynamic` | Giữ nguyên `app/page.tsx=force-dynamic`. Phase 3 quyết định cache sau khi có feedback cảm nhận. |
| H | Pagination/books/orders | Đợt 2 — KHÔNG đụng. |
| I | SHA-256 middleware | Đợt 3 — KHÔNG đụng. |
| J | Next/Image, indexes | Đợt 3 — KHÔNG đụng. |

## Thay đổi

### File mới: `lib/dashboard.ts`

Export:
- `type DashboardData` — strongly-typed shape matching current API output
- `async function getDashboardData(from: Date, to: Date): Promise<DashboardData>`

Logic:
1. **Stats summary** (4 parallel queries):
   - `prisma.order.aggregate({ where: {date: between}, _sum: {totalVnd}, _count })` → revenue, orderCount
   - `prisma.book.aggregate({ where: {soldDate: between}, _sum: {purchaseCostVnd}, _count })` → bookCost, bookSoldCount
   - `prisma.expense.aggregate({ where: {date: between}, _sum: {amountVnd} })` → expenseTotal
   - `prisma.book.count({ where: {status: IN [LISTED, INTAKE]} })` → inStockCount (not date-filtered)

2. **Monthly breakdown** (1 raw SQL):
   - Dùng `date_trunc('month', d)` với `UNION ALL` 3 nguồn (Order, Expense, Book.soldDate).
   - Trả về `(month, revenue, cost, order_count, book_sold)` per month.
   - JS map sang shape: `{ month: "YYYY-MM", revenue, cost, profit, orderCount, bookSold }`.

3. **TopBooks** (1 query + JS group):
   - `prisma.book.findMany({ where: {soldDate: between, soldOrderId: not null}, select: {id, title, soldPriceVnd}, take: unlimited })` — chỉ sold books trong range.
   - Group by id trong JS (small set, ~tổng sách bán).
   - Sort by revenue desc, take 10.

4. **TopExpenses** (1 groupBy):
   - `prisma.expense.groupBy({ by: ["category"], where: {date: between}, _sum: {amountVnd}, orderBy: {_sum: {amountVnd: "desc"}} })`.

5. **Recent orders + expenses** (2 parallel queries):
   - `prisma.order.findMany({ where: {date: between}, orderBy: {date: desc}, take: 10, select: {id, date, customerName, channel, totalVnd} })`
   - `prisma.expense.findMany({ where: {date: between}, orderBy: {date: desc}, take: 10, select: {id, date, category, amountVnd, note} })`

### File sửa: `app/api/dashboard/route.ts`

Rewrite thành thin wrapper (từ 151 dòng xuống ~15 dòng):

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard";

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  const from = parseDate(req.nextUrl.searchParams.get("from"));
  const to = parseDate(req.nextUrl.searchParams.get("to"));
  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to dates" }, { status: 400 });
  }
  to.setHours(23, 59, 59, 999);
  const data = await getDashboardData(from, to);
  return NextResponse.json(data);
}
```

### File sửa: `app/page.tsx`

```ts
import Dashboard from "@/app/components/Dashboard";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const initialData = await getDashboardData(from, to);
  return <Dashboard initialData={initialData} />;
}
```

### File sửa: `app/components/Dashboard.tsx`

- Thêm prop `initialData: DashboardData` (required).
- `useState<DashboardData>(initialData)` thay vì `useState<DashboardData | null>(null)`.
- Trong `useEffect`, kiểm tra: skip fetch nếu `period === "today"` AND `customFrom === ""` AND `customTo === ""` AND `data?.from === initialData.from` AND `data?.to === initialData.to`. Khi user đổi filter, fetch như cũ.
- Banner lỗi vẫn dùng `setError`/`{error && <Banner>}`.
- Thêm nút "Làm mới" trong toolbar để user force refresh.

### File mới: `tests/dashboard.test.ts`

Unit test cho `getDashboardData`:
- Mock `@/lib/prisma` (như `tests/books-id-route.test.ts` pattern).
- Test `aggregate.summary` — verify correct `_sum`/`_count` calls.
- Test `monthly` — verify `$queryRaw` SQL có đúng `date_trunc` + 3 UNION ALL.
- Test `topBooks` — verify `findMany` với select + soldOrderId not null.
- Test `topExpenses` — verify `groupBy` by category.
- Test `recentOrders` + `recentExpenses` — verify `take: 10` + select.

## Data flow

```
GET / (first time)
  → app/page.tsx (Server Component)
  → getDashboardData(today_start, today_end)
  → 4 parallel aggregates + 1 raw SQL + 1 groupBy + 2 findMany-take10
  → return initialData
  → <Dashboard initialData={...} />
  → client renders with data immediately (no skeleton)

User changes period to "thisMonth"
  → useState updates
  → useEffect fires (skip-condition false)
  → fetch /api/dashboard?from=...&to=...
  → API route calls getDashboardData() (same fn)
  → setData(newData)
  → re-render with loading badge (existing pattern)
```

## Error handling

- Server fetch fails → Next.js error boundary shows, page returns 500. Dashboard.tsx `setError` không áp dụng (chưa có client state).
- Client fetch fails (filter change) → `setError` + `<Banner tone="danger">` (giữ nguyên hiện tại).
- `Promise.all` internal reject → bubbles up to server, error boundary catches.
- No partial state: `getDashboardData` either returns full `DashboardData` or throws.

## Testing

### Unit test (`tests/dashboard.test.ts`)
Mock `@/lib/prisma` like `tests/books-id-route.test.ts`:
- Verify summary aggregates được gọi đúng.
- Verify `$queryRaw` SQL có `date_trunc` + 3 UNION.
- Verify topBooks findMany select.
- Verify topExpenses groupBy.
- Verify recentOrders/Expenses take:10.

### Manual smoke
1. Open `/` → no skeleton flash, content immediately visible.
2. DevTools Network → 0 request to `/api/dashboard` on initial load.
3. Change period → loading badge → updated content.
4. DevTools Network → 1 request to `/api/dashboard` on filter change.

### Performance baseline
- Initial Dashboard load: measure `TTFB` before/after (target: -300ms).
- `/api/dashboard` payload size: before ~50KB → after ~5KB.
- DB query count: from 4 `findMany` → 4 `aggregate` + 1 raw SQL + 1 groupBy + 2 findMany-take10.

## Files changed

- `lib/dashboard.ts` (new)
- `app/api/dashboard/route.ts` (rewrite to thin wrapper)
- `app/page.tsx` (fetch initial data)
- `app/components/Dashboard.tsx` (accept initialData, skip first fetch)
- `tests/dashboard.test.ts` (new)

## Out of scope (deferred)

- Pagination for books/orders (Phase 2)
- Cache/revalidate strategy (Phase 3)
- Database indexes (Phase 3)
- Next/Image migration (Phase 3)
- Dynamic import for heavy components (Phase 3)
- Bundle analysis (Phase 3)
- Books/orders/expenses pages
- SHA-256 middleware optimisation
- `force-dynamic` decision (keep current)