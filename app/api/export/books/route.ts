import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildExcel, excelResponse, dateFormatter, safeFilename, type ExcelColumn } from "@/lib/excel";
import { parseDateRange, dateRangeWhere } from "@/lib/dateRange";

const BOOK_COLUMNS: ExcelColumn[] = [
  { key: "createdAt", label: "Ngày nhập", width: 12, format: dateFormatter },
  { key: "isbn", label: "ISBN", width: 16 },
  { key: "title", label: "Tiêu đề", width: 36 },
  { key: "author", label: "Tác giả", width: 22 },
  { key: "category", label: "Phân loại", width: 14 },
  { key: "condition", label: "Tình trạng", width: 12 },
  { key: "purchaseCostVnd", label: "Giá nhập (đ)", width: 14 },
  { key: "listPriceVnd", label: "Giá bán (đ)", width: 14 },
  { key: "weightGrams", label: "Cân nặng (g)", width: 14 },
  { key: "status", label: "Trạng thái", width: 12 },
  { key: "purchaseSupplier", label: "Lô nhập", width: 22 },
  { key: "soldDate", label: "Ngày bán", width: 12, format: dateFormatter },
  { key: "soldPriceVnd", label: "Giá bán được (đ)", width: 16 },
  { key: "soldChannel", label: "Kênh bán", width: 14 },
  { key: "orderCustomer", label: "Khách mua", width: 22 },
  { key: "notes", label: "Ghi chú", width: 30 },
];

export async function GET(req: NextRequest) {
  const { from, to } = parseDateRange({
    from: req.nextUrl.searchParams.get("from"),
    to: req.nextUrl.searchParams.get("to"),
  });
  const where = dateRangeWhere("createdAt", from, to);

  const books = await prisma.book.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { purchase: { select: { supplier: true } }, soldOrder: { select: { customerName: true } } },
  });

  const rows = books.map((b) => ({
    createdAt: b.createdAt,
    isbn: b.isbn,
    title: b.title,
    author: b.author,
    category: b.category,
    condition: b.condition,
    purchaseCostVnd: b.purchaseCostVnd,
    listPriceVnd: b.listPriceVnd,
    weightGrams: b.weightGrams,
    status: b.status,
    soldDate: b.soldDate,
    soldPriceVnd: b.soldPriceVnd,
    soldChannel: b.soldChannel,
    purchaseSupplier: b.purchase?.supplier ?? null,
    orderCustomer: b.soldOrder?.customerName ?? null,
    notes: b.notes,
  }));

  const statsRows = (() => {
    const byStatus = new Map<string, { count: number; totalCost: number; totalPrice: number }>();
    for (const b of rows) {
      const ex = byStatus.get(b.status) ?? { count: 0, totalCost: 0, totalPrice: 0 };
      ex.count += 1;
      ex.totalCost += b.purchaseCostVnd ?? 0;
      ex.totalPrice += b.listPriceVnd ?? 0;
      byStatus.set(b.status, ex);
    }
    return Array.from(byStatus.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      totalCost: data.totalCost,
      totalListPrice: data.totalPrice,
      potentialProfit: data.totalPrice - data.totalCost,
    }));
  })();

  const { buffer } = buildExcel([
    { name: "Kho sách", rows, columns: BOOK_COLUMNS },
    { name: "Thống kê", rows: statsRows, columns: [
      { key: "status", label: "Trạng thái", width: 14 },
      { key: "count", label: "Số sách", width: 12 },
      { key: "totalCost", label: "Tổng giá nhập (đ)", width: 18 },
      { key: "totalListPrice", label: "Tổng giá bán (đ)", width: 18 },
      { key: "potentialProfit", label: "Lợi nhuận tiềm năng (đ)", width: 22 },
    ] },
  ]);
  return excelResponse(buffer, safeFilename("books", from, to));
}