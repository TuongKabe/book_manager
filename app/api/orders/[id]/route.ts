import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/date";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("date" in body) data.date = body.date ? parseDateOnly(body.date) : new Date();
  if ("channel" in body) data.channel = body.channel ?? null;
  if ("totalVnd" in body) data.totalVnd = body.totalVnd ? Number(body.totalVnd) : null;
  if ("note" in body) data.note = body.note ?? null;
  const order = await prisma.order.update({ where: { id }, data });
  return NextResponse.json(order);
}