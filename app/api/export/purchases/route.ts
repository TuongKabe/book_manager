import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCsv, csvResponse, dateFormatter, safeFilename, type CsvColumn } from "@/lib/csv";
import { parseDateRange, dateRangeWhere } from "@/lib/dateRange";

const COLUMNS: CsvColumn[] = [
  { key: "date", label: "Ngày", format: dateFormatter },
  { key: "supplier", label: "Nhà cung cấp" },
  { key: "totalCost", label: "Tổng chi (đ)" },
  { key: "weightGrams", label: "Cân nặng (g)" },
  { key: "bookCount", label: "Số sách" },
  { key: "bookTitles", label: "Danh sách sách" },
  { key: "note", label: "Ghi chú" },
];

export async function GET(req: NextRequest) {
  const { from, to } = parseDateRange({
    from: req.nextUrl.searchParams.get("from"),
    to: req.nextUrl.searchParams.get("to"),
  });
  const where = dateRangeWhere("date", from, to);

  const purchases = await prisma.purchase.findMany({
    where,
    orderBy: { date: "desc" },
    include: { books: { select: { title: true } } },
  });

  const rows = purchases.map((p) => ({
    date: p.date,
    supplier: p.supplier,
    totalCost: p.totalCost,
    weightGrams: p.weightGrams,
    bookCount: p.books.length,
    bookTitles: p.books.map((b) => b.title).join("; "),
    note: p.note,
  }));

  const buffer = buildCsv(rows, COLUMNS);
  return csvResponse(buffer, safeFilename("purchases", from, to));
}