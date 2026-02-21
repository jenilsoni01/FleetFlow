import { ApiError } from "../utils/ApiError.js";

export const validateVehicle = (req, res, next) => {
  const {
    license_plate,
    name,
    vehicle_type_id,
    max_load_kg,
    acquisition_date,
    acquisition_cost,
  } = req.body;

  if (!license_plate || !license_plate.trim()) {
    throw new ApiError(400, "License plate is required");
  }

  if (!name || !name.trim()) {
    throw new ApiError(400, "Vehicle name is required");
  }

  if (!vehicle_type_id) {
    throw new ApiError(400, "Vehicle type is required");
  }

  if (max_load_kg === undefined || max_load_kg === null) {
    throw new ApiError(400, "Max load capacity is required");
  }

  if (max_load_kg <= 0) {
    throw new ApiError(400, "Max load capacity must be greater than 0");
  }

  if (!acquisition_date) {
    throw new ApiError(400, "Acquisition date is required");
  }

  if (acquisition_cost === undefined || acquisition_cost === null) {
    throw new ApiError(400, "Acquisition cost is required");
  }

  if (acquisition_cost <= 0) {
    throw new ApiError(400, "Acquisition cost must be greater than 0");
  }

  const licensePlateRegex = /^[A-Z0-9-]{6,10}$/;
  if (!licensePlateRegex.test(license_plate.toUpperCase())) {
    throw new ApiError(
      400,
      "License plate must be 6-10 uppercase alphanumeric characters"
    );
  }

  next();
};

export const validateVehicleUpdate = (req, res, next) => {
  const { max_load_kg, current_odometer, acquisition_cost } = req.body;

  if (max_load_kg !== undefined && max_load_kg <= 0) {
    throw new ApiError(400, "Max load capacity must be greater than 0");
  }

  if (current_odometer !== undefined && current_odometer < 0) {
    throw new ApiError(400, "Odometer cannot be negative");
  }

  if (acquisition_cost !== undefined && acquisition_cost <= 0) {
    throw new ApiError(400, "Acquisition cost must be greater than 0");
  }

  next();
};