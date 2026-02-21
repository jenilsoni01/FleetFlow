import api from "./api.js";

export const getVehicleTypes = () =>
  api.get("/meta/vehicle-types").then((r) => r.data.data);

export const getRegions = () =>
  api.get("/meta/regions").then((r) => r.data.data);
