import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/lookup/route";

vi.mock("@/lib/google-books", () => ({
  lookupISBN: vi.fn(),
}));

import { lookupISBN } from "@/lib/google-books";

const mockedLookupISBN = vi.mocked(lookupISBN);

function req(isbn: string): NextRequest {
  return new NextRequest(`http://localhost/api/lookup?isbn=${encodeURIComponent(isbn)}`);
}

describe("GET /api/lookup", () => {
  beforeEach(() => {
    mockedLookupISBN.mockReset();
  });

  it("trả 400 khi ISBN không hợp lệ", async () => {
    const res = await GET(req("abc"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "INVALID_ISBN" });
  });

  it("trả ok:false khi không match", async () => {
    mockedLookupISBN.mockResolvedValue(null);
    const res = await GET(req("9786042000011"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, error: "NO_ISBN_MATCH" });
  });

  it("trả ok:true và book khi tìm thấy", async () => {
    const book = {
      title: "Published",
      author: "Chandler Bolt",
      category: "Tham khảo",
      thumbnail: "https://example.com/c.jpg",
      description: "mot cuon sach",
    };
    mockedLookupISBN.mockResolvedValue(book);
    const res = await GET(req("9781539412335"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, book });
  });
});
