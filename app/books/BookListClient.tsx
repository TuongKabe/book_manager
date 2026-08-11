"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BookEditForm from "./BookEditForm";

type Purchase = { id: string; supplier: string; date: Date | string } | null;
export type BookRow = {
  id: string;
  isbn: string | null;
  title: string;
  author: string | null;
  category: string | null;
  condition: string | null;
  coverPhotoUrl: string | null;
  listPriceVnd: number | null;
  purchaseCostVnd: number | null;
  status: string;
  purchase: Purchase;
};

export default function BookListClient({ initialBooks }: { initialBooks: BookRow[] }) {
  const router = useRouter();
  const [books, setBooks] = useState(initialBooks);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<BookRow | null>(null);
  const [error, setError] = useState("");

  async function search() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const res = await fetch(`/api/books?${params}`);
    setBooks(await res.json());
  }

  async function markSold(book: BookRow) {
    const res = await fetch(`/api/books/${book.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SOLD" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
      return;
    }
    setError("");
    router.refresh();
    search();
  }

  async function remove(book: BookRow) {
    if (!confirm(`Xóa "${book.title}"?`)) return;
    const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
      return;
    }
    setError("");
    router.refresh();
    search();
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Tìm tên / tác giả / ISBN"
          className="rounded border border-slate-300 px-3 py-2"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); }} className="rounded border border-slate-300 px-3 py-2">
          <option value="">Tất cả</option>
          <option value="INTAKE">Nhập kho</option>
          <option value="LISTED">Đang bán</option>
          <option value="SOLD">Đã bán</option>
        </select>
        <button onClick={search} className="rounded bg-blue-600 px-4 py-2 text-white">Tìm</button>
      </div>

      {books.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-400">
          {q || status ? "Không tìm thấy sách" : "Chưa có sách — dùng Scan hoặc nhập kho"}
        </div>
      ) : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <div key={book.id} className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="flex gap-3">
              {book.coverPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.coverPhotoUrl} alt={book.title} className="h-24 w-16 rounded object-cover" />
              ) : (
                <div className="flex h-24 w-16 items-center justify-center rounded bg-slate-200 text-xs text-slate-500">No cover</div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold">{book.title}</p>
                <p className="text-sm text-slate-500">{book.author}</p>
                <p className="text-xs text-slate-400">{book.isbn}</p>
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5">{book.category}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5">{book.condition}</span>
                  <span className={`rounded px-1.5 py-0.5 ${
                    book.status === "SOLD" ? "bg-green-100 text-green-700"
                    : book.status === "LISTED" ? "bg-blue-100 text-blue-700" : "bg-slate-200"
                  }`}>{book.status}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span>Giá bán: {book.listPriceVnd?.toLocaleString("vi-VN") ?? "-"}đ</span>
              <span>Giá nhập: {book.purchaseCostVnd?.toLocaleString("vi-VN") ?? "-"}đ</span>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => setEditing(book)} className="rounded bg-slate-100 px-3 py-1 text-sm">Sửa</button>
              {book.status !== "SOLD" && (
                <button onClick={() => markSold(book)} className="rounded bg-green-600 px-3 py-1 text-sm text-white">Đã bán</button>
              )}
              <button onClick={() => remove(book)} className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">Xóa</button>
            </div>
          </div>
        ))}
      </div>
      )}

      {editing && (
        <BookEditForm
          book={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); search(); }}
        />
      )}
    </div>
  );
}