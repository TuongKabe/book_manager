"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlass,
  CurrencyDollar,
  Tag,
  CheckCircle,
  Book,
  PencilSimple,
  TrashSimple,
  Package,
  Coins,
} from "@phosphor-icons/react";
import BookEditForm from "./BookEditForm";
import PageHeader from "@/app/components/ui/PageHeader";
import StatTile from "@/app/components/ui/StatTile";
import EmptyState from "@/app/components/ui/EmptyState";
import Pill from "@/app/components/ui/Pill";
import Banner from "@/app/components/ui/Banner";
import Button from "@/app/components/ui/Button";
import Card, { CardHeader, CardBody } from "@/app/components/ui/Card";
import { Select, Input } from "@/app/components/ui/Field";
import { StatSkeletonGrid } from "@/app/components/ui/Skeleton";

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

const fmt = (n: number) => n.toLocaleString("vi-VN");

const STATUS_LABEL: Record<string, { label: string; tone: "intake" | "listed" | "sold" }> = {
  INTAKE: { label: "Nhập kho", tone: "intake" },
  LISTED: { label: "Đang bán", tone: "listed" },
  SOLD: { label: "Đã bán", tone: "sold" },
};

export default function BookListClient({ initialBooks }: { initialBooks: BookRow[] }) {
  const [books, setBooks] = useState(initialBooks);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<BookRow | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchBooks(searchQ: string, searchStatus: string) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (searchQ) params.set("q", searchQ);
      if (searchStatus) params.set("status", searchStatus);
      const res = await fetch(`/api/books?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Không thể tải danh sách sách");
        return;
      }
      setBooks(await res.json());
    } catch {
      setError("Không thể kết nối tới máy chủ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => fetchBooks(q, status));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const stats = useMemo(() => {
    const total = books.length;
    const totalCost = books.reduce((s, b) => s + (b.purchaseCostVnd ?? 0), 0);
    const totalPrice = books.reduce((s, b) => s + (b.listPriceVnd ?? 0), 0);
    const soldBooks = books.filter((b) => b.status === "SOLD");
    const listedBooks = books.filter((b) => b.status === "LISTED");
    const intakeBooks = books.filter((b) => b.status === "INTAKE");
    const soldRevenue = soldBooks.reduce((s, b) => s + (b.listPriceVnd ?? 0), 0);
    const soldCost = soldBooks.reduce((s, b) => s + (b.purchaseCostVnd ?? 0), 0);
    const listedValue = listedBooks.reduce((s, b) => s + (b.listPriceVnd ?? 0), 0);
    const listedCost = listedBooks.reduce((s, b) => s + (b.purchaseCostVnd ?? 0), 0);
    const potentialProfit = totalPrice - totalCost;
    const realizedProfit = soldRevenue - soldCost;
    const listedPotentialProfit = listedValue - listedCost;
    return {
      total,
      totalCost,
      totalPrice,
      potentialProfit,
      realizedProfit,
      soldCount: soldBooks.length,
      listedCount: listedBooks.length,
      intakeCount: intakeBooks.length,
      soldRevenue,
      listedValue,
      listedPotentialProfit,
    };
  }, [books]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; cost: number; price: number }>();
    for (const b of books) {
      const key = b.category ?? "Khác";
      const ex = map.get(key) ?? { count: 0, cost: 0, price: 0 };
      ex.count += 1;
      ex.cost += b.purchaseCostVnd ?? 0;
      ex.price += b.listPriceVnd ?? 0;
      map.set(key, ex);
    }
    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        ...data,
        profit: data.price - data.cost,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [books]);

  async function markSold(book: BookRow) {
    if (!confirm(`Đánh dấu "${book.title}" là đã bán?`)) return;
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
    fetchBooks(q, status);
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
    fetchBooks(q, status);
  }

  const maxCatCount = Math.max(...categoryBreakdown.map((c) => c.count), 1);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kho sách"
        description="Toàn bộ sách đang có trong kho, đang bán và đã bán."
      />

      {error && <Banner tone="danger">{error}</Banner>}

      {loading && books.length === 0 ? (
        <StatSkeletonGrid count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Tổng sách"
            value={String(stats.total)}
            sub="Hiện đang có"
            tone="info"
            icon={<Package size={16} weight="bold" />}
          />
          <StatTile
            label="Tổng giá nhập"
            value={`${fmt(stats.totalCost)}đ`}
            sub="Vốn"
            tone="warning"
            icon={<Coins size={16} weight="bold" />}
          />
          <StatTile
            label="Tổng giá bán"
            value={`${fmt(stats.totalPrice)}đ`}
            sub="Niêm yết"
            tone="brand"
            icon={<Tag size={16} weight="bold" />}
          />
          <StatTile
            label="Lợi nhuận tiềm năng"
            value={`${fmt(stats.potentialProfit)}đ`}
            sub={`Đã thực hiện ${fmt(stats.realizedProfit)}đ`}
            tone={stats.potentialProfit >= 0 ? "success" : "danger"}
            icon={<CurrencyDollar size={16} weight="bold" />}
          />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Phân bổ theo trạng thái" />
          <CardBody>
            {stats.total === 0 ? (
              <p className="text-[13px] text-ink-faint">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-2.5">
                {((
                  [
                    ["INTAKE", stats.intakeCount, 0],
                    ["LISTED", stats.listedCount, stats.listedValue],
                    ["SOLD", stats.soldCount, stats.soldRevenue],
                  ] as const
                )).map(([code, count, value]) => {
                  const cfg = STATUS_LABEL[code];
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={code} className="grid grid-cols-[80px_1fr_72px] items-center gap-3">
                      <Pill tone={cfg.tone} size="sm">
                        {cfg.label}
                      </Pill>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
                        <div
                          className={[
                            "h-full rounded-full",
                            code === "SOLD" ? "bg-success" : code === "LISTED" ? "bg-info" : "bg-ink-faint",
                          ].join(" ")}
                          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      <div className="text-right font-tabular">
                        <p className="text-[13px] font-semibold text-ink">{count}</p>
                        {value > 0 && (
                          <p className="text-[11px] text-ink-faint">{fmt(value)}đ</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="mt-3 flex flex-col gap-1.5 border-t border-hairline pt-3 text-[12px] text-ink-faint sm:flex-row sm:justify-between">
                  <span>
                    Đang bán — giá trị tiềm năng:{" "}
                    <strong className="font-tabular text-info">{fmt(stats.listedPotentialProfit)}đ</strong>
                  </span>
                  <span>
                    Đã bán — lợi nhuận:{" "}
                    <strong className="font-tabular text-success">{fmt(stats.realizedProfit)}đ</strong>
                  </span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top 5 thể loại" description="Sắp xếp theo số lượng sách." />
          <CardBody>
            {categoryBreakdown.length === 0 ? (
              <p className="text-[13px] text-ink-faint">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-2.5">
                {categoryBreakdown.map((c) => (
                  <div key={c.category} className="grid grid-cols-[110px_1fr_60px_72px] items-center gap-3">
                    <span className="truncate text-[13px] text-ink-muted">{c.category}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(c.count / maxCatCount) * 100}%` }} />
                    </div>
                    <span className="font-mono text-right text-[12px] text-ink">{c.count}</span>
                    <span className="font-tabular text-right text-[12px] text-ink-faint">
                      {fmt(c.price)}đ
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Filters / search */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlass
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchBooks(q, status)}
                placeholder="Tìm theo tên, tác giả hoặc ISBN…"
                className="pl-8"
              />
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
              <option value="">Tất cả trạng thái</option>
              <option value="INTAKE">Nhập kho</option>
              <option value="LISTED">Đang bán</option>
              <option value="SOLD">Đã bán</option>
            </Select>
            <Button
              variant="primary"
              loading={loading}
              onClick={() => fetchBooks(q, status)}
              iconLeft={<MagnifyingGlass size={14} weight="bold" />}
            >
              Tìm
            </Button>
          </div>
        </CardBody>
      </Card>

      {books.length === 0 ? (
        <EmptyState
          icon={<Book size={24} weight="duotone" />}
          title={q || status ? "Không tìm thấy sách" : "Kho sách trống"}
          description={q || status ? "Thử thay đổi từ khoá hoặc bộ lọc trạng thái." : "Bắt đầu bằng cách quét ISBN hoặc nhập một lô hàng mới."}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={() => setEditing(book)}
              onMarkSold={() => markSold(book)}
              onDelete={() => remove(book)}
            />
          ))}
        </div>
      )}

      {editing && (
        <BookEditForm
          book={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            fetchBooks(q, status);
          }}
        />
      )}
    </div>
  );
}

function BookCard({
  book,
  onEdit,
  onMarkSold,
  onDelete,
}: {
  book: BookRow;
  onEdit: () => void;
  onMarkSold: () => void;
  onDelete: () => void;
}) {
  const cfg = STATUS_LABEL[book.status];
  const profit = (book.listPriceVnd ?? 0) - (book.purchaseCostVnd ?? 0);
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-hairline bg-surface shadow-xs transition-shadow hover:shadow-md">
      <div className="flex gap-3 p-3">
        <div className="flex h-[112px] w-[78px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-hairline bg-surface-soft">
          {book.coverPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.coverPhotoUrl} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <Book size={24} weight="duotone" className="text-ink-faint" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-tight tracking-tight text-ink">
              {book.title}
            </h3>
          </div>
          {book.author && (
            <p className="mt-1 line-clamp-1 text-[12px] text-ink-muted">{book.author}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {cfg && (
              <Pill tone={cfg.tone} size="sm">
                {cfg.label}
              </Pill>
            )}
            {book.category && (
              <Pill tone="neutral" size="sm">
                {book.category}
              </Pill>
            )}
          </div>
          {book.condition && (
            <p className="mt-1 text-[11.5px] text-ink-faint">{book.condition}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-hairline">
        <div className="border-r border-hairline px-3 py-2.5">
          <p className="text-[10.5px] font-medium uppercase tracking-wider text-ink-faint">Giá bán</p>
          <p className="font-tabular text-[13.5px] font-semibold text-ink">
            {book.listPriceVnd != null ? `${fmt(book.listPriceVnd)}đ` : "—"}
          </p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[10.5px] font-medium uppercase tracking-wider text-ink-faint">Lợi nhuận</p>
          <p
            className={[
              "font-tabular text-[13.5px] font-semibold",
              profit >= 0 ? "text-success" : "text-danger",
            ].join(" ")}
          >
            {fmt(profit)}đ
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 border-t border-hairline bg-surface-soft px-2 py-1.5">
        <Button variant="ghost" size="sm" onClick={onEdit} iconLeft={<PencilSimple size={12} weight="bold" />}>
          Sửa
        </Button>
        {book.status !== "SOLD" ? (
          <Button
            variant="primary"
            size="sm"
            onClick={onMarkSold}
            iconLeft={<CheckCircle size={12} weight="bold" />}
          >
            Đã bán
          </Button>
        ) : (
          <span className="text-[12px] text-ink-faint">Đã hoàn tất</span>
        )}
        <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Xóa">
          <TrashSimple size={14} weight="bold" />
        </Button>
      </div>
    </article>
  );
}
