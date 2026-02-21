import React from "react";

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "indigo",
  trend,
}) {
  const colors = {
    indigo: "bg-indigo-500/10 text-indigo-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    red: "bg-red-500/10 text-red-400",
    blue: "bg-blue-500/10 text-blue-400",
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-start gap-4 hover:border-gray-700 transition-colors">
      {Icon && (
        <div
          className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}
        >
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-gray-400 text-sm mb-1 truncate">{title}</p>
        <p className="text-white text-2xl font-bold leading-tight">
          {value ?? "—"}
        </p>
        {subtitle && (
          <p className="text-gray-500 text-xs mt-1 truncate">{subtitle}</p>
        )}
      </div>
      {trend != null && (
        <span
          className={`text-xs font-medium shrink-0 ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}
        >
          {trend >= 0 ? "+" : ""}
          {trend}%
        </span>
      )}
    </div>
  );
}
