import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/date";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { _count: { select: { books: true } }, books: { select: { id: true, title: true, isbn: true, coverPhotoUrl: true, status: true } } },
  });
  if (!purchase) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(purchase);
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("date" in body) data.date = body.date ? parseDateOnly(body.date) : new Date();
  if ("supplier" in body) data.supplier = String(body.supplier ?? "");
  if ("totalCost" in body) data.totalCost = body.totalCost ? Number(body.totalCost) : 0;
  if ("weightGrams" in body) data.weightGrams = body.weightGrams ? Number(body.weightGrams) : null;
  if ("note" in body) data.note = body.note ?? null;
  const purchase = await prisma.purchase.update({ where: { id }, data });
  return NextResponse.json(purchase);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.purchase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}