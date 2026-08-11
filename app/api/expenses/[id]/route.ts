import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/date";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("date" in body) data.date = body.date ? parseDateOnly(body.date) : new Date();
  if ("category" in body) data.category = String(body.category ?? "");
  if ("amountVnd" in body) data.amountVnd = body.amountVnd ? Number(body.amountVnd) : 0;
  if ("note" in body) data.note = body.note ?? null;
  const expense = await prisma.expense.update({ where: { id }, data });
  return NextResponse.json(expense);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}