import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function inRange(d: Date, from: Date, to: Date): boolean {
  return d >= from && d <= to;
}

export async function GET(req: NextRequest) {
  const from = parseDate(req.nextUrl.searchParams.get("from"));
  const to = parseDate(req.nextUrl.searchParams.get("to"));
  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to dates" }, { status: 400 });
  }
  to.setHours(23, 59, 59, 999);

  const [orders, expenses, booksSold, inStockCount] = await Promise.all([
    prisma.order.findMany({
      where: { date: { gte: from, lte: to } },
      include: { books: { select: { id: true, title: true, listPriceVnd: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
      orderBy: { date: "desc" },
    }),
    prisma.book.findMany({
      where: { soldDate: { gte: from, lte: to } },
      select: { id: true, title: true, soldPriceVnd: true, listPriceVnd: true, purchaseCostVnd: true, soldDate: true, soldOrderId: true },
    }),
    prisma.book.count({ where: { status: { in: ["LISTED", "INTAKE"] } } }),
  ]);

  const revenue = orders.reduce((s, o) => s + (o.totalVnd ?? 0), 0);
  const bookCost = booksSold.reduce((s, b) => s + (b.purchaseCostVnd ?? 0), 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amountVnd, 0);
  const cost = bookCost + expenseTotal;
  const profit = revenue - cost;
  const orderCount = orders.length;
  const bookSoldCount = booksSold.length;
  const avgOrderValue = orderCount > 0 ? Math.floor(revenue / orderCount) : 0;
  const profitMargin = revenue > 0 ? Math.floor((profit / revenue) * 100) : 0;

  const monthlyMap = new Map<string, { revenue: number; cost: number; orderCount: number; bookSold: number }>();
  const months: string[] = [];
  {
    const cur = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cur <= end) {
      const k = monthKey(cur);
      months.push(k);
      monthlyMap.set(k, { revenue: 0, cost: 0, orderCount: 0, bookSold: 0 });
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  for (const o of orders) {
    const k = monthKey(new Date(o.date));
    const m = monthlyMap.get(k);
    if (m) {
      m.revenue += o.totalVnd ?? 0;
      m.orderCount += 1;
    }
  }
  for (const e of expenses) {
    const k = monthKey(new Date(e.date));
    const m = monthlyMap.get(k);
    if (m) m.cost += e.amountVnd;
  }
  for (const b of booksSold) {
    if (!b.soldDate) continue;
    const k = monthKey(new Date(b.soldDate));
    const m = monthlyMap.get(k);
    if (m) {
      m.cost += b.purchaseCostVnd ?? 0;
      m.bookSold += 1;
    }
  }
  const monthly = months.map((m) => {
    const data = monthlyMap.get(m)!;
    return {
      month: m,
      revenue: data.revenue,
      cost: data.cost,
      profit: data.revenue - data.cost,
      orderCount: data.orderCount,
      bookSold: data.bookSold,
    };
  });

  const bookSales = new Map<string, { id: string; title: string; count: number; revenue: number }>();
  for (const o of orders) {
    for (const b of o.books) {
      const ex = bookSales.get(b.id) ?? { id: b.id, title: b.title, count: 0, revenue: 0 };
      ex.count += 1;
      ex.revenue += b.listPriceVnd ?? 0;
      bookSales.set(b.id, ex);
    }
  }
  const topBooks = Array.from(bookSales.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const expenseByCategory = new Map<string, number>();
  for (const e of expenses) {
    expenseByCategory.set(e.category, (expenseByCategory.get(e.category) ?? 0) + e.amountVnd);
  }
  const topExpenses = Array.from(expenseByCategory.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
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
    recentOrders: orders.slice(0, 10).map((o) => ({
      id: o.id,
      date: o.date,
      customer: o.customerName,
      channel: o.channel,
      total: o.totalVnd,
    })),
    recentExpenses: expenses.slice(0, 10).map((e) => ({
      id: e.id,
      date: e.date,
      category: e.category,
      amount: e.amountVnd,
      note: e.note,
    })),
  });
}