"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

type Period = "today" | "thisMonth" | "lastMonth" | "thisQuarter" | "lastQuarter" | "thisYear" | "lastYear" | "custom";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "thisMonth", label: "Tháng này" },
  { value: "lastMonth", label: "Tháng trước" },
  { value: "thisQuarter", label: "Quý này" },
  { value: "lastQuarter", label: "Quý trước" },
  { value: "thisYear", label: "Năm nay" },
  { value: "lastYear", label: "Năm trước" },
  { value: "custom", label: "Tùy chỉnh" },
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
type RecentOrder = { id: string; date: string | Date; customer: string | null; channel: string | null; total: number | null };
type RecentExpense = { id: string; date: string | Date; category: string; amount: number; note: string | null };

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

function getPeriodDates(period: Period, customFrom?: string, customTo?: string): { from: Date; to: Date; label: string } {
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
  return `T${parseInt(mm, 10)}/${y}`;
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
    [period, customFrom, customTo]
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
      .catch(() => setError("Lỗi tải dữ liệu"))
      .finally(() => setLoading(false));
  }, [from, to, period, customFrom, customTo]);

  const maxRevenue = data ? Math.max(...data.monthly.map((m) => m.revenue), 1) : 1;
  const maxExpense = data ? Math.max(...data.topExpenses.map((e) => e.total), 1) : 1;

  const ordersHref = `/orders?from=${isoDate(from)}&to=${isoDate(to)}`;
  const expensesHref = `/expenses?from=${isoDate(from)}&to=${isoDate(to)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          {label && <p className="text-sm text-slate-500">Kỳ: <span className="font-medium text-slate-700">{label}</span></p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="rounded border border-slate-300 px-3 py-2 text-sm">
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {period === "custom" && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <span className="text-slate-400">→</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm" />
            </>
          )}
        </div>
      </div>

      {error && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Doanh thu" value={fmt(data.stats.revenue) + "đ"} color="green" />
            <StatCard label="Chi phí" value={fmt(data.stats.cost) + "đ"} color="red" />
            <StatCard label="Lợi nhuận" value={fmt(data.stats.profit) + "đ"} sub={`Biên ${data.stats.profitMargin}%`} color={data.stats.profit >= 0 ? "blue" : "red"} highlight />
            <StatCard label="Số đơn" value={String(data.stats.orderCount)} sub={`${data.stats.bookSoldCount} sách đã bán`} />
            <StatCard label="TB đơn" value={fmt(data.stats.avgOrderValue) + "đ"} />
            <StatCard label="Tiền sách (COGS)" value={fmt(data.stats.bookCost) + "đ"} sub={`+ ${fmt(data.stats.expenseTotal)}đ CP khác`} />
            <StatCard label="Sách tồn kho" value={String(data.stats.inStockCount)} sub="hiện tại" />
            <StatCard label="Tổng sách bán" value={String(data.stats.bookSoldCount)} sub="trong kỳ" />
          </div>

          <div className="rounded-xl border bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold">Doanh thu theo tháng</h2>
            {data.monthly.length === 0 ? (
              <p className="text-sm text-slate-400">Không có dữ liệu trong kỳ</p>
            ) : (
              <div className="space-y-2">
                {data.monthly.map((m) => (
                  <div key={m.month} className="flex items-center gap-2 text-sm">
                    <span className="w-16 shrink-0 text-slate-500">{monthLabel(m.month)}</span>
                    <div className="flex-1">
                      <div className="flex h-5 items-center rounded bg-slate-100">
                        <div className="flex h-5 items-center justify-end rounded bg-green-500 px-2 text-xs text-white" style={{ width: `${Math.max((m.revenue / maxRevenue) * 100, 2)}%`, minWidth: "2rem" }}>
                          {m.revenue > 0 && fmt(m.revenue)}
                        </div>
                      </div>
                      <div className="mt-1 flex h-3 items-center rounded bg-slate-50">
                        <div className="h-3 rounded bg-red-400" style={{ width: `${Math.max((m.cost / maxRevenue) * 100, 1.5)}%`, minWidth: m.cost > 0 ? "1.5rem" : "0" }} />
                      </div>
                    </div>
                    <div className="w-32 shrink-0 text-right">
                      <p className={m.profit >= 0 ? "text-green-700" : "text-red-700"}>{m.profit >= 0 ? "+" : ""}{fmt(m.profit)}đ</p>
                      <p className="text-xs text-slate-400">{m.orderCount} đơn · {m.bookSold} sách</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-4 border-t pt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-green-500" /> Doanh thu</span>
              <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-red-400" /> Chi phí</span>
              <span className="ml-auto">Tổng: {fmt(data.monthly.reduce((s, m) => s + m.revenue, 0))}đ doanh thu / {fmt(data.monthly.reduce((s, m) => s + m.cost, 0))}đ chi phí</span>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="Top sách bán chạy" subtitle={`Theo doanh thu · ${data.topBooks.length} sách`}>
              {data.topBooks.length === 0 ? (
                <Empty text="Chưa có đơn hàng trong kỳ" />
              ) : (
                <ol className="space-y-1.5 text-sm">
                  {data.topBooks.map((b, i) => (
                    <li key={b.id} className="flex items-center gap-2">
                      <span className="w-5 text-right text-xs font-bold text-slate-400">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{b.title}</span>
                      <span className="text-xs text-slate-500">{b.count} cuốn</span>
                      <span className="w-24 text-right text-sm font-medium">{fmt(b.revenue)}đ</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel title="Chi phí theo loại" subtitle={`Tổng ${fmt(data.stats.expenseTotal)}đ`} viewAllHref={expensesHref}>
              {data.topExpenses.length === 0 ? (
                <Empty text="Chưa có chi phí trong kỳ" />
              ) : (
                <div className="space-y-1.5 text-sm">
                  {data.topExpenses.map((e) => (
                    <div key={e.category} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-slate-700">{e.category}</span>
                      <div className="h-4 flex-1 rounded bg-slate-100">
                        <div className="h-4 rounded bg-red-400" style={{ width: `${(e.total / maxExpense) * 100}%` }} />
                      </div>
                      <span className="w-24 text-right font-medium">{fmt(e.total)}đ</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <Panel title="Đơn hàng gần đây" subtitle={`${data.stats.orderCount} đơn trong kỳ`} viewAllHref={ordersHref}>
            {data.recentOrders.length === 0 ? (
              <Empty text="Chưa có đơn hàng" />
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Ngày</th>
                    <th className="px-3 py-2">Khách</th>
                    <th className="px-3 py-2">Kênh</th>
                    <th className="px-3 py-2 text-right">Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((o) => (
                    <tr key={o.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2">{fmtDate(o.date)}</td>
                      <td className="px-3 py-2">{o.customer ?? "—"}</td>
                      <td className="px-3 py-2">{o.channel ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-medium">{o.total != null ? `${fmt(o.total)}đ` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Chi phí gần đây" subtitle={`Tổng ${fmt(data.stats.expenseTotal)}đ`} viewAllHref={expensesHref}>
            {data.recentExpenses.length === 0 ? (
              <Empty text="Chưa có chi phí" />
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Ngày</th>
                    <th className="px-3 py-2">Loại</th>
                    <th className="px-3 py-2">Ghi chú</th>
                    <th className="px-3 py-2 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentExpenses.map((e) => (
                    <tr key={e.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2">{fmtDate(e.date)}</td>
                      <td className="px-3 py-2">{e.category}</td>
                      <td className="px-3 py-2 text-slate-500">{e.note ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmt(e.amount)}đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, sub, color, highlight }: { label: string; value: string; sub?: string; color?: "green" | "red" | "blue"; highlight?: boolean }) {
  const valueColor = color === "green" ? "text-green-700" : color === "red" ? "text-red-700" : color === "blue" ? "text-blue-700" : "text-slate-900";
  return (
    <div className={`rounded-xl border bg-white p-4 ${highlight ? "ring-2 ring-blue-200" : ""}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function Panel({ title, subtitle, viewAllHref, children, scrollable }: { title: string; subtitle?: string; viewAllHref?: string; children: React.ReactNode; scrollable?: boolean }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {viewAllHref ? (
          <Link href={viewAllHref} className="text-xs text-blue-600 hover:underline">Xem tất cả →</Link>
        ) : (
          subtitle && <p className="text-xs text-slate-400">{subtitle}</p>
        )}
      </div>
      <div className={scrollable === false ? "" : "max-h-80 overflow-auto"}>
        {children}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded border border-dashed bg-slate-50 p-4 text-center text-sm text-slate-400">{text}</p>;
}