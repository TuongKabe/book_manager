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
