import { prisma } from "@/lib/prisma";
import BookListClient from "./BookListClient";
import { parseDateRange, dateRangeWhere } from "@/lib/dateRange";

export const dynamic = "force-dynamic";

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { from, to } = parseDateRange(params);
  const where = dateRangeWhere("createdAt", from, to);

  const books = await prisma.book.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { purchase: true },
  });
  return <BookListClient initialBooks={books} />;
}
