import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/date";

export async function GET() {
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { books: true } } },
  });
  return NextResponse.json(purchases);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { date, supplier, totalCost, weightGrams, note, books } = body;

  const totalCostNum = totalCost ? Number(totalCost) : 0;
  const weightGramsNum = weightGrams ? Number(weightGrams) : null;
  const bookList: Array<Record<string, unknown>> = Array.isArray(books) ? books : [];
  const count = bookList.length;
  const perBookCost = count > 0 ? Math.floor(totalCostNum / count) : 0;
  const perBookWeight = count > 0 && weightGramsNum ? Math.floor(weightGramsNum / count) : null;

  const result = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        date: date ? parseDateOnly(date) : new Date(),
        supplier: String(supplier ?? ""),
        totalCost: totalCostNum,
        weightGrams: weightGramsNum,
        note: note ?? null,
      },
    });

    for (const book of bookList) {
      const b = book as { isbn?: string | null; title?: unknown; author?: string | null; category?: string | null; condition?: string | null; coverPhotoUrl?: string | null };
      await tx.book.create({
        data: {
          isbn: b.isbn ?? null,
          title: String(b.title ?? ""),
          author: b.author ?? null,
          category: b.category ?? null,
          condition: b.condition ?? null,
          coverPhotoUrl: b.coverPhotoUrl ?? null,
          purchaseId: purchase.id,
          purchaseCostVnd: perBookCost,
          weightGrams: perBookWeight,
          status: "LISTED",
        },
      });
    }

    return tx.purchase.findUnique({
      where: { id: purchase.id },
      include: { _count: { select: { books: true } } },
    });
  });

  return NextResponse.json(result, { status: 201 });
}