import api from "./api";

export const getDrivers = (params) =>
  api.get("/drivers", { params }).then((r) => r.data.data);

export const getDriver = (id) =>
  api.get(`/drivers/${id}`).then((r) => r.data.data);

export const createDriver = (data) =>
  api.post("/drivers", data).then((r) => r.data.data);

export const updateDriver = (id, data) =>
  api.patch(`/drivers/${id}`, data).then((r) => r.data.data);

export const deleteDriver = (id) =>
  api.delete(`/drivers/${id}`).then((r) => r.data);

export const updateDriverStatus = (id, status) =>
  api.patch(`/drivers/${id}/status`, { status }).then((r) => r.data.data);

export const suspendDriver = (id, reason) =>
  api.patch(`/drivers/${id}/suspend`, { reason }).then((r) => r.data.data);

export const getDriverPerformance = (id) =>
  api.get(`/drivers/${id}/performance`).then((r) => r.data.data);

export const addTrainingRecord = (id, data) =>
  api.post(`/drivers/${id}/training`, data).then((r) => r.data.data);
