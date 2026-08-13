"use client";

import { useState } from "react";
import {
  Plus,
  CaretRight,
  PencilSimple,
  TrashSimple,
  ShoppingBag,
  Phone,
  MapPin,
  Truck,
  CurrencyDollar,
  Note,
  StackSimple,
  CalendarBlank,
} from "@phosphor-icons/react";
import OrderModal from "@/app/components/OrderModal";
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
  isbn: string | null;
  coverPhotoUrl: string | null;
  listPriceVnd: number | null;
  weightGrams: number | null;
};
type OrderRow = {
  id: string;
  date: Date | string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  channel: string | null;
  totalVnd: number | null;
  shippingFee: number | null;
  shippingUnit: string | null;
  weightGrams: number | null;
  note: string | null;
  books: BookRow[];
};

const fmt = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("vi-VN")}đ`);
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("vi-VN");

export default function OrderClient({
  initialOrders,
  initialDateRange,
}: {
  initialOrders: OrderRow[];
  initialDateRange?: { from: Date; to: Date } | null;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [modalState, setModalState] = useState<
    { mode: "create" } | { mode: "edit"; order: OrderRow } | null
  >(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function remove(o: OrderRow) {
    if (!confirm("Xóa đơn? Sách sẽ được trả về kho.")) return;
    const res = await fetch(`/api/orders/${o.id}`, { method: "DELETE" });
    if (res.ok) {
      setOrders((list) => list.filter((x) => x.id !== o.id));
      if (expandedId === o.id) setExpandedId(null);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  function handleSaved(saved: {
    id: string;
    date: Date | string;
    customerName: string | null;
    customerPhone: string | null;
    customerAddress: string | null;
    channel: string | null;
    totalVnd: number | null;
    shippingFee: number | null;
    shippingUnit: string | null;
    weightGrams: number | null;
    note: string | null;
    books?: BookRow[];
  }) {
    const withBooks: OrderRow = {
      id: saved.id,
      date: saved.date,
      customerName: saved.customerName,
      customerPhone: saved.customerPhone,
      customerAddress: saved.customerAddress,
      channel: saved.channel,
      totalVnd: saved.totalVnd,
      shippingFee: saved.shippingFee,
      shippingUnit: saved.shippingUnit,
      weightGrams: saved.weightGrams,
      note: saved.note,
      books: saved.books ?? [],
    };
    setOrders((list) => {
      const idx = list.findIndex((x) => x.id === saved.id);
      if (idx >= 0) {
        const updated = [...list];
        updated[idx] = withBooks;
        return updated;
      }
      return [withBooks, ...list];
    });
    setExpandedId(saved.id);
  }

  const editingOrder = modalState?.mode === "edit" ? modalState.order : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bán hàng"
        description="Tạo và theo dõi đơn bán cho từng khách hàng."
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
            <ExportButton path="/api/export/orders" />
          </>
        }
        primaryAction={{
          label: "Tạo đơn",
          onClick: () => setModalState({ mode: "create" }),
          icon: <Plus size={14} weight="bold" />,
        }}
      />

      {error && <Banner tone="danger">{error}</Banner>}

      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={24} weight="duotone" />}
          title="Chưa có đơn hàng"
          description="Bấm Tạo đơn để ghi nhận đơn bán mới."
          action={
            <Button variant="primary" onClick={() => setModalState({ mode: "create" })}>
              Tạo đơn đầu tiên
            </Button>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-hairline">
            {orders.map((o) => {
              const isExpanded = expandedId === o.id;
              return (
                <li key={o.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : o.id)}
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
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13.5px] font-medium text-ink">
                          {o.customerName || "Không tên"}
                        </p>
                        {o.channel && (
                          <Pill tone="info" size="sm">
                            {o.channel}
                          </Pill>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-ink-faint">
                        {fmtDate(o.date)} · {o.books.length} sách · {fmt(o.totalVnd)}
                        {o.shippingFee != null && o.shippingFee > 0 && (
                          <> · gồm ship {fmt(o.shippingFee)}{o.shippingUnit ? ` · ${o.shippingUnit}` : ""}</>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModalState({ mode: "edit", order: o })}
                          iconLeft={<PencilSimple size={12} weight="bold" />}
                        >
                          Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(o)}
                          aria-label="Xóa đơn"
                        >
                          <TrashSimple size={14} weight="bold" />
                        </Button>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-4 border-t border-hairline bg-surface-soft px-4 py-4">
                      <MetaGrid
                        items={[
                          o.customerPhone ? { label: "SĐT", icon: <Phone size={12} weight="bold" />, value: o.customerPhone } : null,
                          o.weightGrams != null ? { label: "Khối lượng", icon: <StackSimple size={12} weight="bold" />, value: `${o.weightGrams.toLocaleString("vi-VN")}g` } : null,
                          o.shippingUnit ? { label: "ĐV vận chuyển", icon: <Truck size={12} weight="bold" />, value: o.shippingUnit } : null,
                          o.shippingFee != null ? { label: "Phí ship", icon: <CurrencyDollar size={12} weight="bold" />, value: fmt(o.shippingFee) } : null,
                        ]}
                      />
                      {o.customerAddress && (
                        <p className="flex items-start gap-1.5 text-[13px] text-ink-muted">
                          <MapPin size={14} weight="bold" className="mt-0.5 shrink-0 text-ink-faint" />
                          {o.customerAddress}
                        </p>
                      )}
                      {o.note && (
                        <p className="flex items-start gap-1.5 rounded-md border border-hairline bg-surface p-3 text-[13px] text-ink-muted">
                          <Note size={14} weight="bold" className="mt-0.5 shrink-0 text-ink-faint" />
                          {o.note}
                        </p>
                      )}

                      <div>
                        <p className="mb-2 text-[12.5px] font-medium uppercase tracking-wider text-ink-faint">
                          Sách trong đơn · {o.books.length}
                        </p>
                        {o.books.length > 0 ? (
                          <ul className="space-y-1.5">
                            {o.books.map((b) => (
                              <li
                                key={b.id}
                                className="flex items-center gap-3 rounded-md border border-hairline bg-surface p-2"
                              >
                                <div className="flex h-12 w-8 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-hairline bg-surface-soft">
                                  {b.coverPhotoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={b.coverPhotoUrl} alt={b.title} className="h-full w-full object-cover" />
                                  ) : (
                                    <ShoppingBag size={14} weight="duotone" className="text-ink-faint" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-medium text-ink">{b.title}</p>
                                  {b.isbn && (
                                    <p className="truncate font-mono text-[10.5px] text-ink-faint">{b.isbn}</p>
                                  )}
                                </div>
                                <span className="font-tabular text-[13px] font-medium text-ink">{fmt(b.listPriceVnd)}</span>
                              </li>
                            ))}
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

      <OrderModal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        onSaved={handleSaved}
        initialOrder={editingOrder}
      />
    </div>
  );
}

type MetaItem = { label: string; icon?: React.ReactNode; value: React.ReactNode };

function MetaGrid({
  items,
}: {
  items: (MetaItem | false | null | undefined | "")[];
}) {
  const visible = items.filter((it): it is MetaItem => Boolean(it));
  if (visible.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {visible.map((it, i) => (
        <div key={i} className="rounded-md border border-hairline bg-surface p-2.5">
          <div className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-wider text-ink-faint">
            {it.icon}
            {it.label}
          </div>
          <p className="mt-1 text-[13px] text-ink">{it.value}</p>
        </div>
      ))}
    </div>
  );
}
