import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/date";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("date" in body) data.date = body.date ? parseDateOnly(body.date) : new Date();
  if ("supplier" in body) data.supplier = String(body.supplier ?? "");
  if ("totalCost" in body) data.totalCost = body.totalCost ? Number(body.totalCost) : 0;
  if ("note" in body) data.note = body.note ?? null;
  const purchase = await prisma.purchase.update({ where: { id }, data });
  return NextResponse.json(purchase);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.purchase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}