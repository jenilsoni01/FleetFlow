import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Search, Car } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import AppLayout from "../components/layout/AppLayout";
import EmptyState from "../components/ui/EmptyState";
import { PageSpinner } from "../components/ui/Spinner";
import {
  listExpenses,
  getVehicleOperationalCost,
  getVehicleFuelEfficiency,
} from "../services/expenses.service";
import { getVehicles } from "../services/vehicles.service";

const TABS = ["List", "Analytics"];
const EXPENSE_TYPES = ["all", "fuel", "toll", "parking", "fine", "other"];

const TYPE_COLORS = {
  fuel: "#f59e0b",
  toll: "#60a5fa",
  parking: "#a78bfa",
  fine: "#f87171",
  other: "#9ca3af",
};

function Section({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function KpiMini({ label, value, sub, color = "text-white" }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className={`font-semibold text-lg ${color}`}>{value}</p>
      {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function FuelTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? "#fff" }}>
          {p.name}: {p.value} km/L
        </p>
      ))}
    </div>
  );
}

function ExpenseTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-xl max-w-56">
      <p className="text-gray-400 mb-1">{d.fullDate ?? d.label}</p>
      <p className="text-white font-semibold mb-1">
        ₹{Number(d.amount ?? 0).toLocaleString()}
      </p>
      <p
        style={{ color: TYPE_COLORS[d.type] ?? "#9ca3af" }}
        className="capitalize mb-0.5"
      >
        {d.type}
      </p>
      {d.tripRef && <p className="text-indigo-400 font-mono">{d.tripRef}</p>}
      {d.description && (
        <p className="text-gray-500 mt-0.5 truncate">{d.description}</p>
      )}
    </div>
  );
}

function AnalyticsTab() {
  const [vehicleId, setVehicleId] = useState("");
  const [chartType, setChartType] = useState("all");

  const vehicles = useQuery({
    queryKey: ["vehicles-lite"],
    queryFn: () => getVehicles({ limit: 200 }),
    staleTime: 60_000,
  });

  const opCost = useQuery({
    queryKey: ["op-cost", vehicleId],
    queryFn: () => getVehicleOperationalCost(vehicleId),
    enabled: !!vehicleId,
    staleTime: 60_000,
  });

  const fuelEff = useQuery({
    queryKey: ["fuel-eff", vehicleId],
    queryFn: () => getVehicleFuelEfficiency(vehicleId),
    enabled: !!vehicleId,
    staleTime: 60_000,
  });

  const allExpenses = useQuery({
    queryKey: ["all-expenses-chart"],
    queryFn: () => listExpenses({ limit: 500 }),
    staleTime: 60_000,
  });

  const expenseChartData = (
    allExpenses.data?.expenses ??
    allExpenses.data ??
    []
  )
    .filter((e) => e.expense_date && e.amount)
    .filter((e) => chartType === "all" || e.expense_type === chartType)
    .sort((a, b) => new Date(a.expense_date) - new Date(b.expense_date))
    .map((e) => ({
      label: new Date(e.expense_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      fullDate: new Date(e.expense_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      amount: Number(e.amount ?? 0),
      type: e.expense_type ?? "other",
      description:
        e.description ??
        (e.fuel_details?.station_name
          ? `Fuel @ ${e.fuel_details.station_name}`
          : ""),
      tripRef: e.trip_reference ?? "",
    }));

  const BAR_MIN_WIDTH = 32;
  const chartPixelWidth = Math.max(
    600,
    expenseChartData.length * BAR_MIN_WIDTH,
  );

  // Backend: { vehicle, costs: { fuel, maintenance, other_expenses, total_operational }, metrics: {...} }
  const costs = opCost.data?.costs;
  const metrics = opCost.data?.metrics;
  const vehicleInfo = opCost.data?.vehicle;

  // Backend: { fill_ups: [...], average_efficiency_km_per_liter }
  const fuelData = (fuelEff.data?.fill_ups ?? [])
    .filter(
      (f) =>
        f.efficiency_km_per_liter !== null && f.efficiency_km_per_liter > 0,
    )
    .map((f) => ({
      ...f,
      label: f.expense_date
        ? new Date(f.expense_date).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          })
        : "—",
    }));

  const vehicleList = Array.isArray(vehicles.data?.vehicles)
    ? vehicles.data.vehicles
    : Array.isArray(vehicles.data)
      ? vehicles.data
      : [];

  return (
    <div>
      {/* All Expenses Chart */}
      <Section title="All Expenses">
        {/* Type filter + legend */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {["all", ...Object.keys(TYPE_COLORS)].map((t) => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors border ${
                chartType === t
                  ? "border-indigo-500 bg-indigo-600/20 text-white"
                  : "border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300"
              }`}
            >
              {t !== "all" && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: TYPE_COLORS[t] }}
                />
              )}
              {t}
            </button>
          ))}
          {expenseChartData.length > 0 && (
            <span className="ml-auto text-xs text-gray-600">
              {expenseChartData.length} expense
              {expenseChartData.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {allExpenses.isLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-600">
            Loading…
          </div>
        ) : expenseChartData.length === 0 ? (
          <EmptyState
            title="No expenses"
            icon={TrendingUp}
            description="Expenses from trips will appear here."
          />
        ) : (
          /* Horizontally scrollable so bars never get squished */
          <div className="overflow-x-auto pb-1">
            <div style={{ width: chartPixelWidth, minWidth: "100%" }}>
              <BarChart
                width={chartPixelWidth}
                height={320}
                data={expenseChartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 64 }}
                barSize={Math.min(
                  28,
                  Math.max(6, chartPixelWidth / expenseChartData.length - 6),
                )}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1f2937"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={60}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickFormatter={(v) =>
                    `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                  }
                  width={56}
                />
                <Tooltip
                  content={<ExpenseTooltip />}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {expenseChartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={TYPE_COLORS[entry.type] ?? "#6b7280"}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </div>
          </div>
        )}
      </Section>

      {/* Per-Vehicle Analysis */}
      <Section title="Per-Vehicle Analysis">
        <div className="mb-4">
          <label className="block text-gray-500 text-xs mb-1">
            Select Vehicle
          </label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">— Pick a vehicle —</option>
            {vehicleList.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name} {v.license_plate}
              </option>
            ))}
          </select>
        </div>

        {!vehicleId && (
          <p className="text-gray-600 text-sm">
            Select a vehicle above to see its operational cost and fuel
            efficiency.
          </p>
        )}

        {vehicleId && opCost.isLoading && <PageSpinner />}

        {vehicleId && costs && (
          <>
            {vehicleInfo && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-gray-800/50 rounded-lg">
                <Car size={16} className="text-indigo-400" />
                <span className="text-white text-sm font-medium">
                  {vehicleInfo.name}
                </span>
                <span className="text-gray-500 text-xs font-mono">
                  {vehicleInfo.license_plate}
                </span>
                {vehicleInfo.current_odometer != null && (
                  <span className="text-gray-600 text-xs ml-auto">
                    Odometer: {vehicleInfo.current_odometer.toLocaleString()} km
                  </span>
                )}
              </div>
            )}

            <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-3">
              Cost Breakdown
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              <KpiMini
                label="Total Operational"
                value={`₹${Number(costs.total_operational ?? 0).toLocaleString()}`}
                color="text-emerald-400"
              />
              <KpiMini
                label="Fuel"
                value={`₹${Number(costs.fuel ?? 0).toLocaleString()}`}
                color="text-amber-400"
              />
              <KpiMini
                label="Maintenance"
                value={`₹${Number(costs.maintenance ?? 0).toLocaleString()}`}
                color="text-indigo-400"
              />
              <KpiMini
                label="Other Expenses"
                value={`₹${Number(costs.other_expenses ?? 0).toLocaleString()}`}
              />
              {metrics?.cost_per_km != null && (
                <KpiMini
                  label="Cost / km"
                  value={`₹${metrics.cost_per_km}`}
                  sub={`${(metrics.total_distance_km ?? 0).toLocaleString()} km driven`}
                  color="text-blue-400"
                />
              )}
              {metrics?.fuel_efficiency_km_per_liter != null && (
                <KpiMini
                  label="Fuel Efficiency"
                  value={`${metrics.fuel_efficiency_km_per_liter} km/L`}
                  sub={`${metrics.fuel_liters ?? 0} L consumed`}
                  color="text-teal-400"
                />
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
              <span>
                Completed Trips:{" "}
                <span className="text-gray-300">
                  {metrics?.completed_trips ?? 0}
                </span>
              </span>
              <span>
                Maintenance Services:{" "}
                <span className="text-gray-300">
                  {metrics?.maintenance_services ?? 0}
                </span>
              </span>
              <span>
                Total Distance:{" "}
                <span className="text-gray-300">
                  {(metrics?.total_distance_km ?? 0).toLocaleString()} km
                </span>
              </span>
            </div>
          </>
        )}

        {vehicleId && !opCost.isLoading && !costs && !opCost.isError && (
          <p className="text-gray-600 text-sm mt-2">
            No cost data found for this vehicle.
          </p>
        )}

        {vehicleId && opCost.isError && (
          <p className="text-red-500 text-sm mt-2">Failed to load cost data.</p>
        )}

        {vehicleId && fuelData.length > 0 && (
          <>
            <h4 className="text-gray-400 text-sm mb-3 mt-6">
              Fuel Efficiency Per Fill-up (km/L)
              {fuelEff.data?.average_efficiency_km_per_liter != null && (
                <span className="ml-2 text-amber-400 text-xs">
                  Avg: {fuelEff.data.average_efficiency_km_per_liter} km/L
                </span>
              )}
            </h4>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={fuelData}
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip content={<FuelTooltip />} />
                <Bar
                  dataKey="efficiency_km_per_liter"
                  fill="#f59e0b"
                  name="Efficiency"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </Section>
    </div>
  );
}

function ListTab() {
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const params = {};
  if (type !== "all") params.expense_type = type;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", params],
    queryFn: () => listExpenses(params),
    staleTime: 30_000,
  });

  // Backend returns { expenses: [...], total, page, limit }
  // Each expense after $replaceRoot has trip_reference, vehicle, trip_status at top level
  const expenses = (data?.expenses ?? data ?? []).filter((e) =>
    search
      ? e.description?.toLowerCase().includes(search.toLowerCase()) ||
        e.trip_reference?.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            placeholder="Search description or trip ref"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-indigo-500"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-indigo-500"
        />
        <div className="flex gap-2 flex-wrap">
          {EXPENSE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                type === t
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-900 border border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : expenses.length === 0 ? (
        <EmptyState
          title="No expenses"
          icon={DollarSign}
          description="Expenses attached to trips will appear here."
        />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {[
                  "Trip Ref",
                  "Type",
                  "Amount",
                  "Description",
                  "Date",
                  "Vehicle",
                  "Trip Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-gray-500 font-medium text-xs uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e, idx) => (
                <tr
                  key={e._id ?? idx}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-indigo-400 font-mono text-xs">
                    {e.trip_reference ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={{
                        backgroundColor:
                          (TYPE_COLORS[e.expense_type] ?? "#6b7280") + "22",
                        color: TYPE_COLORS[e.expense_type] ?? "#9ca3af",
                      }}
                    >
                      {e.expense_type ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">
                    ₹{Number(e.amount ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-40 truncate">
                    {e.description ||
                      (e.fuel_details?.station_name
                        ? `Fuel @ ${e.fuel_details.station_name}`
                        : "—")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {fmtDate(e.expense_date)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="text-gray-300">
                      {e.vehicle?.name ?? "—"}
                    </span>
                    {e.vehicle?.license_plate && (
                      <span className="block text-gray-600 font-mono">
                        {e.vehicle.license_plate}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs capitalize font-medium ${
                        e.trip_status === "completed"
                          ? "bg-emerald-900/50 text-emerald-400"
                          : e.trip_status === "in_transit"
                            ? "bg-blue-900/50 text-blue-400"
                            : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {(e.trip_status ?? "—").replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.total != null && (
            <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-600">
              Showing {expenses.length} of {data.total} expenses
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Expenses() {
  const [tab, setTab] = useState("List");

  return (
    <AppLayout title="Expenses">
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "List" ? <ListTab /> : <AnalyticsTab />}
    </AppLayout>
  );
}
