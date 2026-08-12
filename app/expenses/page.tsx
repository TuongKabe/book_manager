import { prisma } from "@/lib/prisma";
import ExpenseClient from "./ExpenseClient";
import DateFilter from "@/app/components/DateFilter";
import ExportButton from "@/app/components/ExportButton";
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Chi phí</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DateFilter />
          <ExportButton path="/api/export/expenses" />
        </div>
      </div>
      <ExpenseClient initialExpenses={expenses} />
    </div>
  );
}