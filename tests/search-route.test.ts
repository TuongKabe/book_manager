import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/search/route";

vi.mock("@/lib/google-books", () => ({
  searchBooksByName: vi.fn(),
}));

import { searchBooksByName } from "@/lib/google-books";

const mockedSearch = vi.mocked(searchBooksByName);

function req(q: string): NextRequest {
  return new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(q)}`);
}

describe("GET /api/search", () => {
  beforeEach(() => {
    mockedSearch.mockReset();
  });

  it("trả 400 khi query rỗng", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "EMPTY_QUERY" });
  });

  it("trả 400 khi query quá ngắn (< 2 ký tự)", async () => {
    const res = await GET(req("a"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "QUERY_TOO_SHORT" });
  });

  it("trả ok:false khi không có kết quả", async () => {
    mockedSearch.mockResolvedValue([]);
    const res = await GET(req("xyznotfound"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, error: "NO_RESULTS" });
  });

  it("trả ok:true và danh sách sách khi tìm thấy", async () => {
    const books = [
      { title: "React Guide", author: "A", category: "C", thumbnail: "", description: "" },
    ];
    mockedSearch.mockResolvedValue(books);
    const res = await GET(req("react"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.books).toHaveLength(1);
    expect(body.books[0].title).toBe("React Guide");
  });
});
