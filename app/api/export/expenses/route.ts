import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildExcel, excelResponse, dateFormatter, safeFilename, type ExcelColumn } from "@/lib/excel";
import { parseDateRange, dateRangeWhere } from "@/lib/dateRange";

const COLUMNS: ExcelColumn[] = [
  { key: "date", label: "Ngày", width: 12, format: dateFormatter },
  { key: "category", label: "Loại", width: 15 },
  { key: "amountVnd", label: "Số tiền (đ)", width: 15 },
  { key: "note", label: "Ghi chú", width: 40 },
];

export async function GET(req: NextRequest) {
  const { from, to } = parseDateRange({
    from: req.nextUrl.searchParams.get("from"),
    to: req.nextUrl.searchParams.get("to"),
  });
  const where = dateRangeWhere("date", from, to);

  const expenses = await prisma.expense.findMany({ where, orderBy: { date: "desc" } });
  const { buffer } = buildExcel([{ name: "Chi phí", rows: expenses, columns: COLUMNS }]);
  return excelResponse(buffer, safeFilename("expenses", from, to));
}