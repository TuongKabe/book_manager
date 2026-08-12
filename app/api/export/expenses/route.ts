import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCsv, csvResponse, dateFormatter, safeFilename, type CsvColumn } from "@/lib/csv";
import { parseDateRange, dateRangeWhere } from "@/lib/dateRange";

const COLUMNS: CsvColumn[] = [
  { key: "date", label: "Ngày", format: dateFormatter },
  { key: "category", label: "Loại" },
  { key: "amountVnd", label: "Số tiền (đ)" },
  { key: "note", label: "Ghi chú" },
];

export async function GET(req: NextRequest) {
  const { from, to } = parseDateRange({
    from: req.nextUrl.searchParams.get("from"),
    to: req.nextUrl.searchParams.get("to"),
  });
  const where = dateRangeWhere("date", from, to);

  const expenses = await prisma.expense.findMany({ where, orderBy: { date: "desc" } });
  const buffer = buildCsv(expenses, COLUMNS);
  return csvResponse(buffer, safeFilename("expenses", from, to));
}