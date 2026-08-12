import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCsv, csvResponse, dateFormatter, safeFilename, type CsvColumn } from "@/lib/csv";
import { parseDateRange, dateRangeWhere } from "@/lib/dateRange";

const COLUMNS: CsvColumn[] = [
  { key: "createdAt", label: "Ngày nhập", format: dateFormatter },
  { key: "isbn", label: "ISBN" },
  { key: "title", label: "Tiêu đề" },
  { key: "author", label: "Tác giả" },
  { key: "category", label: "Phân loại" },
  { key: "condition", label: "Tình trạng" },
  { key: "purchaseCostVnd", label: "Giá nhập (đ)" },
  { key: "listPriceVnd", label: "Giá bán (đ)" },
  { key: "weightGrams", label: "Cân nặng (g)" },
  { key: "status", label: "Trạng thái" },
  { key: "purchaseSupplier", label: "Lô nhập" },
  { key: "soldDate", label: "Ngày bán", format: dateFormatter },
  { key: "soldPriceVnd", label: "Giá bán được (đ)" },
  { key: "soldChannel", label: "Kênh bán" },
  { key: "orderCustomer", label: "Khách mua" },
  { key: "notes", label: "Ghi chú" },
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

  const buffer = buildCsv(rows, COLUMNS);
  return csvResponse(buffer, safeFilename("books", from, to));
}