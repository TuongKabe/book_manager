import { prisma } from "@/lib/prisma";
import PurchaseListClient from "./PurchaseListClient";
import DateFilter from "@/app/components/DateFilter";
import { parseDateRange, dateRangeWhere } from "@/lib/dateRange";

export const dynamic = "force-dynamic";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { from, to } = parseDateRange(params);
  const where = dateRangeWhere("date", from, to);

  const purchases = await prisma.purchase.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { books: true } },
      books: { select: { id: true, title: true, author: true, isbn: true, coverPhotoUrl: true, condition: true, status: true } },
    },
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Nhập hàng</h1>
        <DateFilter />
      </div>
      <PurchaseListClient initialPurchases={purchases} />
    </div>
  );
}