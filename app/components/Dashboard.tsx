"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  CurrencyDollar,
  Receipt,
  TrendUp,
  ShoppingBag,
  Wallet,
  Books,
  Cube,
  ArrowUpRight,
  CaretDown,
  CaretRight,
  CalendarBlank,
} from "@phosphor-icons/react";
import PageHeader from "@/app/components/ui/PageHeader";
import StatTile from "@/app/components/ui/StatTile";
import EmptyState from "@/app/components/ui/EmptyState";
import Card, { CardHeader, CardBody } from "@/app/components/ui/Card";
import Pill from "@/app/components/ui/Pill";
import Banner from "@/app/components/ui/Banner";
import Button from "@/app/components/ui/Button";
import { StatSkeletonGrid, PanelSkeleton } from "@/app/components/ui/Skeleton";

type Period =
  | "today"
  | "thisMonth"
  | "lastMonth"
  | "thisQuarter"
  | "lastQuarter"
  | "thisYear"
  | "lastYear"
  | "custom";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "thisMonth", label: "Tháng này" },
  { value: "lastMonth", label: "Tháng trước" },
  { value: "thisQuarter", label: "Quý này" },
  { value: "lastQuarter", label: "Quý trước" },
  { value: "thisYear", label: "Năm nay" },
  { value: "lastYear", label: "Năm trước" },
  { value: "custom", label: "Tùy chỉnh…" },
];

type Stats = {
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  orderCount: number;
  bookSoldCount: number;
  avgOrderValue: number;
  expenseTotal: number;
  bookCost: number;
  inStockCount: number;
};

type Monthly = {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  orderCount: number;
  bookSold: number;
};

type TopBook = { id: string; title: string; count: number; revenue: number };
type TopExpense = { category: string; total: number };
type RecentOrder = {
  id: string;
  date: string | Date;
  customer: string | null;
  channel: string | null;
  total: number | null;
};
type RecentExpense = {
  id: string;
  date: string | Date;
  category: string;
  amount: number;
  note: string | null;
};

type DashboardData = {
  from: string;
  to: string;
  stats: Stats;
  monthly: Monthly[];
  topBooks: TopBook[];
  topExpenses: TopExpense[];
  recentOrders: RecentOrder[];
  recentExpenses: RecentExpense[];
};

function getPeriodDates(
  period: Period,
  customFrom?: string,
  customTo?: string,
): { from: Date; to: Date; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (period === "custom" && customFrom && customTo) {
    const from = new Date(customFrom);
    const to = new Date(customTo);
    to.setHours(23, 59, 59, 999);
    return { from, to, label: `${customFrom} → ${customTo}` };
  }

  let from: Date, to: Date, label: string;
  switch (period) {
    case "today": {
      from = new Date(y, m, now.getDate());
      to = new Date(y, m, now.getDate(), 23, 59, 59);
      label = `Hôm nay ${now.getDate()}/${m + 1}/${y}`;
      break;
    }
    case "thisMonth":
      from = new Date(y, m, 1);
      to = new Date(y, m + 1, 0, 23, 59, 59);
      label = `Tháng ${m + 1}/${y}`;
      break;
    case "lastMonth":
      from = new Date(y, m - 1, 1);
      to = new Date(y, m, 0, 23, 59, 59);
      label = `Tháng ${m}/${y}`;
      break;
    case "thisQuarter": {
      const q = Math.floor(m / 3);
      from = new Date(y, q * 3, 1);
      to = new Date(y, q * 3 + 3, 0, 23, 59, 59);
      label = `Quý ${q + 1}/${y}`;
      break;
    }
    case "lastQuarter": {
      const q = Math.floor(m / 3);
      const lq = q === 0 ? 3 : q - 1;
      const ly = q === 0 ? y - 1 : y;
      from = new Date(ly, lq * 3, 1);
      to = new Date(ly, lq * 3 + 3, 0, 23, 59, 59);
      label = `Quý ${lq + 1}/${ly}`;
      break;
    }
    case "thisYear":
      from = new Date(y, 0, 1);
      to = new Date(y, 11, 31, 23, 59, 59);
      label = `Năm ${y}`;
      break;
    case "lastYear":
      from = new Date(y - 1, 0, 1);
      to = new Date(y - 1, 11, 31, 23, 59, 59);
      label = `Năm ${y - 1}`;
      break;
    default:
      from = new Date(y, m, 1);
      to = new Date(y, m + 1, 0, 23, 59, 59);
      label = "";
  }
  return { from, to, label };
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const fmt = (n: number) => n.toLocaleString("vi-VN");
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString("vi-VN");
const monthLabel = (m: string) => {
  const [y, mm] = m.split("-");
  return `T${parseInt(mm, 10)}/${y.slice(2)}`;
};

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { from, to, label } = useMemo(
    () => getPeriodDates(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  useEffect(() => {
    if (period === "custom" && (!customFrom || !customTo)) return;
    queueMicrotask(() => {
      setLoading(true);
      setError("");
    });
    fetch(`/api/dashboard?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Không thể tải dữ liệu từ máy chủ"))
      .finally(() => setLoading(false));
  }, [from, to, period, customFrom, customTo]);

  const maxRevenue = data ? Math.max(...data.monthly.map((m) => m.revenue), 1) : 1;
  const maxExpense = data ? Math.max(...data.topExpenses.map((e) => e.total), 1) : 1;
  const maxTopBook = data ? Math.max(...data.topBooks.map((b) => b.revenue), 1) : 1;

  const ordersHref = `/orders?from=${isoDate(from)}&to=${isoDate(to)}`;
  const expensesHref = `/expenses?from=${isoDate(from)}&to=${isoDate(to)}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tổng quan"
        description="Theo dõi doanh thu, chi phí và tồn kho."
        period={label ? <PeriodPill icon={<CalendarBlank size={12} weight="bold" />}>{label}</PeriodPill> : null}
        toolbar={
          <PeriodToolbar
            period={period}
            setPeriod={setPeriod}
            customFrom={customFrom}
            customTo={customTo}
            setCustomFrom={setCustomFrom}
            setCustomTo={setCustomTo}
          />
        }
      />

      {error && <Banner tone="danger">{error}</Banner>}

      {loading && !data ? (
        <div className="space-y-5">
          <StatSkeletonGrid count={8} />
          <PanelSkeleton />
          <div className="grid gap-5 lg:grid-cols-2">
            <PanelSkeleton />
            <PanelSkeleton />
          </div>
        </div>
      ) : data ? (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Doanh thu"
              value={`${fmt(data.stats.revenue)}đ`}
              sub="Trong kỳ đã chọn"
              tone="success"
              icon={<CurrencyDollar size={16} weight="bold" />}
            />
            <StatTile
              label="Chi phí"
              value={`${fmt(data.stats.cost)}đ`}
              sub={`${fmt(data.stats.expenseTotal)}đ CP khác`}
              tone="danger"
              icon={<Receipt size={16} weight="bold" />}
            />
            <StatTile
              label="Lợi nhuận"
              value={`${fmt(data.stats.profit)}đ`}
              sub={`Biên ${data.stats.profitMargin}%`}
              tone={data.stats.profit >= 0 ? "brand" : "danger"}
              icon={
                <TrendUp
                  size={16}
                  weight="bold"
                  className={data.stats.profit >= 0 ? "" : "rotate-180"}
                />
              }
              delta={
                data.stats.profitMargin >= 0
                  ? { value: `${data.stats.profitMargin}%`, positive: true }
                  : { value: `${data.stats.profitMargin}%`, positive: false }
              }
            />
            <StatTile
              label="Số đơn"
              value={String(data.stats.orderCount)}
              sub={`${data.stats.bookSoldCount} sách đã bán`}
              tone="info"
              icon={<ShoppingBag size={16} weight="bold" />}
            />
            <StatTile
              label="TB / đơn"
              value={`${fmt(data.stats.avgOrderValue)}đ`}
              sub="Giá trị trung bình"
              icon={<Wallet size={16} weight="bold" />}
            />
            <StatTile
              label="Giá vốn sách"
              value={`${fmt(data.stats.bookCost)}đ`}
              sub="COGS trong kỳ"
              tone="warning"
              icon={<Books size={16} weight="bold" />}
            />
            <StatTile
              label="Tồn kho"
              value={String(data.stats.inStockCount)}
              sub="Cuốn hiện có"
              tone="info"
              icon={<Cube size={16} weight="bold" />}
            />
            <StatTile
              label="Tổng sách bán"
              value={String(data.stats.bookSoldCount)}
              sub="Trong kỳ"
              icon={<ShoppingBag size={16} weight="bold" />}
            />
          </div>

          {/* Monthly chart */}
          <Card>
            <CardHeader
              title="Doanh thu & chi phí theo tháng"
              description="Tổng quan 12 tháng gần nhất để so sánh xu hướng."
              actions={
                <Pill tone="brand">
                  <CurrencyDollar size={12} weight="bold" />
                  Tổng DT: {fmt(data.monthly.reduce((s, m) => s + m.revenue, 0))}đ
                </Pill>
              }
            />
            <CardBody>
              {data.monthly.length === 0 ? (
                <EmptyState
                  icon={<CalendarBlank size={20} weight="duotone" />}
                  title="Chưa có dữ liệu trong kỳ"
                  description="Chọn khoảng thời gian khác hoặc thêm đơn hàng để bắt đầu."
                />
              ) : (
                <div className="space-y-2.5">
                  {data.monthly.map((m) => {
                    const revenuePct = (m.revenue / maxRevenue) * 100;
                    const costPct = (m.cost / maxRevenue) * 100;
                    return (
                      <div key={m.month} className="grid grid-cols-[60px_1fr_120px] items-center gap-3">
                        <span className="font-mono text-[12px] text-ink-muted">{monthLabel(m.month)}</span>
                        <div className="space-y-1">
                          <div
                            className="flex h-5 items-center justify-end rounded bg-success/10 overflow-hidden"
                            title={`Doanh thu ${fmt(m.revenue)}đ`}
                          >
                            <div
                              className="flex h-5 items-center rounded bg-success px-1.5 text-[11px] font-medium text-on-brand"
                              style={{ width: `${Math.max(revenuePct, 2)}%`, minWidth: m.revenue > 0 ? "2.5rem" : 0 }}
                            >
                              {m.revenue > 0 ? fmt(m.revenue) : ""}
                            </div>
                          </div>
                          <div
                            className="flex h-2 items-center rounded bg-danger-soft overflow-hidden"
                            title={`Chi phí ${fmt(m.cost)}đ`}
                          >
                            <div
                              className="h-2 rounded bg-danger/70"
                              style={{ width: `${Math.max(costPct, m.cost > 0 ? 1.5 : 0)}%`, minWidth: m.cost > 0 ? "1.5rem" : 0 }}
                            />
                          </div>
                        </div>
                        <div className="font-tabular text-right">
                          <p className={["text-[13px] font-semibold", m.profit >= 0 ? "text-success" : "text-danger"].join(" ")}>
                            {m.profit >= 0 ? "+" : ""}{fmt(m.profit)}đ
                          </p>
                          <p className="text-[11px] text-ink-faint">
                            {m.orderCount} đơn · {m.bookSold} sách
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-hairline pt-3 text-[12px] text-ink-faint">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-3 rounded-sm bg-success" /> Doanh thu
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-3 rounded-sm bg-danger/70" /> Chi phí
                </span>
                <span className="ml-auto font-mono text-[11.5px] text-ink-faint">
                  {data.monthly.length} tháng
                </span>
              </div>
            </CardBody>
          </Card>

          {/* Top books + Top expenses */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Top sách bán chạy"
                description={`Theo doanh thu trong kỳ`}
                actions={
                  <Pill tone="success">
                    <Books size={12} weight="bold" />
                    {data.topBooks.length} sách
                  </Pill>
                }
              />
              <CardBody>
                {data.topBooks.length === 0 ? (
                  <EmptyState
                    icon={<Books size={20} weight="duotone" />}
                    title="Chưa có đơn hàng trong kỳ"
                    description="Top sách sẽ hiển thị khi có đơn bán."
                  />
                ) : (
                  <ol className="space-y-2.5">
                    {data.topBooks.map((b, i) => (
                      <li key={b.id} className="grid grid-cols-[24px_1fr_72px] items-center gap-3">
                        <span
                          className={[
                            "flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] font-semibold",
                            i === 0
                              ? "bg-warning-soft text-warning"
                              : i === 1
                              ? "bg-info-soft text-info"
                              : i === 2
                              ? "bg-brand-soft text-brand"
                              : "bg-surface-soft text-ink-faint",
                          ].join(" ")}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] text-ink" title={b.title}>
                            {b.title}
                          </p>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-soft">
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{ width: `${(b.revenue / maxTopBook) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right font-tabular">
                          <p className="text-[13px] font-semibold text-ink">{fmt(b.revenue)}đ</p>
                          <p className="text-[11px] text-ink-faint">{b.count} cuốn</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Chi phí theo loại"
                description={`Tổng ${fmt(data.stats.expenseTotal)}đ trong kỳ`}
                actions={
                  <Link href={expensesHref}>
                    <Button variant="ghost" size="sm" iconRight={<ArrowUpRight size={12} weight="bold" />}>
                      Xem tất cả
                    </Button>
                  </Link>
                }
              />
              <CardBody>
                {data.topExpenses.length === 0 ? (
                  <EmptyState
                    icon={<Receipt size={20} weight="duotone" />}
                    title="Chưa có chi phí trong kỳ"
                  />
                ) : (
                  <div className="space-y-2.5">
                    {data.topExpenses.map((e) => (
                      <div key={e.category} className="grid grid-cols-[110px_1fr_92px] items-center gap-3">
                        <span className="truncate text-[13px] text-ink-muted">{e.category}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
                          <div
                            className="h-full rounded-full bg-danger/80"
                            style={{ width: `${(e.total / maxExpense) * 100}%` }}
                          />
                        </div>
                        <span className="font-tabular text-right text-[13px] font-medium text-ink">
                          {fmt(e.total)}đ
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Recent orders */}
          <Card>
            <CardHeader
              title="Đơn hàng gần đây"
              description={`${data.stats.orderCount} đơn trong kỳ`}
              actions={
                <Link href={ordersHref}>
                  <Button variant="ghost" size="sm" iconRight={<ArrowUpRight size={12} weight="bold" />}>
                    Xem tất cả
                  </Button>
                </Link>
              }
            />
            <CardBody scrollable maxHeight="20rem">
              {data.recentOrders.length === 0 ? (
                <EmptyState icon={<ShoppingBag size={20} weight="duotone" />} title="Chưa có đơn hàng" />
              ) : (
                <RecentTable headers={["Ngày", "Khách", "Kênh", "Tổng"]}>
                  {data.recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-hairline last:border-0 hover:bg-surface-soft">
                      <td className="px-3 py-2.5 text-[13px] text-ink-muted">{fmtDate(o.date)}</td>
                      <td className="px-3 py-2.5 text-[13px] text-ink">
                        {o.customer ?? <span className="text-ink-faint">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {o.channel ? (
                          <Pill tone="info" size="sm">
                            {o.channel}
                          </Pill>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-tabular text-[13px] font-semibold text-ink">
                        {o.total != null ? `${fmt(o.total)}đ` : "—"}
                      </td>
                    </tr>
                  ))}
                </RecentTable>
              )}
            </CardBody>
          </Card>

          {/* Recent expenses */}
          <Card>
            <CardHeader
              title="Chi phí gần đây"
              description={`Tổng ${fmt(data.stats.expenseTotal)}đ trong kỳ`}
              actions={
                <Link href={expensesHref}>
                  <Button variant="ghost" size="sm" iconRight={<ArrowUpRight size={12} weight="bold" />}>
                    Xem tất cả
                  </Button>
                </Link>
              }
            />
            <CardBody scrollable maxHeight="20rem">
              {data.recentExpenses.length === 0 ? (
                <EmptyState icon={<Receipt size={20} weight="duotone" />} title="Chưa có chi phí" />
              ) : (
                <RecentTable headers={["Ngày", "Loại", "Ghi chú", "Số tiền"]}>
                  {data.recentExpenses.map((e) => (
                    <tr key={e.id} className="border-b border-hairline last:border-0 hover:bg-surface-soft">
                      <td className="px-3 py-2.5 text-[13px] text-ink-muted">{fmtDate(e.date)}</td>
                      <td className="px-3 py-2.5">
                        <Pill tone="neutral" size="sm">
                          {e.category}
                        </Pill>
                      </td>
                      <td className="max-w-[280px] truncate px-3 py-2.5 text-[13px] text-ink-faint">
                        {e.note ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-tabular text-[13px] font-semibold text-ink">
                        {fmt(e.amount)}đ
                      </td>
                    </tr>
                  ))}
                </RecentTable>
              )}
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}

/* ----------------------------- Subviews ----------------------------- */

function PeriodPill({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 font-medium text-brand">
      {icon}
      {children}
    </span>
  );
}

function PeriodToolbar({
  period,
  setPeriod,
  customFrom,
  customTo,
  setCustomFrom,
  setCustomTo,
}: {
  period: Period;
  setPeriod: (p: Period) => void;
  customFrom: string;
  customTo: string;
  setCustomFrom: (v: string) => void;
  setCustomTo: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = PERIODS.find((p) => p.value === period)?.label ?? "";

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        iconRight={<CaretDown size={12} weight="bold" className={open ? "rotate-180" : ""} />}
      >
        {current}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-[calc(100%+4px)] z-30 w-56 rounded-lg border border-hairline bg-surface p-1 shadow-popover">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  setPeriod(p.value);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors",
                  period === p.value ? "bg-brand-soft text-brand" : "text-ink hover:bg-surface-soft",
                ].join(" ")}
              >
                <span>{p.label}</span>
                {period === p.value && <CaretRight size={12} weight="bold" />}
              </button>
            ))}
          </div>
        </>
      )}
      {period === "custom" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-8 rounded-md border border-hairline-strong bg-surface px-2 text-[13px] text-ink transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
          />
          <span className="text-ink-faint">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-8 rounded-md border border-hairline-strong bg-surface px-2 text-[13px] text-ink transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

function RecentTable({
  headers,
  children,
}: {
  headers: React.ReactNode[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-hairline">
      <table className="w-full">
        <thead className="bg-surface-soft text-left text-[11px] font-medium uppercase tracking-wider text-ink-faint">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={[
                  "px-3 py-2 font-medium",
                  i === headers.length - 1 ? "text-right" : "",
                ].join(" ")}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
