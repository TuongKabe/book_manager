import { prisma } from "@/lib/prisma";
import PurchaseListClient from "./PurchaseListClient";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { books: true } }, books: { select: { id: true, title: true } } },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nhập hàng</h1>
      <PurchaseListClient initialPurchases={purchases} />
    </div>
  );
}