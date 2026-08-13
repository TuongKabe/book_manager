import { prisma } from "@/lib/prisma";
import ExpenseClient from "./ExpenseClient";
import { parseDateRange, dateRangeWhere } from "@/lib/dateRange";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { from, to } = parseDateRange(params);
  const where = dateRangeWhere("date", from, to);

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return (
    <ExpenseClient initialExpenses={expenses} initialDateRange={from && to ? { from, to } : null} />
  );
}
