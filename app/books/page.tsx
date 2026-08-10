import { prisma } from "@/lib/prisma";
import BookListClient from "./BookListClient";

export const dynamic = "force-dynamic";

export default async function BooksPage() {
  const books = await prisma.book.findMany({
    orderBy: { createdAt: "desc" },
    include: { purchase: true },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Kho sách</h1>
      <BookListClient initialBooks={books} />
    </div>
  );
}