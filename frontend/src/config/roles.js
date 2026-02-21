export const ROLES = {
  MANAGER: "MANAGER",
  DISPATCHER: "DISPATCHER",
  SAFETY_OFFICER: "SAFETY_OFFICER",
  FINANCIAL_ANALYST: "FINANCIAL_ANALYST",
};

export const ROLE_META = {
  MANAGER: { label: "Manager", color: "text-indigo-400" },
  DISPATCHER: { label: "Dispatcher", color: "text-blue-400" },
  SAFETY_OFFICER: { label: "Safety Officer", color: "text-amber-400" },
  FINANCIAL_ANALYST: { label: "Finance Analyst", color: "text-emerald-400" },
};

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

export const DASHBOARD_SECTIONS = {
  fleet_overview: ["MANAGER", "DISPATCHER"],
  trip_activity: ["MANAGER", "DISPATCHER", "FINANCIAL_ANALYST"],
  drivers: ["MANAGER", "DISPATCHER", "SAFETY_OFFICER"],
  maintenance: ["MANAGER", "SAFETY_OFFICER"],
};

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


export function can(role, permMap, key) {
  if (!role || !permMap[key]) return false;
  return permMap[key].includes(role);
}
