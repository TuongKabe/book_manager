"use client";

import { useState } from "react";
import {
  Plus,
  CaretRight,
  PencilSimple,
  TrashSimple,
  Archive,
  StackSimple,
  Books,
  CalendarBlank,
} from "@phosphor-icons/react";
import PurchaseModal, { type InitialPurchase } from "@/app/components/PurchaseModal";
import DateFilter from "@/app/components/DateFilter";
import ExportButton from "@/app/components/ExportButton";
import PageHeader from "@/app/components/ui/PageHeader";
import EmptyState from "@/app/components/ui/EmptyState";
import Pill from "@/app/components/ui/Pill";
import Banner from "@/app/components/ui/Banner";
import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";

type BookRow = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  coverPhotoUrl: string | null;
  condition: string | null;
  status: string;
};
type PurchaseRow = {
  id: string;
  date: Date | string;
  supplier: string;
  totalCost: number;
  weightGrams: number | null;
  note: string | null;
  _count: { books: number };
  books: BookRow[];
};

const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("vi-VN");

const STATUS_LABEL: Record<string, { label: string; tone: "intake" | "listed" | "sold" }> = {
  INTAKE: { label: "Nhập kho", tone: "intake" },
  LISTED: { label: "Đang bán", tone: "listed" },
  SOLD: { label: "Đã bán", tone: "sold" },
};

export default function PurchaseListClient({
  initialPurchases,
  initialDateRange,
}: {
  initialPurchases: PurchaseRow[];
  initialDateRange?: { from: Date; to: Date } | null;
}) {
  const [purchases, setPurchases] = useState(initialPurchases);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<
    { mode: "create" } | { mode: "edit"; purchase: PurchaseRow } | null
  >(null);
  const [error, setError] = useState("");

  async function remove(p: PurchaseRow) {
    if (!confirm(`Xóa lô "${p.supplier}"?`)) return;
    const res = await fetch(`/api/purchases/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      setPurchases((list) => list.filter((x) => x.id !== p.id));
      if (expandedId === p.id) setExpandedId(null);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  async function handleSaved(saved: {
    id: string;
    supplier: string;
    date: Date | string;
    totalCost: number;
    weightGrams: number | null;
    note: string | null;
    _count: { books: number };
    books?: BookRow[];
  }) {
    const withBooks: PurchaseRow = {
      id: saved.id,
      date: saved.date,
      supplier: saved.supplier,
      totalCost: saved.totalCost,
      weightGrams: saved.weightGrams,
      note: saved.note,
      _count: saved._count,
      books: saved.books ?? [],
    };
    setPurchases((list) => {
      const idx = list.findIndex((x) => x.id === saved.id);
      if (idx >= 0) {
        const updated = [...list];
        updated[idx] = { ...updated[idx], ...withBooks };
        return updated;
      }
      return [withBooks, ...list];
    });
    setExpandedId(saved.id);
  }

  const editingPurchase: InitialPurchase | undefined =
    modalState?.mode === "edit"
      ? {
          id: modalState.purchase.id,
          date: modalState.purchase.date,
          supplier: modalState.purchase.supplier,
          totalCost: modalState.purchase.totalCost,
          weightGrams: modalState.purchase.weightGrams,
          note: modalState.purchase.note,
          books: modalState.purchase.books,
        }
      : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nhập hàng"
        description="Ghi nhận các lô sách nhập từ nhà cung cấp."
        period={
          initialDateRange ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 font-medium text-brand">
              <CalendarBlank size={12} weight="bold" />
              {initialDateRange.from.toLocaleDateString("vi-VN")} → {initialDateRange.to.toLocaleDateString("vi-VN")}
            </span>
          ) : null
        }
        toolbar={
          <>
            <DateFilter />
            <ExportButton path="/api/export/purchases" />
          </>
        }
        primaryAction={{
          label: "Thêm lô",
          onClick: () => setModalState({ mode: "create" }),
          icon: <Plus size={14} weight="bold" />,
        }}
      />

      {error && <Banner tone="danger">{error}</Banner>}

      {purchases.length === 0 ? (
        <EmptyState
          icon={<Archive size={24} weight="duotone" />}
          title="Chưa có lô nhập"
          description="Bấm Thêm lô để ghi nhận lô nhập hàng đầu tiên."
          action={
            <Button variant="primary" onClick={() => setModalState({ mode: "create" })}>
              Tạo lô nhập
            </Button>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-hairline">
            {purchases.map((p) => {
              const isExpanded = expandedId === p.id;
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-soft"
                    aria-expanded={isExpanded}
                  >
                    <CaretRight
                      size={14}
                      weight="bold"
                      className={[
                        "shrink-0 text-ink-faint transition-transform duration-150",
                        isExpanded ? "rotate-90 text-ink" : "",
                      ].join(" ")}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">{p.supplier}</p>
                      <p className="mt-0.5 truncate text-[12px] text-ink-faint">
                        {fmtDate(p.date)} · {p._count.books} cuốn · {fmt(p.totalCost)}
                        {p.weightGrams != null && ` · ${p.weightGrams.toLocaleString("vi-VN")}g`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setModalState({ mode: "edit", purchase: p })}
                        iconLeft={<PencilSimple size={12} weight="bold" />}
                      >
                        Sửa
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(p)} aria-label="Xóa lô">
                        <TrashSimple size={14} weight="bold" />
                      </Button>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-4 border-t border-hairline bg-surface-soft px-4 py-4">
                      {p.note && (
                        <p className="rounded-md border border-hairline bg-surface p-3 text-[13px] text-ink-muted">
                          {p.note}
                        </p>
                      )}
                      <div>
                        <p className="mb-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium uppercase tracking-wider text-ink-faint">
                          <Books size={12} weight="bold" />
                          Sách trong lô · {p._count.books}
                        </p>
                        {p.books.length > 0 ? (
                          <ul className="space-y-1.5">
                            {p.books.map((b) => {
                              const cfg = STATUS_LABEL[b.status];
                              return (
                                <li
                                  key={b.id}
                                  className="flex items-center gap-3 rounded-md border border-hairline bg-surface p-2"
                                >
                                  <div className="flex h-12 w-8 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-hairline bg-surface-soft">
                                    {b.coverPhotoUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={b.coverPhotoUrl} alt={b.title} className="h-full w-full object-cover" />
                                    ) : (
                                      <StackSimple size={14} weight="duotone" className="text-ink-faint" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-medium text-ink">{b.title}</p>
                                    {b.author && (
                                      <p className="truncate text-[11.5px] text-ink-faint">{b.author}</p>
                                    )}
                                  </div>
                                  {cfg && (
                                    <Pill tone={cfg.tone} size="sm">
                                      {cfg.label}
                                    </Pill>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="rounded-md border border-dashed border-hairline-strong bg-surface px-3 py-4 text-center text-[12.5px] text-ink-faint">
                            Chưa có sách — bấm <strong className="text-ink">Sửa</strong> để thêm.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <PurchaseModal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        onSaved={handleSaved}
        initialPurchase={editingPurchase}
      />
    </div>
  );
}
