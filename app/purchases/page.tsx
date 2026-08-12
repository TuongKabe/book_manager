import { prisma } from "@/lib/prisma";
import PurchaseListClient from "./PurchaseListClient";
import DateFilter from "@/app/components/DateFilter";
import ExportButton from "@/app/components/ExportButton";
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
        <div>
          <h1 className="text-2xl font-bold">Nhập hàng</h1>
          {from && to && (
            <p className="text-sm text-slate-500">
              Kỳ: <span className="font-medium">{from.toLocaleDateString("vi-VN")} → {to.toLocaleDateString("vi-VN")}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateFilter />
          <ExportButton path="/api/export/purchases" />
        </div>
      </div>
      <PurchaseListClient initialPurchases={purchases} />
    </div>
  );
}