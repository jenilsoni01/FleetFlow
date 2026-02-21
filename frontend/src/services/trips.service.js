import api from "./api";

export const getTrips = (params) =>
  api.get("/trips", { params }).then((r) => r.data.data);

export const getTrip = (id) => api.get(`/trips/${id}`).then((r) => r.data.data);

export const createTrip = (data) =>
  api.post("/trips", data).then((r) => r.data.data);

export const updateTrip = (id, data) =>
  api.patch(`/trips/${id}`, data).then((r) => r.data.data);

export const dispatchTrip = (id, data) =>
  api.patch(`/trips/dispatch/${id}`, data).then((r) => r.data.data);

export const startTrip = (id, data) =>
  api.patch(`/trips/start/${id}`, data).then((r) => r.data.data);

export const completeTrip = (id, data) =>
  api.patch(`/trips/complete/${id}`, data).then((r) => r.data.data);

export const cancelTrip = (id, data) =>
  api.patch(`/trips/cancel/${id}`, data).then((r) => r.data.data);

export const addExpense = (id, data) =>
  api.post(`/trips/${id}/expenses`, data).then((r) => r.data.data);

export const getTripExpenses = (id) =>
  api.get(`/trips/${id}/expenses`).then((r) => r.data.data);
