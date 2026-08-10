import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeStats } from "@/lib/stats";

export async function GET() {
  const [books, expenses] = await Promise.all([
    prisma.book.findMany(),
    prisma.expense.findMany(),
  ]);
  return NextResponse.json({ status: "ok", data: computeStats(books, expenses) });
}