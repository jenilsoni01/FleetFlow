import React from "react";

const variants = {
  draft: "bg-gray-700 text-gray-300",
  dispatched: "bg-blue-900 text-blue-300",
  in_transit: "bg-amber-900 text-amber-300",
  completed: "bg-emerald-900 text-emerald-300",
  cancelled: "bg-red-900 text-red-400",
  available: "bg-emerald-900 text-emerald-300",
  in_shop: "bg-amber-900 text-amber-300",
  retired: "bg-gray-700 text-gray-400",
  on_duty: "bg-emerald-900 text-emerald-300",
  off_duty: "bg-gray-700 text-gray-400",
  on_trip: "bg-blue-900 text-blue-300",
  suspended: "bg-red-900 text-red-400",
  pending: "bg-amber-900 text-amber-300",
  in_progress: "bg-blue-900 text-blue-300",
  green: "bg-emerald-900 text-emerald-300",
  yellow: "bg-amber-900 text-amber-300",
  red: "bg-red-900 text-red-400",
};

export default function Badge({ value, label }) {
  const key = (value || "").toLowerCase().replace(" ", "_");
  const cls = variants[key] ?? "bg-gray-700 text-gray-300";
  const display = label ?? (value || "").replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${cls}`}
    >
      {display}
    </span>
  );
}
