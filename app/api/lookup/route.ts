import { NextRequest, NextResponse } from "next/server";
import { isValidIsbn, normalizeIsbn } from "@/lib/isbn";
import { lookupISBN } from "@/lib/google-books";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("isbn") ?? "";
  const isbn = normalizeIsbn(raw);

  if (!isValidIsbn(isbn)) {
    return NextResponse.json({ ok: false, error: "INVALID_ISBN" }, { status: 400 });
  }

  const book = await lookupISBN(isbn);
  if (!book) {
    return NextResponse.json({ ok: false, error: "NO_ISBN_MATCH" });
  }
  return NextResponse.json({ ok: true, book });
}
