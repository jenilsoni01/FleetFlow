import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({
  icon: Icon = Inbox,
  title = "No data",
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
        <Icon size={24} className="text-gray-600" />
      </div>
      <h3 className="text-gray-300 font-medium text-base mb-1">{title}</h3>
      {description && (
        <p className="text-gray-500 text-sm mb-4 max-w-xs">{description}</p>
      )}
      {action && action}
    </div>
  );
}
