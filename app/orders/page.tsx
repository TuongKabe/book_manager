import { prisma } from "@/lib/prisma";
import OrderClient from "./OrderClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bán hàng</h1>
      <OrderClient initialOrders={orders} />
    </div>
  );
}