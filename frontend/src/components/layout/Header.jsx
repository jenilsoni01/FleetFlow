import React from "react";
import { useAuth } from "../../context/AuthContext";

export default function Header({ title }) {
  const { user } = useAuth();
  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="text-white font-semibold text-lg">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
            {user?.userName?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="hidden sm:block">
            <p className="text-white font-medium leading-tight">
              {user?.userName}
            </p>
            <p className="text-gray-500 text-xs leading-tight">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
