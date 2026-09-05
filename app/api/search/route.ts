import { NextRequest, NextResponse } from "next/server";
import { searchBooksByName } from "@/lib/google-books";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";

  if (!q.trim()) {
    return NextResponse.json({ ok: false, error: "EMPTY_QUERY" }, { status: 400 });
  }

  if (q.trim().length < 2) {
    return NextResponse.json({ ok: false, error: "QUERY_TOO_SHORT" }, { status: 400 });
  }

  const books = await searchBooksByName(q.trim());

  if (books.length === 0) {
    return NextResponse.json({ ok: false, error: "NO_RESULTS" });
  }

  return NextResponse.json({ ok: true, books });
}
