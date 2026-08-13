import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const result = await prisma.book.updateMany({
    where: { status: "SOLD", soldOrderId: null },
    data: {
      status: "LISTED",
      soldDate: null,
      soldPriceVnd: null,
      soldChannel: null,
      soldOrderId: null,
    },
  });
  return NextResponse.json({ resetCount: result.count });
}
