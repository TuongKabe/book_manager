import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/date";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const status = req.nextUrl.searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { author: { contains: q, mode: "insensitive" } },
      { isbn: { contains: q } },
    ];
  }
  if (status) where.status = status;
  const books = await prisma.book.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { purchase: true },
  });
  return NextResponse.json(books);
}

export async function POST(req: Request) {
  const body = await req.json();
  const book = await prisma.book.create({
    data: {
      title: String(body.title ?? ""),
      isbn: body.isbn ?? null,
      barcode: body.barcode ?? null,
      author: body.author ?? null,
      category: body.category ?? null,
      condition: body.condition ?? null,
      weightGrams: body.weightGrams ? Number(body.weightGrams) : null,
      coverPhotoUrl: body.coverPhotoUrl ?? null,
      defectsNote: body.defectsNote ?? null,
      purchaseId: body.purchaseId ?? null,
      purchaseCostVnd: body.purchaseCostVnd ? Number(body.purchaseCostVnd) : null,
      listPriceVnd: body.listPriceVnd ? Number(body.listPriceVnd) : null,
      status: body.status ?? "INTAKE",
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(book, { status: 201 });
}