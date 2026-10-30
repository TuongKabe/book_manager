import { isValidIsbn, normalizeIsbn } from "@/lib/isbn";
import { mapCategory } from "@/lib/categories";

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
  let info;
  try {
    const res = await fetcher(url);
    if (!res.ok) return null;
    const data = await res.json();
    info = data?.items?.[0]?.volumeInfo;
  } catch { return null; }
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

export async function searchBooksByName(
  query: string,
  fetcher: typeof fetch = fetch,
): Promise<BookInfo[]> {
  if (!query.trim()) return [];
  try {
    const key = process.env.GOOGLE_BOOKS_API_KEY;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}${key ? `&key=${key}` : ""}&country=VN&maxResults=8`;
    const res = await fetcher(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.items)) return [];
    return data.items
      .map((item: { volumeInfo?: Record<string, unknown> }) => {
        const info = item.volumeInfo;
        if (!info) return null;
        return {
          title: (info.title as string) ?? "",
          author: (Array.isArray(info.authors) ? info.authors.join(", ") : "") as string,
          category: mapCategory((Array.isArray(info.categories) ? info.categories[0] : "") as string),
          thumbnail: ((info.imageLinks as Record<string, string>)?.thumbnail ?? "").replace(
            /^http:\/\//,
            "https://",
          ),
          description: (info.description as string) ?? "",
        } as BookInfo;
      })
      .filter(Boolean) as BookInfo[];
  } catch {
    return [];
  }
}


// Try a second catalogue when Google Books cannot match a valid ISBN.
async function searchOpenLibrary(isbn: string, fetcher: typeof fetch): Promise<BookInfo | null> {
  try {
    const res = await fetcher(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.title !== "string" || !data.title.trim()) return null;
    const coverId = Array.isArray(data.covers) && Number.isSafeInteger(data.covers[0]) && data.covers[0] > 0 ? data.covers[0] : null;
    return {
      title: data.title.trim(),
      author: "",
      category: "Khác",
      thumbnail: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : "",
      description: typeof data.description === "string" ? data.description : (data.description?.value ?? ""),
    };
  } catch { return null; }
}

export async function lookupISBN(
  raw: string,
  fetcher: typeof fetch = fetch,
): Promise<BookInfo | null> {
  const isbn = normalizeIsbn(raw);
  if (!isValidIsbn(isbn)) throw new Error("INVALID_ISBN");

  if (/^\d{13}$/.test(isbn)) {
    const book = await searchGoogleBooks(`isbn:${isbn}`, fetcher);
    if (book) return book;
    return searchOpenLibrary(isbn, fetcher);
  }

  if (/^\d{9}[\dX]$/.test(isbn)) {
    const isbn13 = isbn10ToIsbn13(isbn);
    const book = await searchGoogleBooks(`isbn:${isbn13}`, fetcher);
    if (book) return book;
    return (await searchGoogleBooks(`isbn:${isbn}`, fetcher)) ?? searchOpenLibrary(isbn, fetcher);
  }

  return null;
}
