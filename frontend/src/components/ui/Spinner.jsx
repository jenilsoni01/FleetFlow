import React from "react";

export default function Spinner({ size = 6, className = "" }) {
  return (
    <div
      className={`w-${size} h-${size} border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin ${className}`}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-64">
      <Spinner size={8} />
    </div>
  );
}
