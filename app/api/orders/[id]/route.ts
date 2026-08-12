import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/date";

type Params = { params: Promise<{ id: string }> };

const ORDER_SELECT = {
  id: true,
  date: true,
  customerName: true,
  customerPhone: true,
  customerAddress: true,
  channel: true,
  totalVnd: true,
  shippingFee: true,
  shippingUnit: true,
  weightGrams: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} as const;

const BOOK_SELECT = {
  id: true,
  title: true,
  isbn: true,
  coverPhotoUrl: true,
  listPriceVnd: true,
  weightGrams: true,
} as const;

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { books: { select: BOOK_SELECT } },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const {
    date,
    customerName,
    customerPhone,
    customerAddress,
    channel,
    totalVnd,
    shippingFee,
    shippingUnit,
    weightGrams,
    note,
    addBookIds,
    removeBookIds,
  } = body;

  const data: Record<string, unknown> = {};
  if ("date" in body) data.date = body.date ? parseDateOnly(body.date) : new Date();
  if ("customerName" in body) data.customerName = body.customerName || null;
  if ("customerPhone" in body) data.customerPhone = body.customerPhone || null;
  if ("customerAddress" in body) data.customerAddress = body.customerAddress || null;
  if ("channel" in body) data.channel = body.channel || null;
  if ("totalVnd" in body) data.totalVnd = body.totalVnd ? Number(body.totalVnd) : null;
  if ("shippingFee" in body) data.shippingFee = body.shippingFee ? Number(body.shippingFee) : null;
  if ("shippingUnit" in body) data.shippingUnit = body.shippingUnit || null;
  if ("weightGrams" in body) data.weightGrams = body.weightGrams ? Number(body.weightGrams) : null;
  if ("note" in body) data.note = body.note || null;

  const result = await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data });

    if (Array.isArray(removeBookIds)) {
      for (const bookId of removeBookIds) {
        await tx.book.update({
          where: { id: bookId },
          data: {
            status: "LISTED",
            soldDate: null,
            soldPriceVnd: null,
            soldChannel: null,
            soldOrderId: null,
          },
        });
      }
    }

    if (Array.isArray(addBookIds) && addBookIds.length > 0) {
      const orderRecord = await tx.order.findUnique({ where: { id }, select: ORDER_SELECT });
      const now = new Date();
      for (const bookId of addBookIds) {
        const book = await tx.book.findUnique({ where: { id: bookId } });
        if (!book) continue;
        await tx.book.update({
          where: { id: bookId },
          data: {
            status: "SOLD",
            soldDate: now,
            soldPriceVnd: book.listPriceVnd,
            soldChannel: orderRecord?.channel || null,
            soldOrderId: id,
          },
        });
      }
    }

    return tx.order.findUnique({
      where: { id },
      include: { books: { select: BOOK_SELECT } },
    });
  });

  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.$transaction(async (tx) => {
    await tx.book.updateMany({
      where: { soldOrderId: id },
      data: { status: "LISTED", soldDate: null, soldPriceVnd: null, soldChannel: null, soldOrderId: null },
    });
    await tx.order.delete({ where: { id } });
  });
  return NextResponse.json({ ok: true });
}