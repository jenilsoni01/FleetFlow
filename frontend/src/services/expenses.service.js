import api from "./api";

export const listExpenses = (params) =>
  api.get("/expenses", { params }).then((r) => r.data.data);

export const getVehicleOperationalCost = (vehicleId, params) =>
  api
    .get(`/expenses/summary/vehicle/${vehicleId}`, { params })
    .then((r) => r.data.data);

export const getMonthlyBurnRate = (params) =>
  api.get("/expenses/summary/monthly", { params }).then((r) => r.data.data);

export const getVehicleFuelEfficiency = (vehicleId) =>
  api.get(`/expenses/fuel-efficiency/${vehicleId}`).then((r) => r.data.data);
