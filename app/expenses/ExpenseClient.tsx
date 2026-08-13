"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  CaretDown,
  Funnel,
  ArrowClockwise,
  Check,
  CurrencyDollar,
  Receipt,
  MagnifyingGlass,
  PencilSimple,
  TrashSimple,
  StackSimple,
  CalendarBlank,
} from "@phosphor-icons/react";
import ExpenseModal from "@/app/components/ExpenseModal";
import DateFilter from "@/app/components/DateFilter";
import ExportButton from "@/app/components/ExportButton";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import PageHeader from "@/app/components/ui/PageHeader";
import StatTile from "@/app/components/ui/StatTile";
import EmptyState from "@/app/components/ui/EmptyState";
import Pill from "@/app/components/ui/Pill";
import Banner from "@/app/components/ui/Banner";
import Button from "@/app/components/ui/Button";
import Card, { CardHeader, CardBody } from "@/app/components/ui/Card";
import { Input, Select } from "@/app/components/ui/Field";

type ExpenseRow = {
  id: string;
  date: Date | string;
  category: string;
  amountVnd: number;
  note: string | null;
};

const SORTS = [
  { value: "dateDesc", label: "Ngày mới nhất" },
  { value: "dateAsc", label: "Ngày cũ nhất" },
  { value: "amountDesc", label: "Tiền cao → thấp" },
  { value: "amountAsc", label: "Tiền thấp → cao" },
  { value: "category", label: "Theo loại" },
] as const;

type SortValue = (typeof SORTS)[number]["value"];

const fmt = (n: number) => n.toLocaleString("vi-VN");
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("vi-VN");

export default function ExpenseClient({
  initialExpenses,
  initialDateRange,
}: {
  initialExpenses: ExpenseRow[];
  initialDateRange?: { from: Date; to: Date } | null;
}) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [modalState, setModalState] = useState<
    { mode: "create" } | { mode: "edit"; expense: ExpenseRow } | null
  >(null);
  const [error, setError] = useState("");

  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(EXPENSE_CATEGORIES));
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortValue>("dateDesc");
  const [showFilters, setShowFilters] = useState(false);

  const minNum = minAmount ? Number(minAmount) : null;
  const maxNum = maxAmount ? Number(maxAmount) : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = expenses.filter((x) => {
      if (!selectedCats.has(x.category)) return false;
      if (minNum != null && x.amountVnd < minNum) return false;
      if (maxNum != null && x.amountVnd > maxNum) return false;
      if (q && !(x.note ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
    result.sort((a, b) => {
      switch (sort) {
        case "dateDesc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "dateAsc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amountDesc":
          return b.amountVnd - a.amountVnd;
        case "amountAsc":
          return a.amountVnd - b.amountVnd;
        case "category":
          return a.category.localeCompare(b.category) || new Date(b.date).getTime() - new Date(a.date).getTime();
        default:
          return 0;
      }
    });
    return result;
  }, [expenses, selectedCats, minNum, maxNum, search, sort]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, x) => s + x.amountVnd, 0);
    const count = filtered.length;
    const byCategory = new Map<string, number>();
    for (const x of filtered) byCategory.set(x.category, (byCategory.get(x.category) ?? 0) + x.amountVnd);
    const totalAll = expenses.reduce((s, x) => s + x.amountVnd, 0);
    return { total, count, byCategory, totalAll };
  }, [filtered, expenses]);

  const hiddenItems = useMemo(() => {
    const idSet = new Set(filtered.map((x) => x.id));
    return expenses.filter((x) => !idSet.has(x.id));
  }, [expenses, filtered]);

  const filterBreakdown = useMemo(() => {
    if (!expenses.length) return [];
    const items: { label: string; count: number }[] = [];
    if (selectedCats.size !== EXPENSE_CATEGORIES.length) {
      const count = expenses.filter((x) => !selectedCats.has(x.category)).length;
      if (count > 0) items.push({ label: `Loại (${selectedCats.size}/${EXPENSE_CATEGORIES.length})`, count });
    }
    if (minNum != null) {
      const count = expenses.filter((x) => x.amountVnd < minNum).length;
      if (count > 0) items.push({ label: `Dưới ${fmt(minNum)}đ`, count });
    }
    if (maxNum != null) {
      const count = expenses.filter((x) => x.amountVnd > maxNum).length;
      if (count > 0) items.push({ label: `Trên ${fmt(maxNum)}đ`, count });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const count = expenses.filter((x) => !(x.note ?? "").toLowerCase().includes(q)).length;
      if (count > 0) items.push({ label: `Không khớp "${search}"`, count });
    }
    return items;
  }, [expenses, selectedCats, minNum, maxNum, search]);

  function toggleCat(c: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  function selectAll() {
    setSelectedCats(new Set(EXPENSE_CATEGORIES));
  }
  function clearAll() {
    setSelectedCats(new Set());
  }

  function resetFilters() {
    setSelectedCats(new Set(EXPENSE_CATEGORIES));
    setMinAmount("");
    setMaxAmount("");
    setSearch("");
    setSort("dateDesc");
  }

  async function remove(x: ExpenseRow) {
    if (!confirm("Xóa chi phí?")) return;
    const res = await fetch(`/api/expenses/${x.id}`, { method: "DELETE" });
    if (res.ok) {
      setExpenses((list) => list.filter((e) => e.id !== x.id));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Có lỗi xảy ra");
    }
  }

  function handleSaved(saved: {
    id: string;
    date: Date | string;
    category: string;
    amountVnd: number;
    note: string | null;
  }) {
    setExpenses((list) => {
      const idx = list.findIndex((x) => x.id === saved.id);
      if (idx >= 0) {
        const updated = [...list];
        updated[idx] = saved as ExpenseRow;
        return updated;
      }
      return [saved as ExpenseRow, ...list];
    });
  }

  const editingExpense = modalState?.mode === "edit" ? modalState.expense : undefined;
  const hasActiveFilter =
    selectedCats.size !== EXPENSE_CATEGORIES.length || minAmount || maxAmount || search;
  const totalCount = expenses.length;
  const activeFilterCount =
    (selectedCats.size !== EXPENSE_CATEGORIES.length ? 1 : 0) +
    (minAmount ? 1 : 0) +
    (maxAmount ? 1 : 0) +
    (search ? 1 : 0);
  const [showHidden, setShowHidden] = useState(false);
  const maxCategoryValue = stats.byCategory.size > 0 ? Math.max(...stats.byCategory.values()) : 1;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chi phí"
        description="Ghi nhận và phân tích chi phí ngoài sách: vận chuyển, điện, thuế…"
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
            <ExportButton path="/api/export/expenses" />
          </>
        }
        primaryAction={{
          label: "Thêm chi phí",
          onClick: () => setModalState({ mode: "create" }),
          icon: <Plus size={14} weight="bold" />,
        }}
      />

      {error && <Banner tone="danger">{error}</Banner>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Tổng (đang lọc)"
          value={`${fmt(stats.total)}đ`}
          sub={`${stats.count} mục`}
          tone="danger"
          icon={<Receipt size={16} weight="bold" />}
        />
        <StatTile
          label="Số mục"
          value={String(stats.count)}
          sub={hasActiveFilter ? `từ ${totalCount} mục` : "tất cả"}
          icon={<StackSimple size={16} weight="bold" />}
        />
        <StatTile
          label="Trung bình / mục"
          value={stats.count > 0 ? `${fmt(Math.floor(stats.total / stats.count))}đ` : "—"}
          sub="Đang lọc"
          tone="warning"
          icon={<CurrencyDollar size={16} weight="bold" />}
        />
        <StatTile
          label="Tổng tất cả"
          value={`${fmt(stats.totalAll)}đ`}
          sub="Không lọc"
          icon={<CurrencyDollar size={16} weight="bold" />}
        />
      </div>

      {/* Filter panel */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFilters((s) => !s)}
              iconLeft={<Funnel size={14} weight="bold" />}
              iconRight={<CaretDown size={12} weight="bold" className={showFilters ? "rotate-180" : ""} />}
            >
              Bộ lọc
            </Button>
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlass
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm trong ghi chú…"
                className="pl-8"
              />
            </div>
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortValue)} className="w-auto">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
            {activeFilterCount > 0 && (
              <Pill tone="brand">
                <Funnel size={10} weight="bold" /> Đang áp dụng {activeFilterCount} bộ lọc
              </Pill>
            )}
          </div>

          {showFilters && (
            <div className="mt-4 space-y-4 border-t border-hairline pt-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[12.5px] font-medium text-ink-muted">
                    Danh mục <span className="text-ink-faint">({selectedCats.size}/{EXPENSE_CATEGORIES.length})</span>
                  </p>
                  <div className="flex items-center gap-2 text-[12px]">
                    <button onClick={selectAll} className="text-brand hover:underline">
                      Tất cả
                    </button>
                    <span className="text-ink-faint">·</span>
                    <button onClick={clearAll} className="text-brand hover:underline">
                      Bỏ chọn
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {EXPENSE_CATEGORIES.map((c) => {
                    const active = selectedCats.has(c);
                    return (
                      <button
                        key={c}
                        onClick={() => toggleCat(c)}
                        className={[
                          "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12px] transition-colors",
                          active
                            ? "border-brand bg-brand-soft text-brand"
                            : "border-hairline-strong bg-surface text-ink-faint hover:text-ink-muted",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-3.5 w-3.5 items-center justify-center rounded-full border",
                            active ? "border-brand bg-brand text-on-brand" : "border-hairline-strong bg-surface",
                          ].join(" ")}
                          aria-hidden
                        >
                          {active && <Check size={9} weight="bold" />}
                        </span>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-ink-muted">Từ (đ)</label>
                  <Input
                    type="number"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-ink-muted">Đến (đ)</label>
                  <Input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="∞"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  iconLeft={<ArrowClockwise size={12} weight="bold" />}
                >
                  Đặt lại bộ lọc
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Filter status line */}
      {hasActiveFilter && (
        <Card>
          <CardBody>
            <p className="text-[13px] text-ink-muted">
              Hiển thị <strong className="font-tabular text-ink">{stats.count}</strong> / {totalCount} mục
              {stats.count < totalCount && (
                <span className="ml-1 text-ink-faint">(đang ẩn {hiddenItems.length})</span>
              )}
            </p>
            {filterBreakdown.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px]">
                <span className="text-ink-faint">Lý do ẩn:</span>
                {filterBreakdown.map((b, i) => (
                  <Pill key={i} tone="warning" size="sm">
                    {b.label}: {b.count}
                  </Pill>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Category breakdown */}
      {stats.byCategory.size > 0 && (
        <Card>
          <CardHeader title="Phân bổ theo loại" description="Đang lọc" />
          <CardBody>
            <div className="space-y-2.5">
              {Array.from(stats.byCategory.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([cat, total]) => (
                  <div key={cat} className="grid grid-cols-[140px_1fr_96px] items-center gap-3">
                    <span className="truncate text-[13px] text-ink-muted">{cat}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
                      <div
                        className="h-full rounded-full bg-danger/80"
                        style={{ width: `${(total / maxCategoryValue) * 100}%` }}
                      />
                    </div>
                    <span className="font-tabular text-right text-[13px] font-medium text-ink">
                      {fmt(total)}đ
                    </span>
                  </div>
                ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt size={24} weight="duotone" />}
          title={totalCount === 0 ? "Chưa có chi phí" : "Không có kết quả khớp bộ lọc"}
          description={
            totalCount === 0
              ? "Bấm Thêm chi phí để ghi nhận khoản chi đầu tiên."
              : `Có ${totalCount} mục trong DB nhưng bị ẩn bởi ${activeFilterCount} bộ lọc.`
          }
          action={
            hasActiveFilter ? (
              <Button variant="primary" onClick={resetFilters} iconLeft={<ArrowClockwise size={14} weight="bold" />}>
                Xóa tất cả bộ lọc
              </Button>
            ) : null
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-soft text-left text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                <tr>
                  <th className="px-4 py-2">Ngày</th>
                  <th className="px-4 py-2">Loại</th>
                  <th className="px-4 py-2">Ghi chú</th>
                  <th className="px-4 py-2 text-right">Số tiền</th>
                  <th className="w-[100px] px-4 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x) => (
                  <tr key={x.id} className="border-t border-hairline hover:bg-surface-soft">
                    <td className="px-4 py-2.5 text-[13px] text-ink-muted">{fmtDate(x.date)}</td>
                    <td className="px-4 py-2.5">
                      <Pill tone="neutral" size="sm">
                        {x.category}
                      </Pill>
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-2.5 text-[13px] text-ink-faint">
                      {x.note ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-tabular text-[13px] font-semibold text-ink">
                      {fmt(x.amountVnd)}đ
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModalState({ mode: "edit", expense: x })}
                          aria-label="Sửa"
                        >
                          <PencilSimple size={13} weight="bold" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(x)}
                          aria-label="Xóa"
                        >
                          <TrashSimple size={13} weight="bold" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Hidden items peek */}
      {hasActiveFilter && hiddenItems.length > 0 && (
        <Card>
          <button
            onClick={() => setShowHidden((s) => !s)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] text-ink-muted transition-colors hover:bg-surface-soft"
            aria-expanded={showHidden}
          >
            <span className="inline-flex items-center gap-1.5">
              <CaretDown
                size={12}
                weight="bold"
                className={["transition-transform duration-150", showHidden ? "rotate-180" : ""].join(" ")}
              />
              <span>
                <strong className="text-warning">{hiddenItems.length}</strong> mục đang bị ẩn
              </span>
            </span>
            <span className="text-[12px] text-ink-faint">Bấm để mở rộng</span>
          </button>
          {showHidden && (
            <div className="overflow-x-auto border-t border-hairline">
              <table className="w-full">
                <thead className="bg-surface-soft text-left text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                  <tr>
                    <th className="px-4 py-2">Ngày</th>
                    <th className="px-4 py-2">Loại</th>
                    <th className="px-4 py-2 text-right">Số tiền</th>
                    <th className="px-4 py-2">Lý do bị ẩn</th>
                    <th className="w-[100px] px-4 py-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {hiddenItems.map((x) => {
                    const reasons: string[] = [];
                    if (!selectedCats.has(x.category)) reasons.push("Loại");
                    if (minNum != null && x.amountVnd < minNum)
                      reasons.push(`Dưới ${fmt(minNum)}đ`);
                    if (maxNum != null && x.amountVnd > maxNum)
                      reasons.push(`Trên ${fmt(maxNum)}đ`);
                    if (
                      search.trim() &&
                      !(x.note ?? "").toLowerCase().includes(search.trim().toLowerCase())
                    )
                      reasons.push(`Không khớp "${search}"`);
                    return (
                      <tr key={x.id} className="border-t border-hairline hover:bg-surface-soft">
                        <td className="px-4 py-2.5 text-[13px] text-ink-muted">{fmtDate(x.date)}</td>
                        <td className="px-4 py-2.5">
                          <Pill tone="neutral" size="sm">
                            {x.category}
                          </Pill>
                        </td>
                        <td className="px-4 py-2.5 text-right font-tabular text-[13px] text-ink">
                          {fmt(x.amountVnd)}đ
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-warning">{reasons.join(", ") || "—"}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setModalState({ mode: "edit", expense: x })}
                              aria-label="Sửa"
                            >
                              <PencilSimple size={13} weight="bold" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(x)}
                              aria-label="Xóa"
                            >
                              <TrashSimple size={13} weight="bold" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <ExpenseModal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        onSaved={handleSaved}
        initialExpense={editingExpense}
      />
    </div>
  );
}
