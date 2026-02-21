import api from "./api";

export const getMaintenanceLogs = (params) =>
  api.get("/maintenance", { params }).then((r) => r.data.data);

export const getMaintenanceLog = (id) =>
  api.get(`/maintenance/${id}`).then((r) => r.data.data);

export const createMaintenanceLog = (data) =>
  api.post("/maintenance", data).then((r) => r.data.data);

export const updateMaintenanceLog = (id, data) =>
  api.patch(`/maintenance/${id}`, data).then((r) => r.data.data);

export const deleteMaintenanceLog = (id) =>
  api.delete(`/maintenance/${id}`).then((r) => r.data);
