import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Fuel, Search } from "lucide-react";
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
} from "recharts";
import AppLayout from "../components/layout/AppLayout";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import { PageSpinner } from "../components/ui/Spinner";
import {
  listExpenses,
  getMonthlyBurnRate,
  getVehicleOperationalCost,
  getVehicleFuelEfficiency,
} from "../services/expenses.service";

const TABS = ["List", "Analytics"];
const EXPENSE_TYPES = ["all", "fuel", "toll", "parking", "fine", "other"];

const CHART_COLORS = {
  fuel: "#f59e0b",
  maintenance: "#6366f1",
  total: "#10b981",
};

function Section({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? "#fff" }}>
          {p.name}:{" "}
          {typeof p.value === "number"
            ? `₹${p.value.toLocaleString()}`
            : p.value}
        </p>
      ))}
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

function AnalyticsTab() {
  const [vehicleId, setVehicleId] = useState("");

  const burnRate = useQuery({
    queryKey: ["burn-rate"],
    queryFn: () => getMonthlyBurnRate(),
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

  const burnData = burnRate.data ?? [];
  const costData = opCost.data;
  const fuelData = fuelEff.data ?? [];

  return (
    <div>
      <Section title="Monthly Burn Rate">
        {burnRate.isLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-600">
            Loading…
          </div>
        ) : burnData.length === 0 ? (
          <EmptyState
            title="No burn rate data"
            icon={TrendingUp}
            description="Add expense records to see trends."
          />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={burnData}
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
              <Line
                type="monotone"
                dataKey="fuel"
                stroke={CHART_COLORS.fuel}
                strokeWidth={2}
                dot={false}
                name="Fuel"
              />
              <Line
                type="monotone"
                dataKey="maintenance"
                stroke={CHART_COLORS.maintenance}
                strokeWidth={2}
                dot={false}
                name="Maintenance"
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke={CHART_COLORS.total}
                strokeWidth={2}
                dot={false}
                name="Total"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Section>

      <Section title="Per-Vehicle Analysis">
        <div className="mb-4">
          <label className="block text-gray-500 text-xs mb-1">Vehicle ID</label>
          <input
            placeholder="Paste vehicle _id to load analytics…"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value.trim())}
            className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {!vehicleId && (
          <p className="text-gray-600 text-sm">
            Enter a vehicle ID above to see operational cost and fuel
            efficiency.
          </p>
        )}

        {vehicleId && opCost.isLoading && <PageSpinner />}

        {vehicleId && costData && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Cost", value: costData.total_cost },
              { label: "Fuel", value: costData.fuel_cost },
              { label: "Maintenance", value: costData.maintenance_cost },
              { label: "Tolls", value: costData.toll_cost },
              { label: "Fines", value: costData.fine_cost },
              { label: "Other", value: costData.other_cost },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-500 text-xs mb-1">{label}</p>
                <p className="text-white font-semibold">
                  ₹{Number(value ?? 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {vehicleId && fuelData.length > 0 && (
          <>
            <h4 className="text-gray-400 text-sm mb-3">
              Fuel Efficiency Over Time (km/L)
            </h4>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={fuelData}
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip content={<FuelTooltip />} />
                <Bar
                  dataKey="efficiency"
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
  if (type !== "all") params.type = type;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", params],
    queryFn: () => listExpenses(params),
    staleTime: 30_000,
  });

  const expenses = (data?.expenses ?? data ?? []).filter((e) =>
    search
      ? e.description?.toLowerCase().includes(search.toLowerCase()) ||
        e.trip?.trip_reference?.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            placeholder="Search description or trip ref…"
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
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${type === t ? "bg-indigo-600 text-white" : "bg-gray-900 border border-gray-700 text-gray-400 hover:text-white"}`}
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
                  "Trip",
                  "Type",
                  "Amount",
                  "Description",
                  "Date",
                  "Vehicle",
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
              {expenses.map((e) => (
                <tr
                  key={e._id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-indigo-400 font-mono text-xs">
                    {e.trip?.trip_reference ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={e.expense_type ?? e.type} />
                  </td>
                  <td className="px-4 py-3 text-white font-medium">
                    ₹{Number(e.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-40 truncate">
                    {e.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {e.date ? new Date(e.date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {e.vehicle?.name ?? e.trip?.vehicle?.name ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "List" ? <ListTab /> : <AnalyticsTab />}
    </AppLayout>
  );
}
