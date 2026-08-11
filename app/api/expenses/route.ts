import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(expenses);
}

export async function POST(req: Request) {
  const body = await req.json();
  const expense = await prisma.expense.create({
    data: {
      date: body.date ? new Date(body.date) : new Date(),
      category: String(body.category ?? ""),
      amountVnd: Number(body.amountVnd ?? 0),
      note: body.note ?? null,
    },
  });
  return NextResponse.json(expense, { status: 201 });
}