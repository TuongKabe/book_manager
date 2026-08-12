import { prisma } from "@/lib/prisma";
import OrderClient from "./OrderClient";
import DateFilter from "@/app/components/DateFilter";
import ExportButton from "@/app/components/ExportButton";
import { parseDateRange, dateRangeWhere } from "@/lib/dateRange";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { from, to } = parseDateRange(params);
  const where = dateRangeWhere("date", from, to);

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      books: { select: { id: true, title: true, isbn: true, coverPhotoUrl: true, listPriceVnd: true, weightGrams: true } },
    },
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bán hàng</h1>
          {from && to && (
            <p className="text-sm text-slate-500">
              Kỳ: <span className="font-medium">{from.toLocaleDateString("vi-VN")} → {to.toLocaleDateString("vi-VN")}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateFilter />
          <ExportButton path="/api/export/orders" />
        </div>
      </div>
      <OrderClient initialOrders={orders} />
    </div>
  );
}