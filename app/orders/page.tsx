import { prisma } from "@/lib/prisma";
import OrderClient from "./OrderClient";
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
      books: {
        select: {
          id: true,
          title: true,
          isbn: true,
          coverPhotoUrl: true,
          listPriceVnd: true,
          weightGrams: true,
        },
      },
    },
  });

  return <OrderClient initialOrders={orders} initialDateRange={from && to ? { from, to } : null} />;
}
