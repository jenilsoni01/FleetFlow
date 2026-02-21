import api from "./api";

export const getVehicles = (params) =>
  api.get("/vehicles", { params }).then((r) => r.data.data);

export const getVehicle = (id) =>
  api.get(`/vehicles/${id}`).then((r) => r.data.data);

export const createVehicle = (data) =>
  api.post("/vehicles", data).then((r) => r.data.data);

export const updateVehicle = (id, data) =>
  api.patch(`/vehicles/${id}`, data).then((r) => r.data.data);

export const deleteVehicle = (id) =>
  api.delete(`/vehicles/${id}`).then((r) => r.data);

export const retireVehicle = (id) =>
  api.patch(`/vehicles/retire/${id}`).then((r) => r.data.data);
