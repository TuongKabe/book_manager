import { normalizeIsbn } from "@/lib/isbn";

export type BookInfo = {
  title: string;
  author: string;
  category: string;
  thumbnail: string;
  description: string;
};

function isbn10ToIsbn13(isbn10: string): string {
  const nine = "978" + isbn10.slice(0, 9);
  const digits = nine.split("").map(Number);
  const check = digits.reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0) % 10;
  return nine + (10 - check) % 10;
}

async function searchGoogleBooks(query: string, fetcher: typeof fetch = fetch): Promise<BookInfo | null> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}${key ? `&key=${key}` : ""}&country=VN&maxResults=1`;
  const res = await fetcher(url);
  if (!res.ok) return null;
  const data = await res.json();
  const info = data?.items?.[0]?.volumeInfo;
  if (!info) return null;
  return {
    title: info.title ?? "",
    author: info.authors?.join(", ") ?? "",
    category: info.categories?.[0] ?? "",
    thumbnail: info.imageLinks?.thumbnail
      ? info.imageLinks.thumbnail.replace(/^http:\/\//, "https://")
      : "",
    description: info.description ?? "",
  };
}

export async function lookupISBN(
  raw: string,
  fetcher: typeof fetch = fetch,
): Promise<BookInfo | null> {
  const isbn = normalizeIsbn(raw);

  if (/^\d{13}$/.test(isbn)) {
    const book = await searchGoogleBooks(`isbn:${isbn}`, fetcher);
    if (book) return book;
    if (isbn.startsWith("978") || isbn.startsWith("979")) return null;
    return searchGoogleBooks(`isbn:${isbn}`, fetcher);
  }

  if (/^\d{10}$/.test(isbn)) {
    const isbn13 = isbn10ToIsbn13(isbn);
    const book = await searchGoogleBooks(`isbn:${isbn13}`, fetcher);
    if (book) return book;
    return await searchGoogleBooks(`isbn:${isbn}`, fetcher);
  }

  return await searchGoogleBooks(isbn, fetcher);
}
