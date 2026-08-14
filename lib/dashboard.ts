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
      SELECT "date", "totalVnd" AS rev, 0 AS cst, 1 AS oc, 0 AS bs
      FROM "Order"
      WHERE "date" BETWEEN ${from} AND ${to}
      UNION ALL
      SELECT "date", 0 AS rev, "amountVnd" AS cst, 0 AS oc, 0 AS bs
      FROM "Expense"
      WHERE "date" BETWEEN ${from} AND ${to}
      UNION ALL
      SELECT "soldDate" AS "date", 0 AS rev, COALESCE("purchaseCostVnd", 0) AS cst, 0 AS oc, 1 AS bs
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
