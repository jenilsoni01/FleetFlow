import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  DollarSign,
  Fuel,
  Wrench,
  BarChart2,
  Calendar,
  Download,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import AppLayout from "../components/layout/AppLayout";
import EmptyState from "../components/ui/EmptyState";
import { PageSpinner } from "../components/ui/Spinner";
import { getMonthlyBurnRate } from "../services/expenses.service";
import {
  exportMonthlyTrend,
  exportMonthlyComposition,
  exportCategoryBreakdown,
} from "../utils/exportCsv";

const TYPE_COLORS = {
  fuel: "#f59e0b",
  toll: "#60a5fa",
  parking: "#a78bfa",
  fine: "#f87171",
  other: "#9ca3af",
  maintenance: "#6366f1",
};

const ALL_TYPES = ["fuel", "toll", "parking", "fine", "other", "maintenance"];

const MONTH_OPTIONS = [
  { label: "3 Months", value: 3 },
  { label: "6 Months", value: 6 },
  { label: "12 Months", value: 12 },
];

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconColor = "text-indigo-400",
  bg = "bg-indigo-900/20",
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-start gap-4">
      <div
        className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}
      >
        <Icon size={20} className={iconColor} />
      </div>
      <div>
        <p className="text-gray-500 text-xs mb-0.5">{label}</p>
        <p className="text-white text-xl font-bold">{value}</p>
        {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm shadow-xl min-w-32">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color ?? "#fff" }} className="capitalize">
            {p.name}
          </span>
          <span className="text-white">
            ₹{Number(p.value ?? 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [months, setMonths] = useState(6);

  const burnRate = useQuery({
    queryKey: ["burn-rate-analytics", months],
    queryFn: () => getMonthlyBurnRate({ months }),
    staleTime: 60_000,
  });

  const burnData = burnRate.data?.burnRate ?? [];

  // Pivot breakdown types into each month row for the stacked bar
  const stackedData = useMemo(
    () =>
      burnData.map((m) => {
        const row = { month: m.month, maintenance: m.maintenance };
        (m.breakdown ?? []).forEach((b) => {
          row[b.type] = b.amount;
        });
        return row;
      }),
    [burnData],
  );

  // Aggregate totals by type across all months
  const typeAgg = useMemo(() => {
    const acc = {};
    burnData.forEach((m) => {
      if (m.maintenance)
        acc.maintenance = (acc.maintenance ?? 0) + m.maintenance;
      (m.breakdown ?? []).forEach((b) => {
        acc[b.type] = (acc[b.type] ?? 0) + b.amount;
      });
    });
    return Object.entries(acc)
      .map(([type, total]) => ({ type, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);
  }, [burnData]);

  // Summary KPIs
  const totalSpend = burnData.reduce((s, m) => s + (m.total ?? 0), 0);
  const avgMonthly =
    burnData.length > 0 ? Math.round(totalSpend / burnData.length) : 0;
  const highestMonth = burnData.reduce(
    (best, m) => (m.total > (best?.total ?? 0) ? m : best),
    null,
  );
  const fuelTotal = typeAgg.find((t) => t.type === "fuel")?.total ?? 0;
  const maintenanceTotal =
    typeAgg.find((t) => t.type === "maintenance")?.total ?? 0;

  const fmt = (v) => `₹${Math.round(v).toLocaleString()}`;

  return (
    <AppLayout title="Analytics">
      {/* Month range selector */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">
          Fleet-wide financial performance summary
        </p>
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
          {MONTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMonths(opt.value)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                months === opt.value
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {burnRate.isLoading ? (
        <PageSpinner />
      ) : burnData.length === 0 ? (
        <EmptyState
          title="No analytics data"
          icon={BarChart2}
          description="Complete trips with expenses to see analytics."
        />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              icon={DollarSign}
              label={`Total Spend (${months}mo)`}
              value={fmt(totalSpend)}
              sub={`${burnData.length} months of data`}
              iconColor="text-emerald-400"
              bg="bg-emerald-900/20"
            />
            <KpiCard
              icon={TrendingUp}
              label="Avg Monthly Spend"
              value={fmt(avgMonthly)}
              sub="per month average"
              iconColor="text-blue-400"
              bg="bg-blue-900/20"
            />
            <KpiCard
              icon={Fuel}
              label="Total Fuel Cost"
              value={fmt(fuelTotal)}
              sub={
                totalSpend > 0
                  ? `${Math.round((fuelTotal / totalSpend) * 100)}% of total`
                  : "—"
              }
              iconColor="text-amber-400"
              bg="bg-amber-900/20"
            />
            <KpiCard
              icon={Wrench}
              label="Total Maintenance"
              value={fmt(maintenanceTotal)}
              sub={
                totalSpend > 0
                  ? `${Math.round((maintenanceTotal / totalSpend) * 100)}% of total`
                  : "—"
              }
              iconColor="text-indigo-400"
              bg="bg-indigo-900/20"
            />
          </div>

          {/* Monthly Burn Rate Line Chart */}
          <Section
            title="Monthly Spend Trend"
            action={
              <button
                onClick={() => exportMonthlyTrend(burnData, months)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
              >
                <Download size={13} />
                Export CSV
              </button>
            }
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={burnData}
                margin={{ top: 4, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                <Line
                  type="monotone"
                  dataKey="trip_expenses"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="trip_expenses"
                />
                <Line
                  type="monotone"
                  dataKey="maintenance"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="maintenance"
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  name="total"
                  strokeDasharray="6 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </Section>

          {/* Two-column layout: stacked bar + type distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Stacked expense type per month */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">
                  Expense Composition by Month
                </h3>
                <button
                  onClick={() => exportMonthlyComposition(stackedData, months)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
                >
                  <Download size={13} />
                  Export CSV
                </button>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={stackedData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
                  {ALL_TYPES.filter((t) =>
                    stackedData.some((d) => d[t] != null && d[t] > 0),
                  ).map((t) => (
                    <Bar
                      key={t}
                      dataKey={t}
                      stackId="a"
                      fill={TYPE_COLORS[t]}
                      name={t}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Overall Type Distribution */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Total by Category</h3>
                <button
                  onClick={() => exportCategoryBreakdown(typeAgg, totalSpend)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
                >
                  <Download size={13} />
                  Export CSV
                </button>
              </div>
              {typeAgg.length === 0 ? (
                <p className="text-gray-600 text-sm">
                  No category breakdown available.
                </p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={typeAgg}
                      layout="vertical"
                      margin={{ top: 0, right: 16, left: 60, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#374151"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: "#9ca3af", fontSize: 10 }}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="type"
                        tick={{
                          fill: "#9ca3af",
                          fontSize: 11,
                          textTransform: "capitalize",
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]} name="total">
                        {typeAgg.map((entry) => (
                          <Cell
                            key={entry.type}
                            fill={TYPE_COLORS[entry.type] ?? "#6b7280"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {typeAgg.map((t) => (
                      <div
                        key={t.type}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: TYPE_COLORS[t.type] ?? "#6b7280",
                            }}
                          />
                          <span className="text-gray-400 capitalize">
                            {t.type}
                          </span>
                        </div>
                        <span className="text-white font-medium">
                          {fmt(t.total)}
                          <span className="text-gray-600 ml-1">
                            (
                            {totalSpend > 0
                              ? Math.round((t.total / totalSpend) * 100)
                              : 0}
                            %)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Highest spend month callout */}
          {highestMonth && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
              <Calendar size={20} className="text-rose-400 shrink-0" />
              <div>
                <p className="text-gray-400 text-sm">
                  Peak month:{" "}
                  <span className="text-white font-semibold">
                    {highestMonth.month}
                  </span>
                </p>
                <p className="text-gray-600 text-xs">
                  Total spend: {fmt(highestMonth.total)} — Trip expenses:{" "}
                  {fmt(highestMonth.trip_expenses ?? 0)} Maintenance:{" "}
                  {fmt(highestMonth.maintenance ?? 0)}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
