import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of [
    "title", "isbn", "barcode", "author", "category", "condition",
    "defectsNote", "purchaseId", "soldChannel", "soldOrderId", "notes",
  ]) {
    if (key in body) data[key] = body[key];
  }
  for (const key of ["weightGrams", "purchaseCostVnd", "listPriceVnd", "soldPriceVnd"]) {
    if (key in body) data[key] = body[key] ? Number(body[key]) : null;
  }
  if ("status" in body) data.status = body.status;
  if (body.status === "SOLD" && !body.soldDate) data.soldDate = new Date();
  if (body.status && body.status !== "SOLD") data.soldDate = null;
  const book = await prisma.book.update({ where: { id }, data });
  return NextResponse.json(book);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.book.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}