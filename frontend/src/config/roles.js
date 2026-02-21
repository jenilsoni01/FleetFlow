/**
 * Role-Based Access Control (RBAC) Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Roles    : MANAGER | DISPATCHER | SAFETY_OFFICER | FINANCIAL_ANALYST
 * Usage:
 *   import { ROLES, can, ROUTE_ROLES, DASHBOARD_SECTIONS } from "../config/roles";
 */

export const ROLES = {
  MANAGER: "MANAGER",
  DISPATCHER: "DISPATCHER",
  SAFETY_OFFICER: "SAFETY_OFFICER",
  FINANCIAL_ANALYST: "FINANCIAL_ANALYST",
};

// ── Human-readable label + badge colour per role ──────────────────────────────
export const ROLE_META = {
  MANAGER: { label: "Manager", color: "text-indigo-400" },
  DISPATCHER: { label: "Dispatcher", color: "text-blue-400" },
  SAFETY_OFFICER: { label: "Safety Officer", color: "text-amber-400" },
  FINANCIAL_ANALYST: { label: "Finance Analyst", color: "text-emerald-400" },
};

// ── Which roles may access each page ─────────────────────────────────────────
export const ROUTE_ROLES = {
  "/dashboard": [
    "MANAGER",
    "DISPATCHER",
    "SAFETY_OFFICER",
    "FINANCIAL_ANALYST",
  ],
  "/trips": ["MANAGER", "DISPATCHER", "FINANCIAL_ANALYST"],
  "/trips/:id": ["MANAGER", "DISPATCHER", "FINANCIAL_ANALYST"],
  "/vehicles": ["MANAGER", "DISPATCHER"],
  "/drivers": ["MANAGER", "DISPATCHER", "SAFETY_OFFICER"],
  "/maintenance": ["MANAGER", "SAFETY_OFFICER"],
  "/expenses": ["MANAGER", "FINANCIAL_ANALYST"],
  "/analytics": ["MANAGER", "FINANCIAL_ANALYST"],
};

// ── Dashboard sections visible per role ──────────────────────────────────────
export const DASHBOARD_SECTIONS = {
  fleet_overview: ["MANAGER", "DISPATCHER"],
  trip_activity: ["MANAGER", "DISPATCHER", "FINANCIAL_ANALYST"],
  drivers: ["MANAGER", "DISPATCHER", "SAFETY_OFFICER"],
  maintenance: ["MANAGER", "SAFETY_OFFICER"],
};

// ── Sidebar nav visibility per role ──────────────────────────────────────────
export const NAV_ROLES = {
  "/dashboard": [
    "MANAGER",
    "DISPATCHER",
    "SAFETY_OFFICER",
    "FINANCIAL_ANALYST",
  ],
  "/trips": ["MANAGER", "DISPATCHER", "FINANCIAL_ANALYST"],
  "/vehicles": ["MANAGER", "DISPATCHER"],
  "/drivers": ["MANAGER", "DISPATCHER", "SAFETY_OFFICER"],
  "/maintenance": ["MANAGER", "SAFETY_OFFICER"],
  "/expenses": ["MANAGER", "FINANCIAL_ANALYST"],
  "/analytics": ["MANAGER", "FINANCIAL_ANALYST"],
};

/**
 * Returns true if the given role is allowed access to the given key.
 * Works with ROUTE_ROLES, DASHBOARD_SECTIONS, or NAV_ROLES.
 *
 *   can("MANAGER", DASHBOARD_SECTIONS, "fleet_overview")  → true
 *   can("DISPATCHER", ROUTE_ROLES, "/expenses")           → false
 */
export function can(role, permMap, key) {
  if (!role || !permMap[key]) return false;
  return permMap[key].includes(role);
}
