# Dashboard Performance Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Dashboard double-fetch (server-render initial data, skip first fetch on mount) + DB-aggregate dashboard data instead of findMany+JS-reduce.

**Architecture:** Extract `getDashboardData(from, to)` into `lib/dashboard.ts` — single source of truth called by both Server Component (`app/page.tsx`) and API route (`app/api/dashboard/route.ts`). Use `prisma.aggregate` / `groupBy` / `findMany+select` for stats, `$queryRaw` with `date_trunc('month', ...)` for monthly breakdown.

**Tech Stack:** Next.js 16.3 (Server Components + Client Components), Prisma 6 (aggregate, groupBy, $queryRaw), React 19, TypeScript 5, Vitest 4.

## Global Constraints

- Test pattern: vitest, mock `@/lib/prisma` like `tests/books-id-route.test.ts` does.
- `app/page.tsx` keeps `export const dynamic = "force-dynamic"`.
- API route `app/api/dashboard/route.ts` keeps URL contract: `GET /api/dashboard?from=...&to=...` returns `DashboardData` JSON or `{error}` 400.
- Vietnamese UI copy preserved verbatim.
- Build + lint + test must all pass (`npm run lint`, `npm run build`, `npm test`).
- Type `DashboardData` matches existing field names (`from`, `to`, `stats`, `monthly`, `topBooks`, `topExpenses`, `recentOrders`, `recentExpenses`). Recent purchases' `date` field is `string | Date` (matches existing `Dashboard.tsx` typing).
- Recent orders/expenses use `select: { id, date, customerName, channel, totalVnd }` (no nested books).
- `take: 10` for recent lists.

---

### Task 1: Create `lib/dashboard.ts`

**Files:**
- Create: `lib/dashboard.ts`
- Test: `tests/dashboard.test.ts`

**Interfaces:**
- Consumes: Prisma `order.aggregate`, `book.aggregate`, `expense.aggregate`, `book.count`, `expense.groupBy`, `book.findMany`, `order.findMany`, `expense.findMany`, `$queryRaw`.
- Produces: `export type DashboardData` matching shape consumers expect; `export async function getDashboardData(from: Date, to: Date): Promise<DashboardData>`.

- [ ] **Step 1: Write the failing test**

Create `tests/dashboard.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    book: {
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    expense: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { getDashboardData } from "@/lib/dashboard";

const mockOrderAggregate = vi.mocked(prisma.order.aggregate);
const mockBookAggregate = vi.mocked(prisma.book.aggregate);
const mockExpenseAggregate = vi.mocked(prisma.expense.aggregate);
const mockBookCount = vi.mocked(prisma.book.count);
const mockExpenseGroupBy = vi.mocked(prisma.expense.groupBy);
const mockBookFindMany = vi.mocked(prisma.book.findMany);
const mockOrderFindMany = vi.mocked(prisma.order.findMany);
const mockExpenseFindMany = vi.mocked(prisma.expense.findMany);
const mockQueryRaw = vi.mocked(prisma.$queryRaw);

const from = new Date("2026-01-01");
const to = new Date("2026-01-31");

describe("getDashboardData", () => {
  beforeEach(() => {
    mockOrderAggregate.mockReset();
    mockBookAggregate.mockReset();
    mockExpenseAggregate.mockReset();
    mockBookCount.mockReset();
    mockExpenseGroupBy.mockReset();
    mockBookFindMany.mockReset();
    mockOrderFindMany.mockReset();
    mockExpenseFindMany.mockReset();
    mockQueryRaw.mockReset();

    mockOrderAggregate.mockResolvedValue({ _sum: { totalVnd: 100000 }, _count: 5 } as never);
    mockBookAggregate.mockResolvedValue({ _sum: { purchaseCostVnd: 40000 }, _count: 8 } as never);
    mockExpenseAggregate.mockResolvedValue({ _sum: { amountVnd: 10000 } } as never);
    mockBookCount.mockResolvedValue(20);
    mockExpenseGroupBy.mockResolvedValue([
      { category: "Vận chuyển", _sum: { amountVnd: 6000 } },
      { category: "Điện", _sum: { amountVnd: 4000 } },
    ] as never);
    mockBookFindMany.mockResolvedValue([
      { id: "b1", title: "Sách A", soldPriceVnd: 50000 },
      { id: "b1", title: "Sách A", soldPriceVnd: 50000 },
      { id: "b2", title: "Sách B", soldPriceVnd: 30000 },
    ] as never);
    mockOrderFindMany.mockResolvedValue([
      { id: "o1", date: new Date("2026-01-15"), customerName: "Khách A", channel: "FB", totalVnd: 50000 },
    ] as never);
    mockExpenseFindMany.mockResolvedValue([
      { id: "e1", date: new Date("2026-01-10"), category: "Vận chuyển", amountVnd: 5000, note: null },
    ] as never);
    mockQueryRaw.mockResolvedValue([
      { month: new Date("2026-01-01"), revenue: 100000, cost: 50000, order_count: 5, book_sold: 8 },
    ] as never);
  });

  it("calls summary aggregates with correct date filters", async () => {
    await getDashboardData(from, to);
    expect(mockOrderAggregate).toHaveBeenCalledWith({
      where: { date: { gte: from, lte: to } },
      _sum: { totalVnd: true },
      _count: true,
    });
    expect(mockBookAggregate).toHaveBeenCalledWith({
      where: { soldDate: { gte: from, lte: to } },
      _sum: { purchaseCostVnd: true },
      _count: true,
    });
    expect(mockExpenseAggregate).toHaveBeenCalledWith({
      where: { date: { gte: from, lte: to } },
      _sum: { amountVnd: true },
    });
    expect(mockBookCount).toHaveBeenCalledWith({
      where: { status: { in: ["LISTED", "INTAKE"] } },
    });
  });

  it("uses $queryRaw with date_trunc + 3 UNION ALL for monthly", async () => {
    await getDashboardData(from, to);
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    const sqlArg = mockQueryRaw.mock.calls[0][0] as TemplateStringsArray;
    const fullSql = sqlArg.join("?");
    expect(fullSql).toMatch(/date_trunc\('month',/);
    expect(fullSql.match(/UNION ALL/g)?.length).toBe(3);
    expect(fullSql).toMatch(/FROM "Order"/);
    expect(fullSql).toMatch(/FROM "Expense"/);
    expect(fullSql).toMatch(/FROM "Book"/);
  });

  it("topBooks uses findMany with soldOrderId not null + select", async () => {
    await getDashboardData(from, to);
    expect(mockBookFindMany).toHaveBeenCalledWith({
      where: { soldDate: { gte: from, lte: to }, soldOrderId: { not: null } },
      select: { id: true, title: true, soldPriceVnd: true },
    });
  });

  it("topExpenses uses groupBy by category", async () => {
    await getDashboardData(from, to);
    expect(mockExpenseGroupBy).toHaveBeenCalledWith({
      by: ["category"],
      where: { date: { gte: from, lte: to } },
      _sum: { amountVnd: true },
      orderBy: { _sum: { amountVnd: "desc" } },
    });
  });

  it("recentOrders uses findMany with take 10 and select", async () => {
    await getDashboardData(from, to);
    expect(mockOrderFindMany).toHaveBeenCalledWith({
      where: { date: { gte: from, lte: to } },
      orderBy: { date: "desc" },
      take: 10,
      select: { id: true, date: true, customerName: true, channel: true, totalVnd: true },
    });
  });

  it("recentExpenses uses findMany with take 10 and select", async () => {
    await getDashboardData(from, to);
    expect(mockExpenseFindMany).toHaveBeenCalledWith({
      where: { date: { gte: from, lte: to } },
      orderBy: { date: "desc" },
      take: 10,
      select: { id: true, date: true, category: true, amountVnd: true, note: true },
    });
  });

  it("computes summary stats correctly", async () => {
    const result = await getDashboardData(from, to);
    expect(result.stats).toEqual({
      revenue: 100000,
      cost: 40000 + 10000,
      profit: 100000 - 50000,
      profitMargin: Math.floor((100000 - 50000) / 100000 * 100),
      orderCount: 5,
      bookSoldCount: 8,
      avgOrderValue: Math.floor(100000 / 5),
      expenseTotal: 10000,
      bookCost: 40000,
      inStockCount: 20,
    });
  });

  it("groups topBooks by id and sorts by revenue desc", async () => {
    const result = await getDashboardData(from, to);
    expect(result.topBooks).toEqual([
      { id: "b1", title: "Sách A", count: 2, revenue: 100000 },
      { id: "b2", title: "Sách B", count: 1, revenue: 30000 },
    ]);
  });

  it("maps topExpenses from groupBy result", async () => {
    const result = await getDashboardData(from, to);
    expect(result.topExpenses).toEqual([
      { category: "Vận chuyển", total: 6000 },
      { category: "Điện", total: 4000 },
    ]);
  });

  it("includes from/to as ISO strings", async () => {
    const result = await getDashboardData(from, to);
    expect(result.from).toBe(from.toISOString());
    expect(result.to).toBe(to.toISOString());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dashboard.test.ts`
Expected: FAIL — module `@/lib/dashboard` not found.

- [ ] **Step 3: Create `lib/dashboard.ts`**

```ts
import { prisma } from "@/lib/prisma";

export type DashboardData = {
  from: string;
  to: string;
  stats: {
    revenue: number;
    cost: number;
    profit: number;
    profitMargin: number;
    orderCount: number;
    bookSoldCount: number;
    avgOrderValue: number;
    expenseTotal: number;
    bookCost: number;
    inStockCount: number;
  };
  monthly: Array<{
    month: string;
    revenue: number;
    cost: number;
    profit: number;
    orderCount: number;
    bookSold: number;
  }>;
  topBooks: Array<{ id: string; title: string; count: number; revenue: number }>;
  topExpenses: Array<{ category: string; total: number }>;
  recentOrders: Array<{
    id: string;
    date: string | Date;
    customer: string | null;
    channel: string | null;
    total: number | null;
  }>;
  recentExpenses: Array<{
    id: string;
    date: string | Date;
    category: string;
    amount: number;
    note: string | null;
  }>;
};

export async function getDashboardData(from: Date, to: Date): Promise<DashboardData> {
  const [orderAgg, bookSoldAgg, expenseAgg, inStockCount, expenseByCategory, topBooksRaw, recentOrders, recentExpenses] =
    await Promise.all([
      prisma.order.aggregate({
        where: { date: { gte: from, lte: to } },
        _sum: { totalVnd: true },
        _count: true,
      }),
      prisma.book.aggregate({
        where: { soldDate: { gte: from, lte: to } },
        _sum: { purchaseCostVnd: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: { date: { gte: from, lte: to } },
        _sum: { amountVnd: true },
      }),
      prisma.book.count({ where: { status: { in: ["LISTED", "INTAKE"] } } }),
      prisma.expense.groupBy({
        by: ["category"],
        where: { date: { gte: from, lte: to } },
        _sum: { amountVnd: true },
        orderBy: { _sum: { amountVnd: "desc" } },
      }),
      prisma.book.findMany({
        where: { soldDate: { gte: from, lte: to }, soldOrderId: { not: null } },
        select: { id: true, title: true, soldPriceVnd: true },
      }),
      prisma.order.findMany({
        where: { date: { gte: from, lte: to } },
        orderBy: { date: "desc" },
        take: 10,
        select: { id: true, date: true, customerName: true, channel: true, totalVnd: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: from, lte: to } },
        orderBy: { date: "desc" },
        take: 10,
        select: { id: true, date: true, category: true, amountVnd: true, note: true },
      }),
    ]);

  const monthlyRows = await prisma.$queryRaw<
    Array<{
      month: Date;
      revenue: number | null;
      cost: number | null;
      order_count: number | null;
      book_sold: number | null;
    }>
  >`
    SELECT
      date_trunc('month', d)::date AS month,
      COALESCE(SUM(rev), 0)::int AS revenue,
      COALESCE(SUM(cst), 0)::int AS cost,
      COALESCE(SUM(oc), 0)::int AS order_count,
      COALESCE(SUM(bs), 0)::int AS book_sold
    FROM (
      SELECT date, "totalVnd" AS rev, 0 AS cst, 1 AS oc, 0 AS bs
      FROM "Order"
      WHERE date BETWEEN ${from} AND ${to}
      UNION ALL
      SELECT date, 0 AS rev, "amountVnd" AS cst, 0 AS oc, 0 AS bs
      FROM "Expense"
      WHERE date BETWEEN ${from} AND ${to}
      UNION ALL
      SELECT "soldDate" AS date, 0 AS rev, COALESCE("purchaseCostVnd", 0) AS cst, 0 AS oc, 1 AS bs
      FROM "Book"
      WHERE "soldDate" BETWEEN ${from} AND ${to}
    ) d
    GROUP BY date_trunc('month', d)
    ORDER BY month
  `;

  const revenue = orderAgg._sum.totalVnd ?? 0;
  const bookCost = bookSoldAgg._sum.purchaseCostVnd ?? 0;
  const expenseTotal = expenseAgg._sum.amountVnd ?? 0;
  const cost = bookCost + expenseTotal;
  const profit = revenue - cost;
  const orderCount = orderAgg._count;
  const bookSoldCount = bookSoldAgg._count;
  const avgOrderValue = orderCount > 0 ? Math.floor(revenue / orderCount) : 0;
  const profitMargin = revenue > 0 ? Math.floor((profit / revenue) * 100) : 0;

  const monthly = monthlyRows.map((r) => ({
    month: `${r.month.getFullYear()}-${String(r.month.getMonth() + 1).padStart(2, "0")}`,
    revenue: r.revenue ?? 0,
    cost: r.cost ?? 0,
    profit: (r.revenue ?? 0) - (r.cost ?? 0),
    orderCount: r.order_count ?? 0,
    bookSold: r.book_sold ?? 0,
  }));

  const bookMap = new Map<string, { id: string; title: string; count: number; revenue: number }>();
  for (const b of topBooksRaw) {
    const ex = bookMap.get(b.id) ?? { id: b.id, title: b.title, count: 0, revenue: 0 };
    ex.count += 1;
    ex.revenue += b.soldPriceVnd ?? 0;
    bookMap.set(b.id, ex);
  }
  const topBooks = [...bookMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const topExpenses = expenseByCategory.map((r) => ({
    category: r.category,
    total: r._sum.amountVnd ?? 0,
  }));

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    stats: {
      revenue,
      cost,
      profit,
      profitMargin,
      orderCount,
      bookSoldCount,
      avgOrderValue,
      expenseTotal,
      bookCost,
      inStockCount,
    },
    monthly,
    topBooks,
    topExpenses,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      date: o.date,
      customer: o.customerName,
      channel: o.channel,
      total: o.totalVnd,
    })),
    recentExpenses: recentExpenses.map((e) => ({
      id: e.id,
      date: e.date,
      category: e.category,
      amount: e.amountVnd,
      note: e.note,
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dashboard.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Run full test + lint + build**

Run: `npm test && npm run lint && npm run build`
Expected: tests pass; lint 0 errors; build success.

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard.ts tests/dashboard.test.ts
git commit -m "feat(dashboard): extract getDashboardData with DB aggregation"
```

---

### Task 2: Refactor `app/api/dashboard/route.ts` to thin wrapper

**Files:**
- Modify: `app/api/dashboard/route.ts` (full rewrite, 151 → ~15 lines)

**Interfaces:**
- Consumes: `getDashboardData` (Task 1).
- Produces: Same URL contract: `GET /api/dashboard?from=...&to=...` returns `DashboardData` JSON or `{error: "Missing from/to dates"}` 400.

- [ ] **Step 1: Rewrite `app/api/dashboard/route.ts`**

Replace entire file with:

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

- [ ] **Step 2: Run full test + lint + build**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add app/api/dashboard/route.ts
git commit -m "refactor(dashboard): API route delegates to getDashboardData"
```

---

### Task 3: Server-render initial data in `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `getDashboardData` (Task 1).
- Produces: Page renders `<Dashboard initialData={...} />` with today's data.

- [ ] **Step 1: Rewrite `app/page.tsx`**

Replace file with:

```tsx
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

- [ ] **Step 2: Run build (TS check)**

Run: `npm run build`
Expected: build success. TS may flag `Dashboard` props — that's expected and will be fixed in Task 4.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(dashboard): fetch initial data server-side"
```

---

### Task 4: Update `Dashboard.tsx` to accept initialData + skip first fetch

**Files:**
- Modify: `app/components/Dashboard.tsx`

**Interfaces:**
- Consumes: `initialData: DashboardData` prop (required).
- Produces: Component renders data immediately on first paint; only fetches on filter change.

- [ ] **Step 1: Add `initialData` prop to `Dashboard` function signature**

Find the `Dashboard` function signature (around line 177):

```tsx
export default function Dashboard() {
```

Replace with:

```tsx
export default function Dashboard({ initialData }: { initialData: DashboardData }) {
```

- [ ] **Step 2: Initialize state from `initialData`**

Find:
```tsx
const [data, setData] = useState<DashboardData | null>(null);
```

Replace with:
```tsx
const [data, setData] = useState<DashboardData>(initialData);
```

- [ ] **Step 3: Add refresh-button handler**

Find the existing `useEffect` (around line 190). Add a `refreshing` state and modify `useEffect` to skip when period/customFrom/customTo match initialData:

Replace the `useEffect` block (lines 190-204) with:

```tsx
  useEffect(() => {
    if (period === "custom" && (!customFrom || !customTo)) return;
    if (
      data?.from === initialData.from &&
      data?.to === initialData.to &&
      period === "today" &&
      !customFrom &&
      !customTo
    ) {
      return;
    }
    queueMicrotask(() => {
      setLoading(true);
      setError("");
    });
    fetch(`/api/dashboard?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Không thể tải dữ liệu từ máy chủ"))
      .finally(() => setLoading(false));
  }, [from, to, period, customFrom, customTo]);
```

Note: the comparison `data?.from === initialData.from` is a string comparison (since `DashboardData.from` is `string`). This works fine.

- [ ] **Step 4: Add "Làm mới" button in toolbar**

Find the `PeriodToolbar` component invocation (around line 220). Wrap the toolbar in a flex container that includes a refresh button:

Replace the toolbar:
```tsx
        toolbar={
          <PeriodToolbar
            period={period}
            setPeriod={setPeriod}
            customFrom={customFrom}
            customTo={customTo}
            setCustomFrom={setCustomFrom}
            setCustomTo={setCustomTo}
          />
        }
```

With:
```tsx
        toolbar={
          <div className="flex items-center gap-2">
            <PeriodToolbar
              period={period}
              setPeriod={setPeriod}
              customFrom={customFrom}
              customTo={customTo}
              setCustomFrom={setCustomFrom}
              setCustomTo={setCustomTo}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLoading(true);
                setError("");
                fetch(`/api/dashboard?from=${from.toISOString()}&to=${to.toISOString()}`)
                  .then((r) => r.json())
                  .then((d) => {
                    if (d.error) setError(d.error);
                    else setData(d);
                  })
                  .catch(() => setError("Không thể tải dữ liệu từ máy chủ"))
                  .finally(() => setLoading(false));
              }}
              loading={loading}
              icon={<ArrowClockwise size={14} weight="bold" />}
            >
              Làm mới
            </Button>
          </div>
        }
```

Add `ArrowClockwise` to the Phosphor icon imports at the top of the file (alphabetical order):

Find the existing Phosphor imports block and add `ArrowClockwise`:

```tsx
import {
  CurrencyDollar,
  Receipt,
  TrendUp,
  ShoppingBag,
  Wallet,
  Books,
  Cube,
  ArrowUpRight,
  ArrowClockwise,
  CaretDown,
  CaretRight,
  CalendarBlank,
} from "@phosphor-icons/react";
```

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: build success. TS should be happy now.

- [ ] **Step 6: Run full test + lint**

Run: `npm test && npm run lint`
Expected: all pass; lint 0 errors.

- [ ] **Step 7: Commit**

```bash
git add app/components/Dashboard.tsx
git commit -m "feat(dashboard): accept initialData, skip first fetch, add refresh button"
```

---

### Task 5: Final verification

**Files:** None (read-only).

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: same baseline as before — 21+10=31 pass (5 new from Task 1 + 26 pre-existing). 4 pre-existing failures (isbn, google-books, db) unchanged.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Manual smoke test**

On `npm run dev`:
1. Open `/` → no skeleton flash, content immediately visible.
2. DevTools Network → 0 request to `/api/dashboard` on initial load.
3. Change period → loading indicator → updated content.
4. DevTools Network → 1 request to `/api/dashboard` on filter change.
5. Click "Làm mới" → 1 request to `/api/dashboard`.

- [ ] **Step 5: Done**

Không commit gì thêm. Plan hoàn tất.