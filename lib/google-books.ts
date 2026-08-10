import { normalizeIsbn, isValidIsbn } from "@/lib/isbn";
import { mapCategory } from "@/lib/categories";

export type BookInfo = {
  title: string;
  author: string;
  category: string;
  thumbnail: string;
  description: string;
};

export async function lookupISBN(
  raw: string,
  fetcher: typeof fetch = fetch,
): Promise<BookInfo | null> {
  const isbn = normalizeIsbn(raw);
  if (!isValidIsbn(raw)) throw new Error("INVALID_ISBN");
  const url =
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}` +
    `&key=${process.env.GOOGLE_BOOKS_API_KEY}&country=VN`;
  const res = await fetcher(url);
  if (!res.ok) return null;
  const data = await res.json();
  const info = data?.items?.[0]?.volumeInfo;
  if (!info) return null;
  return {
    title: info.title ?? "",
    author: info.authors?.join(", ") ?? "",
    category: mapCategory(info.categories?.[0]),
    thumbnail: info.imageLinks?.thumbnail
      ? info.imageLinks.thumbnail.replace(/^http:\/\//, "https://")
      : "",
    description: info.description ?? "",
  };
}