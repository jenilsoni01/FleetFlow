import { FleetVehicle } from "../models/fleetVehicle.model.js";
import { VehicleType } from "../models/vehicleType.model.js";
import { Region } from "../models/region.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// CREATE VEHICLE
export const createVehicle = asyncHandler(async (req, res) => {
  const {
    license_plate,
    name,
    vehicle_type_id,
    max_load_kg,
    current_odometer,
    acquisition_date,
    acquisition_cost,
    status,
    region_id,
    notes,
  } = req.body;

  const vehicleType = await VehicleType.findById(vehicle_type_id);
  if (!vehicleType || !vehicleType.active) {
    throw new ApiError(404, "Vehicle type not found or inactive");
  }

  const vehicleData = {
    license_plate,
    name,
    vehicle_type: {
      _id: vehicleType._id,
      name: vehicleType.name,
      required_license_category: vehicleType.required_license_category,
    },
    max_load_kg,
    current_odometer: current_odometer || 0,
    acquisition_date,
    acquisition_cost,
    status: status || "available",
    notes: notes || "",
    created_by: req.user?._id,
  };

  if (region_id) {
    const region = await Region.findById(region_id);
    if (!region || !region.active) {
      throw new ApiError(404, "Region not found or inactive");
    }
    vehicleData.region = {
      _id: region._id,
      name: region.name,
      code: region.code,
    };
  }

  const vehicle = await FleetVehicle.create(vehicleData);

  return res
    .status(201)
    .json(new ApiResponse(201, vehicle, "Vehicle created successfully"));
});

// GET ALL VEHICLES
export const getVehicles = asyncHandler(async (req, res) => {
  const { status, region_id, vehicle_type_id, active } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (region_id) filter["region._id"] = region_id;
  if (vehicle_type_id) filter["vehicle_type._id"] = vehicle_type_id;
  if (active !== undefined) filter.active = active === "true";

  const vehicles = await FleetVehicle.find(filter).sort({ created_at: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(200, vehicles, "Vehicles retrieved successfully")
    );
});

// GET SINGLE VEHICLE
export const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await FleetVehicle.findById(req.params.id);

  if (!vehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, vehicle, "Vehicle retrieved successfully"));
});

// UPDATE VEHICLE
export const updateVehicle = asyncHandler(async (req, res) => {
  const {
    name,
    vehicle_type_id,
    max_load_kg,
    current_odometer,
    acquisition_date,
    acquisition_cost,
    status,
    region_id,
    notes,
    active,
  } = req.body;

  const vehicle = await FleetVehicle.findById(req.params.id);
  if (!vehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  if (name !== undefined) vehicle.name = name;
  if (max_load_kg !== undefined) vehicle.max_load_kg = max_load_kg;
  if (current_odometer !== undefined) vehicle.current_odometer = current_odometer;
  if (acquisition_date !== undefined) vehicle.acquisition_date = acquisition_date;
  if (acquisition_cost !== undefined) vehicle.acquisition_cost = acquisition_cost;
  if (status !== undefined) vehicle.status = status;
  if (notes !== undefined) vehicle.notes = notes;
  if (active !== undefined) vehicle.active = active;

  if (vehicle_type_id && vehicle_type_id !== vehicle.vehicle_type._id.toString()) {
    const vehicleType = await VehicleType.findById(vehicle_type_id);
    if (!vehicleType || !vehicleType.active) {
      throw new ApiError(404, "Vehicle type not found or inactive");
    }
    vehicle.vehicle_type = {
      _id: vehicleType._id,
      name: vehicleType.name,
      required_license_category: vehicleType.required_license_category,
    };
  }

  if (region_id !== undefined) {
    if (region_id) {
      const region = await Region.findById(region_id);
      if (!region || !region.active) {
        throw new ApiError(404, "Region not found or inactive");
      }
      vehicle.region = {
        _id: region._id,
        name: region.name,
        code: region.code,
      };
    } else {
      vehicle.region = { _id: null, name: "", code: "" };
    }
  }

  vehicle.updated_by = req.user?._id;
  await vehicle.save();

  return res
    .status(200)
    .json(new ApiResponse(200, vehicle, "Vehicle updated successfully"));
});

// DELETE VEHICLE (Soft delete)
export const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await FleetVehicle.findById(req.params.id);

  if (!vehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  vehicle.active = false;
  vehicle.updated_by = req.user?._id;
  await vehicle.save();

  return res
    .status(200)
    .json(new ApiResponse(200, vehicle, "Vehicle deleted successfully"));
});

// RETIRE VEHICLE
export const retireVehicle = asyncHandler(async (req, res) => {
  const vehicle = await FleetVehicle.findById(req.params.id);

  if (!vehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  vehicle.status = "out_of_service";
  vehicle.updated_by = req.user?._id;
  await vehicle.save();

  return res
    .status(200)
    .json(new ApiResponse(200, vehicle, "Vehicle retired successfully"));
});