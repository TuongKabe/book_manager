import { NextRequest, NextResponse } from "next/server";
import { normalizeIsbn, isValidIsbn } from "@/lib/isbn";
import { lookupISBN } from "@/lib/google-books";

export async function GET(req: NextRequest) {
  const isbn = normalizeIsbn(req.nextUrl.searchParams.get("isbn") ?? "");
  if (!isValidIsbn(isbn)) {
    return NextResponse.json({ ok: false, error: "INVALID_ISBN" }, { status: 400 });
  }
  const book = await lookupISBN(isbn);
  if (!book) {
    return NextResponse.json({ ok: false, error: "NO_ISBN_MATCH" });
  }
  return NextResponse.json({ ok: true, book });
}