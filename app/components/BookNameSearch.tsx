"use client";

import { useState } from "react";
import { MagnifyingGlass, Spinner, WarningCircle } from "@phosphor-icons/react";
import Button from "./ui/Button";
import { Input } from "./ui/Field";
import Banner from "./ui/Banner";
import type { BookInfo } from "@/lib/google-books";

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
