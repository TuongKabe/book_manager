import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { books: true } } },
  });
  return NextResponse.json(purchases);
}

export async function POST(req: Request) {
  const body = await req.json();
  const purchase = await prisma.purchase.create({
    data: {
      date: body.date ? new Date(body.date) : new Date(),
      supplier: String(body.supplier ?? ""),
      totalCost: Number(body.totalCost ?? 0),
      note: body.note ?? null,
    },
  });
  return NextResponse.json(purchase, { status: 201 });
}