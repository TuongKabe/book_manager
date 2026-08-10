type BookRow = { status: string; soldPriceVnd: number | null; purchaseCostVnd: number | null };
type ExpenseRow = { amountVnd: number };

export type Stats = {
  inStock: number;
  sold: number;
  revenue: number;
  cost: number;
  profit: number;
};

export function computeStats(books: BookRow[], expenses: ExpenseRow[]): Stats {
  const inStock = books.filter((b) => b.status !== "SOLD").length;
  const sold = books.filter((b) => b.status === "SOLD").length;
  const revenue = books
    .filter((b) => b.status === "SOLD")
    .reduce((t, b) => t + (b.soldPriceVnd ?? 0), 0);
  const stockCost = books.reduce((t, b) => t + (b.purchaseCostVnd ?? 0), 0);
  const expenseTotal = expenses.reduce((t, e) => t + e.amountVnd, 0);
  const cost = stockCost + expenseTotal;
  return { inStock, sold, revenue, cost, profit: revenue - cost };
}