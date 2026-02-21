import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Route,
  Wrench,
  Activity,
  TrendingUp,
  Fuel,
  Package,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Cell,
} from "recharts";
import AppLayout from "../components/layout/AppLayout";
import { PageSpinner } from "../components/ui/Spinner";
import { getDashboardSummary } from "../services/dashboard.service";

const STATUS_COLORS = {
  available: "#10b981",
  on_trip: "#6366f1",
  in_shop: "#f59e0b",
  out_of_service: "#ef4444",
};

const STATUS_LABELS = {
  available: "Available",
  on_trip: "On Trip",
  in_shop: "In Shop",
  out_of_service: "Out of Service",
};

function KpiCard({ icon: Icon, title, value, subtitle, color = "indigo" }) {
  const colors = {
    indigo: "text-indigo-400 bg-indigo-900/20",
    emerald: "text-emerald-400 bg-emerald-900/20",
    amber: "text-amber-400 bg-amber-900/20",
    blue: "text-blue-400 bg-blue-900/20",
    red: "text-red-400 bg-red-900/20",
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${colors[color] ?? colors.indigo}`}>
        <Icon size={20} className={colors[color]?.split(" ")[0]} />
      </div>
      <div>
        <p className="text-gray-500 text-xs mb-1">{title}</p>
        <p className="text-white text-2xl font-bold leading-tight">{value}</p>
        {subtitle && <p className="text-gray-600 text-xs mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, icon: Icon, children, empty }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-5 flex items-center gap-2">
        {Icon && <Icon size={13} />} {title}
      </h3>
      {empty ? (
        <p className="text-gray-700 text-sm text-center py-8">No data yet</p>
      ) : (
        children
      )}
    </div>
  );
}

const CustomTooltip = ({
  active,
  payload,
  label,
  prefix = "",
  suffix = "",
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p
          key={p.name}
          style={{ color: p.color ?? p.fill }}
          className="font-medium"
        >
          {prefix}
          {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          {suffix}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", filters],
    queryFn: () =>
      getDashboardSummary(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      ),
    staleTime: 60_000,
  });

  const kpis = data?.kpis ?? {};
  const charts = data?.charts ?? {};

  const fleetBreakdown = charts.fleetStatusBreakdown ?? [];
  const weeklyVolume = charts.weeklyTripVolume ?? [];
  const fuelTrend = charts.fuelSpendTrend ?? [];
  const topVehicles = charts.topVehiclesByDistance ?? [];

  // Shorten date labels e.g. "2026-02-21" → "Feb 21"
  const weeklyVolumeLabelled = weeklyVolume.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }),
  }));

  // Shorten month labels e.g. "2026-02" → "Feb '26"
  const fuelTrendLabelled = fuelTrend.map((d) => ({
    ...d,
    label: new Date(d.month + "-01").toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    }),
  }));

  return (
    <AppLayout title="Dashboard">
      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-gray-500 text-sm">Trip date range:</span>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) =>
            setFilters((f) => ({ ...f, startDate: e.target.value }))
          }
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
        />
        <span className="text-gray-600 text-sm">to</span>
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) =>
            setFilters((f) => ({ ...f, endDate: e.target.value }))
          }
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
        />
        {(filters.startDate || filters.endDate) && (
          <button
            onClick={() => setFilters({ startDate: "", endDate: "" })}
            className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {isLoading && <PageSpinner />}

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 text-red-400 text-sm">
          Failed to load dashboard. Make sure the backend is running.
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {/* ── KPIs ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={Truck}
              title="Active Fleet (On Trip)"
              value={kpis.activeFleet ?? 0}
              subtitle={`of ${kpis.totalActiveVehicles ?? 0} active vehicles`}
              color="indigo"
            />
            <KpiCard
              icon={Activity}
              title="Utilization Rate"
              value={`${kpis.utilizationRate ?? 0}%`}
              subtitle="vehicles currently on trip"
              color="blue"
            />
            <KpiCard
              icon={Wrench}
              title="In Maintenance"
              value={kpis.maintenanceAlerts ?? 0}
              subtitle="vehicles in shop"
              color="amber"
            />
            <KpiCard
              icon={Package}
              title="Pending Cargo"
              value={kpis.pendingCargo ?? 0}
              subtitle="draft trips awaiting dispatch"
              color="emerald"
            />
          </div>

          {/* ── Charts row 1 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fleet Status Breakdown */}
            <ChartCard
              title="Fleet Status Breakdown"
              icon={Truck}
              empty={fleetBreakdown.length === 0}
            >
              <div className="space-y-3">
                {fleetBreakdown.map((item) => {
                  const total = fleetBreakdown.reduce((s, x) => s + x.count, 0);
                  const pct =
                    total > 0 ? Math.round((item.count / total) * 100) : 0;
                  const color = STATUS_COLORS[item.status] ?? "#6b7280";
                  return (
                    <div key={item.status}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                        <span className="text-gray-300 font-medium">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            {/* Weekly Trip Volume */}
            <ChartCard
              title="Weekly Trip Volume (Last 7 Days)"
              icon={Route}
              empty={weeklyVolumeLabelled.length === 0}
            >
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={weeklyVolumeLabelled}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1f2937"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<CustomTooltip suffix=" trips" />}
                    cursor={{ fill: "rgba(99,102,241,0.1)" }}
                  />
                  <Bar dataKey="trips" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Charts row 2 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fuel Spend Trend */}
            <ChartCard
              title="Fuel Spend Trend (Last 6 Months)"
              icon={Fuel}
              empty={fuelTrendLabelled.length === 0}
            >
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart
                  data={fuelTrendLabelled}
                  margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1f2937"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`
                    }
                  />
                  <Tooltip
                    content={<CustomTooltip prefix="₹" />}
                    cursor={{
                      stroke: "#f59e0b",
                      strokeWidth: 1,
                      strokeDasharray: "3 3",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalFuelSpend"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#fuelGrad)"
                    dot={{ fill: "#f59e0b", r: 3 }}
                    name="Fuel Spend"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Top Vehicles by Distance */}
            <ChartCard
              title="Top Vehicles by Distance (This Month)"
              icon={TrendingUp}
              empty={topVehicles.length === 0}
            >
              <div className="space-y-3">
                {topVehicles.map((v, i) => {
                  const max = topVehicles[0]?.totalDistance ?? 1;
                  const pct =
                    max > 0 ? Math.round((v.totalDistance / max) * 100) : 0;
                  return (
                    <div key={v.vehicle_id ?? i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300">
                          {v.name ?? "Unknown"}
                          {v.license_plate && (
                            <span className="text-gray-600 ml-1.5 font-mono">
                              {v.license_plate}
                            </span>
                          )}
                        </span>
                        <span className="text-gray-400">
                          {(v.totalDistance ?? 0).toLocaleString()} km ·{" "}
                          {v.tripsCompleted} trips
                        </span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
