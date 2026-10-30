import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/date";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { _count: { select: { books: true } }, books: { select: { id: true, title: true, author: true, isbn: true, coverPhotoUrl: true, condition: true, status: true } } },
  });
  if (!purchase) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(purchase);
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if ("date" in body) data.date = body.date ? parseDateOnly(String(body.date)) : new Date();
  if ("supplier" in body) {
    const supplier = String(body.supplier ?? "").trim();
    if (!supplier || supplier.length > 300) return NextResponse.json({ error: "Nhà cung cấp không hợp lệ" }, { status: 400 });
    data.supplier = supplier;
  }
  for (const key of ["totalCost", "weightGrams"] as const) {
    if (key in body) {
      const value = body[key];
      const n = value == null || value === "" ? (key === "totalCost" ? 0 : null) : Number(value);
      if (n != null && (!Number.isSafeInteger(n) || n < 0 || n > 2147483647)) {
        return NextResponse.json({ error: key + " không hợp lệ" }, { status: 400 });
      }
      data[key] = n;
    }
  }
  if ("note" in body) data.note = body.note == null ? null : String(body.note).slice(0, 2000);

  const removedBookIds = body.removedBookIds ?? [];
  const newBooks = body.newBooks ?? [];
  if (!Array.isArray(removedBookIds) || !removedBookIds.every((x) => typeof x === "string") ||
      !Array.isArray(newBooks) || newBooks.length > 500) {
    return NextResponse.json({ error: "Danh sách sách không hợp lệ" }, { status: 400 });
  }
  if (newBooks.length && (typeof body.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))) {
    return NextResponse.json({ error: "Mã phiên cập nhật lô không hợp lệ" }, { status: 400 });
  }

  const entries: { isbn: string | null; title: string; author: string | null; category: string | null; condition: string | null; coverPhotoUrl: string | null }[] = [];
  for (const item of newBooks) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return NextResponse.json({ error: "Thông tin sách mới không hợp lệ" }, { status: 400 });
    }
    const b = item as Record<string, unknown>;
    const title = typeof b.title === "string" ? b.title.trim() : "";
    if (!title || title.length > 300) return NextResponse.json({ error: "Thiếu tiêu đề sách mới" }, { status: 400 });
    const optional = (key: string) => typeof b[key] === "string" ? (b[key] as string).trim() || null : null;
    entries.push({ title, isbn: optional("isbn"), author: optional("author"), category: optional("category"), condition: optional("condition"), coverPhotoUrl: optional("coverPhotoUrl") });
  }

  try {
    const purchase = await prisma.$transaction(async (tx) => {
      await tx.purchase.update({ where: { id }, data });
      if (removedBookIds.length) {
        await tx.book.updateMany({ where: { id: { in: removedBookIds }, purchaseId: id }, data: { purchaseId: null } });
      }
      if (entries.length) {
        const remaining = await tx.book.count({ where: { purchaseId: id } });
        const totalCost = typeof data.totalCost === "number" ? data.totalCost : 0;
        const weight = typeof data.weightGrams === "number" ? data.weightGrams : null;
        const count = remaining + entries.length;
        await tx.book.createMany({
          data: entries.map((b, index) => ({
            ...b,
            id: `purchase-add-${body.requestId}-${index + 1}`,
            purchaseId: id,
            status: "LISTED",
            purchaseCostVnd: count ? Math.floor(totalCost / count) : 0,
            weightGrams: weight != null && count ? Math.floor(weight / count) : null,
          })),
          skipDuplicates: true,
        });
      }
      return tx.purchase.findUniqueOrThrow({
        where: { id },
        include: { _count: { select: { books: true } }, books: { select: { id: true, title: true, author: true, isbn: true, coverPhotoUrl: true, condition: true, status: true } } },
      });
    });
    return NextResponse.json(purchase);
  } catch {
    return NextResponse.json({ error: "Không lưu được toàn bộ lô. Dữ liệu cũ được giữ nguyên." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.purchase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}