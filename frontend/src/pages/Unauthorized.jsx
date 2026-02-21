import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldOff, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLE_META } from "../config/roles";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const meta = ROLE_META[user?.role] ?? {
    label: user?.role ?? "Unknown",
    color: "text-gray-400",
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-red-900/30 border border-red-800 flex items-center justify-center mb-6">
        <ShieldOff size={36} className="text-red-400" />
      </div>
      <h1 className="text-white text-3xl font-bold mb-2">Access Denied</h1>
      <p className="text-gray-500 text-sm mb-1">
        Your role{" "}
        <span className={`font-semibold ${meta.color}`}>{meta.label}</span> does
        not have permission to view this page.
      </p>
      <p className="text-gray-600 text-sm mb-8">
        Contact your administrator if you believe this is a mistake.
      </p>
      <button
        onClick={() => navigate("/dashboard", { replace: true })}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>
    </div>
  );
}
