import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_IMPORT_BOOKS, validateImportBook, type ImportBook } from "@/lib/book-import";

export async function POST(req: Request) {
  let payload: unknown;
  try { payload = await req.json(); }
  catch { return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 }); }
  const data = payload as { books?: unknown; requestId?: unknown } | null;
  if (!data || !Array.isArray(data.books) || data.books.length < 1 || data.books.length > MAX_IMPORT_BOOKS) {
    return NextResponse.json({ error: "Cần từ 1 đến 500 sách" }, { status: 400 });
  }
  const books: ImportBook[] = [];
  const errors: string[] = [];
  for (const [i, raw] of data.books.entries()) {
    try { books.push(validateImportBook(raw)); }
    catch (e) { errors.push(`Dòng ${i + 2}: ${(e as Error).message}`); }
  }
  if (errors.length) return NextResponse.json({ error: "Dữ liệu không hợp lệ", errors }, { status: 400 });
  try {
    const inserted = await prisma.book.createMany({ data: books });
    return NextResponse.json({ imported: inserted.count }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Không thể lưu sách. Kiểm tra kết nối cơ sở dữ liệu rồi thử lại." }, { status: 500 });
  }
}
