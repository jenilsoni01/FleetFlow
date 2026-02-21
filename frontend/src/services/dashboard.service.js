import api from "./api";

export const getDashboardSummary = (params) =>
  api.get("/dashboard/summary", { params }).then((r) => r.data.data);
