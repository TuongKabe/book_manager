import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCsv, csvResponse, dateFormatter, safeFilename, type CsvColumn } from "@/lib/csv";
import { parseDateRange, dateRangeWhere } from "@/lib/dateRange";

const COLUMNS: CsvColumn[] = [
  { key: "date", label: "Ngày", format: dateFormatter },
  { key: "customerName", label: "Khách hàng" },
  { key: "customerPhone", label: "SĐT" },
  { key: "customerAddress", label: "Địa chỉ" },
  { key: "channel", label: "Kênh bán" },
  { key: "bookCount", label: "Số sách" },
  { key: "bookTitles", label: "Danh sách sách" },
  { key: "weightGrams", label: "Cân nặng (g)" },
  { key: "shippingUnit", label: "Đơn vị ship" },
  { key: "shippingFee", label: "Phí ship (đ)" },
  { key: "totalVnd", label: "Tổng (đ)" },
  { key: "note", label: "Ghi chú" },
];

export async function GET(req: NextRequest) {
  const { from, to } = parseDateRange({
    from: req.nextUrl.searchParams.get("from"),
    to: req.nextUrl.searchParams.get("to"),
  });
  const where = dateRangeWhere("date", from, to);

  const orders = await prisma.order.findMany({
    where,
    orderBy: { date: "desc" },
    include: { books: { select: { title: true } } },
  });

  const rows = orders.map((o) => ({
    date: o.date,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerAddress: o.customerAddress,
    channel: o.channel,
    bookCount: o.books.length,
    bookTitles: o.books.map((b) => b.title).join("; "),
    weightGrams: o.weightGrams,
    shippingUnit: o.shippingUnit,
    shippingFee: o.shippingFee,
    totalVnd: o.totalVnd,
    note: o.note,
  }));

  const buffer = buildCsv(rows, COLUMNS);
  return csvResponse(buffer, safeFilename("orders", from, to));
}