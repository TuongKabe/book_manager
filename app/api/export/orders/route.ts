import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildExcel, excelResponse, dateFormatter, safeFilename, type ExcelColumn } from "@/lib/excel";
import { parseDateRange, dateRangeWhere } from "@/lib/dateRange";

const COLUMNS: ExcelColumn[] = [
  { key: "date", label: "Ngày", width: 12, format: dateFormatter },
  { key: "customerName", label: "Khách hàng", width: 22 },
  { key: "customerPhone", label: "SĐT", width: 14 },
  { key: "customerAddress", label: "Địa chỉ", width: 40 },
  { key: "channel", label: "Kênh bán", width: 14 },
  { key: "bookCount", label: "Số sách", width: 10 },
  { key: "bookTitles", label: "Danh sách sách", width: 50 },
  { key: "weightGrams", label: "Cân nặng (g)", width: 14 },
  { key: "shippingUnit", label: "Đơn vị ship", width: 14 },
  { key: "shippingFee", label: "Phí ship (đ)", width: 14 },
  { key: "totalVnd", label: "Tổng (đ)", width: 15 },
  { key: "note", label: "Ghi chú", width: 30 },
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

  const { buffer } = buildExcel([{ name: "Bán hàng", rows, columns: COLUMNS }]);
  return excelResponse(buffer, safeFilename("orders", from, to));
}