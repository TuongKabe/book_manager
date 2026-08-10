import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const body = await req.json();
  const order = await prisma.order.create({
    data: {
      date: body.date ? new Date(body.date) : new Date(),
      channel: body.channel ?? null,
      totalVnd: body.totalVnd ? Number(body.totalVnd) : null,
      note: body.note ?? null,
    },
  });
  return NextResponse.json(order, { status: 201 });
}