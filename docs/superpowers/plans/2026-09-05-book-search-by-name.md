# Book Search by Name — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add book search by title via Google Books API, with multi-result selection UI, integrated as a tab in ISBNScanner.

**Architecture:** New `searchBooksByName` function in `lib/google-books.ts`, new `/api/search` route, new `BookNameSearch` component, and tabbed UI in `ISBNScanner`.

**Tech Stack:** Next.js API routes, Google Books API, React, Tailwind CSS, Vitest

## Global Constraints

- Follow existing code patterns (Vietnamese UI text, same component structure)
- Use existing `BookInfo` type from `lib/google-books.ts`
- Reuse existing UI components (`Button`, `Input`, `Banner`, `Spinner`)
- Tests use Vitest with stub fetch pattern from `tests/google-books.test.ts`
- All UI text in Vietnamese

---

### Task 1: Add `searchBooksByName` function

**Files:**
- Create: (none, modify existing)
- Modify: `lib/google-books.ts:18-35` — add function after `searchGoogleBooks`
- Test: `tests/google-books.test.ts`

**Interfaces:**
- Consumes: Google Books API via `searchGoogleBooks` (existing internal function)
- Produces: `searchBooksByName(query, fetcher?) → Promise<BookInfo[]>`

- [ ] **Step 1: Write the failing test**

Add to `tests/google-books.test.ts`:

```typescript
import { searchBooksByName } from "@/lib/google-books";

describe("searchBooksByName", () => {
  it("trả BookInfo[] khi có kết quả", async () => {
    const books = await searchBooksByName("react", stubFetch({
      items: [
        {
          volumeInfo: {
            title: "Learning React",
            authors: ["Alex Banks"],
            categories: ["Computers"],
            description: "book desc",
            imageLinks: { thumbnail: "http://example.com/a.jpg" },
          },
        },
        {
          volumeInfo: {
            title: "React Hooks",
            authors: ["Eve Porcello"],
            categories: ["Computers"],
            description: "hooks desc",
            imageLinks: { thumbnail: "http://example.com/b.jpg" },
          },
        },
      ],
    }));
    expect(books).toHaveLength(2);
    expect(books[0].title).toBe("Learning React");
    expect(books[1].title).toBe("React Hooks");
  });

  it("trả mảng rỗng khi không có items", async () => {
    const books = await searchBooksByName("xyznotfound", stubFetch({ items: [] }));
    expect(books).toEqual([]);
  });

  it("trả mảng rỗng khi fetch lỗi", async () => {
    const books = await searchBooksByName("react", stubFetch({}, false));
    expect(books).toEqual([]);
  });

  it("bỏ qua items không có volumeInfo", async () => {
    const books = await searchBooksByName("react", stubFetch({
      items: [
        { volumeInfo: { title: "Good Book", authors: ["Author"], categories: ["Cat"] } },
        {},
        { volumeInfo: { title: "Also Good", authors: ["B"], categories: ["C"] } },
      ],
    }));
    expect(books).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/google-books.test.ts`
Expected: FAIL — `searchBooksByName` not exported

- [ ] **Step 3: Implement `searchBooksByName`**

Add to `lib/google-books.ts` after the `searchGoogleBooks` function (line ~35), before `lookupISBN`:

```typescript
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
          category: (Array.isArray(info.categories) ? info.categories[0] : "") as string,
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/google-books.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/google-books.ts tests/google-books.test.ts
git commit -m "feat: add searchBooksByName function for Google Books title search"
```

---

### Task 2: Add `/api/search` route

**Files:**
- Create: `app/api/search/route.ts`
- Test: `tests/search-route.test.ts`

**Interfaces:**
- Consumes: `searchBooksByName` from `lib/google-books.ts`
- Produces: `GET /api/search?q=...` → `{ ok: true, books: BookInfo[] }` or `{ ok: false, error: string }`

- [ ] **Step 1: Write the failing test**

Create `tests/search-route.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/search-route.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the route**

Create `app/api/search/route.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/search-route.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/search/route.ts tests/search-route.test.ts
git commit -m "feat: add /api/search route for book title search"
```

---

### Task 3: Create `BookNameSearch` component

**Files:**
- Create: `app/components/BookNameSearch.tsx`

**Interfaces:**
- Consumes: `/api/search?q=...` API
- Produces: `onFound(isbn: string, book: BookInfo)` callback (isbn may be empty string)

- [ ] **Step 1: Create `BookNameSearch.tsx`**

Create `app/components/BookNameSearch.tsx`:

```tsx
"use client";

import { useState } from "react";
import { MagnifyingGlass, Spinner, WarningCircle } from "@phosphor-icons/react";
import Button from "./ui/Button";
import { Input } from "./ui/Field";
import Banner from "./ui/Banner";

type BookInfo = {
  title: string;
  author: string;
  category: string;
  thumbnail: string;
  description: string;
};

export default function BookNameSearch({
  onFound,
}: {
  onFound: (isbn: string, book: BookInfo) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim() || query.trim().length < 2) return;
    setError("");
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (res.ok && data.ok && data.books?.length > 0) {
        setResults(data.books);
      } else if (data.error === "QUERY_TOO_SHORT") {
        setError("Nhập ít nhất 2 ký tự");
      } else {
        setError("Không tìm thấy sách nào — thử từ khóa khác");
      }
    } catch {
      setError("Lỗi kết nối — thử lại");
    }
    setSearching(false);
    setSearched(true);
  }

  function handleSelect(book: BookInfo) {
    onFound("", book);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Nhập tên sách cần tìm"
            className="pl-8"
          />
        </div>
        <Button
          variant="secondary"
          onClick={handleSearch}
          disabled={!query.trim() || query.trim().length < 2 || searching}
        >
          {searching ? (
            <span className="inline-flex items-center gap-1.5">
              <Spinner size={12} /> Đang tìm
            </span>
          ) : (
            "Tìm"
          )}
        </Button>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      {searching && (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-info">
          <Spinner size={12} /> Đang tìm trên Google Books…
        </span>
      )}

      {!searching && searched && results.length === 0 && !error && (
        <Banner tone="warning">
          <span className="inline-flex items-center gap-1.5">
            <WarningCircle size={14} weight="bold" />
            Không tìm thấy sách nào — thử từ khóa khác.
          </span>
        </Banner>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12.5px] font-medium text-ink-muted">
            Tìm thấy {results.length} kết quả — bấm chọn cuốn phù hợp:
          </p>
          <div className="max-h-80 space-y-2 overflow-auto">
            {results.map((book, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(book)}
                className="flex w-full gap-3 rounded-lg border border-hairline bg-surface p-3 text-left transition hover:border-brand hover:bg-brand-soft"
              >
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded border border-hairline bg-surface-soft">
                  {book.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.thumbnail}
                      alt={book.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-ink-faint">
                      N/A
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{book.title}</p>
                  <p className="truncate text-[12px] text-ink-muted">{book.author}</p>
                  {book.category && (
                    <p className="truncate text-[11px] text-ink-faint">{book.category}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify component compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/components/BookNameSearch.tsx
git commit -m "feat: add BookNameSearch component for searching books by title"
```

---

### Task 4: Add tab UI to `ISBNScanner`

**Files:**
- Modify: `app/components/ISBNScanner.tsx:197-271` — wrap existing content in tabs

**Interfaces:**
- Consumes: `BookNameSearch` component
- Produces: Same `onFound` callback interface (no change)

- [ ] **Step 1: Add tab state and tab UI**

In `ISBNScanner.tsx`, add `useState` for tab after line 25:

```tsx
const [tab, setTab] = useState<"scan" | "search">("scan");
```

Add import for `BookNameSearch` at top:

```tsx
import BookNameSearch from "./BookNameSearch";
```

- [ ] **Step 2: Replace the return JSX with tabbed UI**

Replace the return block (lines 197-271) with:

```tsx
return (
  <div className="space-y-3">
    <div className="flex gap-1 rounded-lg border border-hairline bg-surface-soft p-0.5">
      <button
        type="button"
        onClick={() => setTab("scan")}
        className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
          tab === "scan"
            ? "bg-surface text-ink shadow-xs"
            : "text-ink-muted hover:text-ink"
        }`}
      >
        Quét barcode
      </button>
      <button
        type="button"
        onClick={() => setTab("search")}
        className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
          tab === "search"
            ? "bg-surface text-ink shadow-xs"
            : "text-ink-muted hover:text-ink"
        }`}
      >
        Tìm theo tên
      </button>
    </div>

    {tab === "scan" && (
      <>
        <div className="flex flex-wrap items-center gap-2">
          {cameraSupported !== false && (
            <Button
              variant={scanning ? "secondary" : "primary"}
              size="md"
              onClick={() => {
                setError("");
                setScanning((s) => !s);
              }}
              iconLeft={
                scanning ? <Stop size={14} weight="bold" /> : <Camera size={14} weight="bold" />
              }
            >
              {scanning ? "Dừng quét" : "Quét barcode"}
            </Button>
          )}
          <div className="relative flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <Input
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManual()}
                placeholder="Hoặc nhập ISBN/Barcode rồi bấm Tra"
                className="pl-8"
              />
            </div>
            <Button variant="secondary" onClick={handleManual} disabled={!isbn || looking}>
              {looking ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner size={12} /> Đang tra
                </span>
              ) : (
                "Tra"
              )}
            </Button>
          </div>
        </div>

        {cameraSupported === false && (
          <Banner tone="warning">
            <span className="inline-flex items-center gap-1.5">
              <Warning size={14} weight="bold" />
              Thiết bị không có camera — nhập ISBN tay để tra.
            </span>
          </Banner>
        )}

        {scanning && cameraSupported !== false && (
          <div className="overflow-hidden rounded-lg border border-hairline bg-black">
            <div
              ref={containerRef}
              id={containerId}
              className="mx-auto w-full max-w-md"
              style={{ minHeight: "300px" }}
            />
            <p className="bg-ink px-3 py-2 text-center text-[11.5px] text-on-dark/80">
              Hướng camera vào barcode/ISBN trên bìa sách — giữ chắc tay 5–10 giây.
            </p>
          </div>
        )}

        {error && <Banner tone="danger">{error}</Banner>}
        {looking && (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-info">
            <Spinner size={12} /> Đang tra cứu trên Google Books…
          </span>
        )}
      </>
    )}

    {tab === "search" && (
      <BookNameSearch
        onFound={(isbnCode, book) => {
          onFoundRef.current(isbnCode, book);
        }}
      />
    )}
  </div>
);
```

- [ ] **Step 3: Verify component compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run existing tests**

Run: `npx vitest run`
Expected: All existing tests still PASS

- [ ] **Step 5: Commit**

```bash
git add app/components/ISBNScanner.tsx
git commit -m "feat: add tab UI to ISBNScanner for barcode scan and name search"
```

---

### Task 5: Run full test suite and verify

**Files:** (none created/modified)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run linter**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 4: Final commit if needed**

```bash
git status
# If clean, no commit needed
```
