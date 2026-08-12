import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildExcel, excelResponse, dateFormatter, safeFilename, type ExcelColumn } from "@/lib/excel";
import { parseDateRange, dateRangeWhere } from "@/lib/dateRange";

const COLUMNS: ExcelColumn[] = [
  { key: "date", label: "Ngày", width: 12, format: dateFormatter },
  { key: "supplier", label: "Nhà cung cấp", width: 24 },
  { key: "totalCost", label: "Tổng chi (đ)", width: 15 },
  { key: "weightGrams", label: "Cân nặng (g)", width: 14 },
  { key: "bookCount", label: "Số sách", width: 10 },
  { key: "bookTitles", label: "Danh sách sách", width: 50 },
  { key: "note", label: "Ghi chú", width: 30 },
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

  const { buffer } = buildExcel([{ name: "Nhập hàng", rows, columns: COLUMNS }]);
  return excelResponse(buffer, safeFilename("purchases", from, to));
}