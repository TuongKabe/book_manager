import { prisma } from "@/lib/prisma";
import BookListClient from "./BookListClient";
import DateFilter from "@/app/components/DateFilter";
import ExportButton from "@/app/components/ExportButton";
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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Kho sách</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DateFilter />
          <ExportButton path="/api/export/books" />
        </div>
      </div>
      <BookListClient initialBooks={books} />
    </div>
  );
}