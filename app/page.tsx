import { prisma } from "@/lib/prisma";
import { computeStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
const fmt = (n: number) => n.toLocaleString("vi-VN");

export default async function DashboardPage() {
  const [books, expenses] = await Promise.all([
    prisma.book.findMany(),
    prisma.expense.findMany(),
  ]);
  const s = computeStats(books, expenses);
  const cards = [
    { label: "Sách tồn kho", value: String(s.inStock) },
    { label: "Đã bán", value: String(s.sold) },
    { label: "Doanh thu", value: fmt(s.revenue) + "đ" },
    { label: "Chi phí", value: fmt(s.cost) + "đ" },
    { label: "Lợi nhuận", value: fmt(s.profit) + "đ" },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-white p-4">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
