import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/date";

export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      books: {
        select: { id: true, title: true, isbn: true, coverPhotoUrl: true, listPriceVnd: true, weightGrams: true },
      },
    },
  });
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
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
    bookIds,
  } = body;

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        date: date ? parseDateOnly(date) : new Date(),
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerAddress: customerAddress || null,
        channel: channel || null,
        totalVnd: totalVnd ? Number(totalVnd) : null,
        shippingFee: shippingFee ? Number(shippingFee) : null,
        shippingUnit: shippingUnit || null,
        weightGrams: weightGrams ? Number(weightGrams) : null,
        note: note || null,
      },
    });

    if (Array.isArray(bookIds) && bookIds.length > 0) {
      const now = new Date();
      for (const bookId of bookIds) {
        const book = await tx.book.findUnique({ where: { id: bookId } });
        if (!book) continue;
        await tx.book.update({
          where: { id: bookId },
          data: {
            status: "SOLD",
            soldDate: now,
            soldPriceVnd: book.listPriceVnd,
            soldChannel: channel || null,
            soldOrderId: order.id,
          },
        });
      }
    }

    return tx.order.findUnique({
      where: { id: order.id },
      include: {
        books: { select: { id: true, title: true, isbn: true, coverPhotoUrl: true, listPriceVnd: true, weightGrams: true } },
      },
    });
  });

  return NextResponse.json(result, { status: 201 });
}