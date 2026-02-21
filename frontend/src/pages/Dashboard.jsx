import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Route,
  Users,
  Wrench,
  AlertTriangle,
  Activity,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import StatCard from "../components/ui/StatCard";
import { PageSpinner } from "../components/ui/Spinner";
import { getDashboardSummary } from "../services/dashboard.service";

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

  const v = data?.vehicles ?? {};
  const t = data?.trips ?? {};
  const d = data?.drivers ?? {};
  const m = data?.maintenance ?? {};

  return (
    <AppLayout title="Dashboard">
      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label className="text-gray-400 text-sm">From</label>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) =>
            setFilters((f) => ({ ...f, startDate: e.target.value }))
          }
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
        />
        <label className="text-gray-400 text-sm">To</label>
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) =>
            setFilters((f) => ({ ...f, endDate: e.target.value }))
          }
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
        />
        {(filters.startDate || filters.endDate) && (
          <button
            onClick={() => setFilters({ startDate: "", endDate: "" })}
            className="text-xs text-gray-400 hover:text-white px-3 py-2 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {isLoading && <PageSpinner />}
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 text-red-400 text-sm">
          Failed to load dashboard. Make sure the backend is running on port
          3000.
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {/* Fleet Overview */}
          <section>
            <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-4">
              Fleet Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Vehicles"
                value={v.total ?? 0}
                subtitle={`${v.available ?? 0} available`}
                icon={Truck}
                color="indigo"
              />
              <StatCard
                title="Available"
                value={v.available ?? 0}
                icon={CheckCircle}
                color="emerald"
              />
              <StatCard
                title="In Shop"
                value={v.in_shop ?? 0}
                icon={Wrench}
                color="amber"
              />
              <StatCard
                title="Retired"
                value={v.retired ?? 0}
                icon={AlertTriangle}
                color="red"
              />
            </div>
          </section>

          {/* Trip Activity */}
          <section>
            <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-4">
              Trip Activity
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Trips"
                value={t.total ?? 0}
                icon={Route}
                color="indigo"
              />
              <StatCard
                title="Active"
                value={(t.dispatched ?? 0) + (t.in_transit ?? 0)}
                subtitle={`${t.dispatched ?? 0} dispatched · ${t.in_transit ?? 0} in transit`}
                icon={Activity}
                color="blue"
              />
              <StatCard
                title="Completed"
                value={t.completed ?? 0}
                icon={CheckCircle}
                color="emerald"
              />
              <StatCard
                title="Cancelled"
                value={t.cancelled ?? 0}
                icon={AlertTriangle}
                color="red"
              />
            </div>
          </section>

          {/* Drivers */}
          <section>
            <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-4">
              Drivers
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Drivers"
                value={d.total ?? 0}
                icon={Users}
                color="indigo"
              />
              <StatCard
                title="On Duty"
                value={d.on_duty ?? 0}
                icon={Users}
                color="emerald"
              />
              <StatCard
                title="On Trip"
                value={d.on_trip ?? 0}
                icon={Route}
                color="blue"
              />
              <StatCard
                title="License Expiring"
                value={d.expiring_licenses ?? 0}
                subtitle="within 30 days"
                icon={AlertTriangle}
                color="amber"
              />
            </div>
          </section>

          {/* Maintenance */}
          <section>
            <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-4">
              Maintenance
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Pending"
                value={m.pending ?? 0}
                icon={Wrench}
                color="amber"
              />
              <StatCard
                title="In Progress"
                value={m.in_progress ?? 0}
                icon={Activity}
                color="blue"
              />
              <StatCard
                title="Completed (30d)"
                value={m.completed ?? 0}
                icon={CheckCircle}
                color="emerald"
              />
              <StatCard
                title="Total Cost (30d)"
                value={
                  m.total_cost != null
                    ? `₹${Number(m.total_cost).toLocaleString()}`
                    : "—"
                }
                icon={TrendingUp}
                color="indigo"
              />
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
