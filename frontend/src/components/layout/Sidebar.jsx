import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  DollarSign,
  BarChart2,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { NAV_ROLES, ROLE_META } from "../../config/roles";

const ALL_NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/trips", icon: Route, label: "Trips" },
  { to: "/vehicles", icon: Truck, label: "Vehicles" },
  { to: "/drivers", icon: Users, label: "Drivers" },
  { to: "/maintenance", icon: Wrench, label: "Maintenance" },
  { to: "/expenses", icon: DollarSign, label: "Expenses" },
  { to: "/analytics", icon: BarChart2, label: "Analytics" },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? "";
  const roleMeta = ROLE_META[role] ?? { label: role, color: "text-gray-400" };

  // Only show nav items the current role is allowed to visit
  const navItems = ALL_NAV_ITEMS.filter(
    ({ to }) => !NAV_ROLES[to] || NAV_ROLES[to].includes(role),
  );

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-52 bg-gray-900 border-r border-gray-800 flex flex-col z-30">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Truck size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            FleetFlow
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user?.userName?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-sm font-medium truncate">
              {user?.userName ?? "User"}
            </p>
            <p className={`text-xs truncate font-medium ${roleMeta.color}`}>
              {roleMeta.label}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
