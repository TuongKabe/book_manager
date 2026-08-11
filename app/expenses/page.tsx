import { prisma } from "@/lib/prisma";
import ExpenseClient from "./ExpenseClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Chi phí</h1>
      <ExpenseClient initialExpenses={expenses} />
    </div>
  );
}