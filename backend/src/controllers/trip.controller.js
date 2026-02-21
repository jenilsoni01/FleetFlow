import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { FleetTrip } from "../models/fleetTrip.model.js";
import { FleetVehicle } from "../models/fleetVehicle.model.js";
import { FleetDriver } from "../models/fleetDriver.model.js";

// CREATE TRIP
export const createTrip = asyncHandler(async (req, res) => {
  const {
    vehicle_id,
    driver_id,
    origin,
    destination,
    cargo_description,
    cargo_weight_kg,
    scheduled_departure,
    estimated_arrival,
    priority,
    notes,
  } = req.body;

  // Validate vehicle exists and is available
  const vehicle = await FleetVehicle.findById(vehicle_id);
  if (!vehicle || !vehicle.active) {
    throw new ApiError(404, "Vehicle not found or inactive");
  }

  if (vehicle.status !== "available") {
    throw new ApiError(
      400,
      `Vehicle is not available (current status: ${vehicle.status})`,
    );
  }

  // Check cargo weight against vehicle capacity
  if (cargo_weight_kg && cargo_weight_kg > vehicle.max_load_kg) {
    throw new ApiError(
      400,
      `Cargo weight (${cargo_weight_kg}kg) exceeds vehicle max load capacity (${vehicle.max_load_kg}kg)`,
    );
  }

  // Prepare trip data with vehicle snapshot
  const tripData = {
    origin,
    destination,
    cargo: {
      description: cargo_description || "",
      weight_kg: cargo_weight_kg || 0,
    },
    schedule: {
      scheduled_departure: scheduled_departure || null,
      estimated_arrival: estimated_arrival || null,
    },
    priority: priority || "medium",
    vehicle: {
      _id: vehicle._id,
      license_plate: vehicle.license_plate,
      name: vehicle.name,
      vehicle_type_id: vehicle.vehicle_type._id,
    },
    region: {
      _id: vehicle.region._id || null,
      name: vehicle.region.name || "",
      code: vehicle.region.code || "",
    },
    status: "draft",
    created_by: req.user?._id,
  };

  // Optionally add driver snapshot if provided
  if (driver_id) {
    const driver = await FleetDriver.findById(driver_id);
    if (!driver || !driver.active) {
      throw new ApiError(404, "Driver not found or inactive");
    }

    // Check driver availability
    if (driver.status === "on_trip") {
      throw new ApiError(400, "Driver is already on a trip");
    }

    if (driver.status === "suspended") {
      throw new ApiError(400, "Driver is suspended");
    }

    // Check license expiry
    if (driver.license_expiry && driver.license_expiry < new Date()) {
      throw new ApiError(400, "Driver's license has expired");
    }

    // Check if driver has required license for vehicle type
    if (
      vehicle.vehicle_type.required_license_category &&
      driver.license_category !== vehicle.vehicle_type.required_license_category
    ) {
      throw new ApiError(
        400,
        `Driver license category (${driver.license_category}) does not match vehicle requirement (${vehicle.vehicle_type.required_license_category})`,
      );
    }

    tripData.driver = {
      _id: driver._id,
      name: driver.name,
      employee_id: driver.employee_id,
    };
  }

  // Set odometer start from vehicle's current odometer
  tripData.odometer = {
    start: vehicle.current_odometer,
    end: 0,
  };

  // Create trip
  const trip = await FleetTrip.create(tripData);

  return res
    .status(201)
    .json(new ApiResponse(201, trip, "Trip created successfully"));
});

// GET ALL TRIPS
export const getTrips = asyncHandler(async (req, res) => {
  const { status, vehicle_id, driver_id, region_id, priority, active } =
    req.query;

  const filter = {};
  if (status) filter.status = status;
  if (vehicle_id) filter["vehicle._id"] = vehicle_id;
  if (driver_id) filter["driver._id"] = driver_id;
  if (region_id) filter["region._id"] = region_id;
  if (priority) filter.priority = priority;
  if (active !== undefined) filter.active = active === "true";

  const trips = await FleetTrip.find(filter).sort({ created_at: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, trips, "Trips retrieved successfully"));
});

// GET SINGLE TRIP
export const getTrip = asyncHandler(async (req, res) => {
  const trip = await FleetTrip.findById(req.params.id);

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, trip, "Trip retrieved successfully"));
});

// UPDATE TRIP
export const updateTrip = asyncHandler(async (req, res) => {
  const trip = await FleetTrip.findById(req.params.id);

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  const {
    origin,
    destination,
    cargo_description,
    cargo_weight_kg,
    scheduled_departure,
    estimated_arrival,
    priority,
    notes,
  } = req.body;

  // Update fields if provided
  if (origin !== undefined) trip.origin = origin;
  if (destination !== undefined) trip.destination = destination;
  if (cargo_description !== undefined)
    trip.cargo.description = cargo_description;
  if (cargo_weight_kg !== undefined) {
    // Validate against vehicle capacity
    if (cargo_weight_kg > trip.vehicle.max_load_kg) {
      throw new ApiError(400, "Cargo weight exceeds vehicle capacity");
    }
    trip.cargo.weight_kg = cargo_weight_kg;
  }
  if (scheduled_departure !== undefined)
    trip.schedule.scheduled_departure = scheduled_departure;
  if (estimated_arrival !== undefined)
    trip.schedule.estimated_arrival = estimated_arrival;
  if (priority !== undefined) trip.priority = priority;

  trip.updated_by = req.user?._id;
  await trip.save();

  return res
    .status(200)
    .json(new ApiResponse(200, trip, "Trip updated successfully"));
});

// DISPATCH TRIP
export const dispatchTrip = asyncHandler(async (req, res) => {
  const trip = await FleetTrip.findById(req.params.id);

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  if (trip.status !== "draft") {
    throw new ApiError(400, `Cannot dispatch trip with status: ${trip.status}`);
  }

  if (!trip.driver._id) {
    throw new ApiError(400, "Cannot dispatch trip without a driver");
  }

  // Update vehicle status
  const vehicle = await FleetVehicle.findById(trip.vehicle._id);
  if (!vehicle || vehicle.status !== "available") {
    throw new ApiError(400, "Vehicle is not available for dispatch");
  }

  // Update driver status
  const driver = await FleetDriver.findById(trip.driver._id);
  if (!driver || !["on_duty", "off_duty"].includes(driver.status)) {
    throw new ApiError(400, "Driver is not available for dispatch");
  }

  // Update statuses
  vehicle.status = "on_trip";
  vehicle.updated_by = req.user?._id;
  await vehicle.save();

  driver.status = "on_trip";
  driver.updated_by = req.user?._id;
  await driver.save();

  trip.status = "dispatched";
  trip.schedule.actual_departure = new Date();
  trip.updated_by = req.user?._id;
  await trip.save();

  return res
    .status(200)
    .json(new ApiResponse(200, trip, "Trip dispatched successfully"));
});

// START TRIP (move from dispatched to in_transit)
export const startTrip = asyncHandler(async (req, res) => {
  const trip = await FleetTrip.findById(req.params.id);

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  if (trip.status !== "dispatched") {
    throw new ApiError(400, `Cannot start trip with status: ${trip.status}`);
  }

  trip.status = "in_transit";
  if (!trip.schedule.actual_departure) {
    trip.schedule.actual_departure = new Date();
  }
  trip.updated_by = req.user?._id;
  await trip.save();

  return res
    .status(200)
    .json(new ApiResponse(200, trip, "Trip started successfully"));
});

// COMPLETE TRIP
export const completeTrip = asyncHandler(async (req, res) => {
  const { odometer_end } = req.body;

  const trip = await FleetTrip.findById(req.params.id);

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  if (!["dispatched", "in_transit"].includes(trip.status)) {
    throw new ApiError(400, `Cannot complete trip with status: ${trip.status}`);
  }

  // Validate odometer reading
  if (!odometer_end || odometer_end < trip.odometer.start) {
    throw new ApiError(
      400,
      `End odometer (${odometer_end}) must be greater than start odometer (${trip.odometer.start})`,
    );
  }

  // Update vehicle
  const vehicle = await FleetVehicle.findById(trip.vehicle._id);
  if (vehicle) {
    vehicle.status = "available";
    vehicle.current_odometer = odometer_end;
    vehicle.updated_by = req.user?._id;
    await vehicle.save();
  }

  // Update driver
  if (trip.driver._id) {
    const driver = await FleetDriver.findById(trip.driver._id);
    if (driver) {
      driver.status = "on_duty";
      driver.updated_by = req.user?._id;
      await driver.save();
    }
  }

  // Update trip
  trip.status = "completed";
  trip.odometer.end = odometer_end;
  trip.schedule.actual_arrival = new Date();
  trip.updated_by = req.user?._id;
  await trip.save();

  return res
    .status(200)
    .json(new ApiResponse(200, trip, "Trip completed successfully"));
});

// CANCEL TRIP
export const cancelTrip = asyncHandler(async (req, res) => {
  const { cancellation_reason } = req.body;

  const trip = await FleetTrip.findById(req.params.id);

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  if (trip.status === "completed") {
    throw new ApiError(400, "Cannot cancel a completed trip");
  }

  if (trip.status === "cancelled") {
    throw new ApiError(400, "Trip is already cancelled");
  }

  if (!cancellation_reason || !cancellation_reason.trim()) {
    throw new ApiError(400, "Cancellation reason is required");
  }

  // If trip was dispatched or in transit, free up vehicle and driver
  if (["dispatched", "in_transit"].includes(trip.status)) {
    const vehicle = await FleetVehicle.findById(trip.vehicle._id);
    if (vehicle && vehicle.status === "on_trip") {
      vehicle.status = "available";
      vehicle.updated_by = req.user?._id;
      await vehicle.save();
    }

    if (trip.driver._id) {
      const driver = await FleetDriver.findById(trip.driver._id);
      if (driver && driver.status === "on_trip") {
        driver.status = "on_duty";
        driver.updated_by = req.user?._id;
        await driver.save();
      }
    }
  }

  trip.status = "cancelled";
  trip.cancellation_reason = cancellation_reason;
  trip.updated_by = req.user?._id;
  await trip.save();

  return res
    .status(200)
    .json(new ApiResponse(200, trip, "Trip cancelled successfully"));
});

// ADD EXPENSE TO TRIP
export const addExpense = asyncHandler(async (req, res) => {
  const trip = await FleetTrip.findOne({ _id: req.params.id, active: true });

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  const addableStatuses = ["draft", "dispatched", "in_transit"];
  if (!addableStatuses.includes(trip.status)) {
    throw new ApiError(
      400,
      `Cannot add expenses to a trip with status "${trip.status}". Trip must be draft, dispatched, or in transit.`,
    );
  }

  const {
    expense_type,
    amount,
    expense_date,
    fuel_quantity,
    fuel_unit_price,
    fuel_type,
    station_name,
    odometer_reading,
    notes,
  } = req.body;

  if (!expense_type || !amount) {
    throw new ApiError(400, "Expense type and amount are required");
  }

  const expenseData = {
    expense_type,
    amount: Number(amount),
    expense_date: expense_date || new Date(),
    notes: notes || "",
    active: true,
    created_by: req.user?._id,
  };

  if (expense_type === "fuel") {
    if (!fuel_quantity || Number(fuel_quantity) <= 0 || !fuel_type) {
      throw new ApiError(
        400,
        "Fuel quantity (> 0) and fuel type are required for fuel expenses",
      );
    }
    expenseData.fuel_details = {
      quantity: Number(fuel_quantity),
      unit_price: fuel_unit_price ? Number(fuel_unit_price) : 0,
      fuel_type,
      station_name: station_name || "",
      odometer_reading: odometer_reading ? Number(odometer_reading) : 0,
    };
  }

  trip.expenses.push(expenseData);
  trip.updated_by = req.user?._id;
  await trip.save();

  const newExpense = trip.expenses[trip.expenses.length - 1];

  return res
    .status(201)
    .json(new ApiResponse(201, newExpense, "Expense added successfully"));
});

// GET TRIP EXPENSES
export const getTripExpenses = asyncHandler(async (req, res) => {
  const trip = await FleetTrip.findOne({ _id: req.params.id, active: true });

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  const activeExpenses = trip.expenses.filter((exp) => exp.active !== false);

  return res
    .status(200)
    .json(
      new ApiResponse(200, activeExpenses, "Expenses retrieved successfully"),
    );
});

// DELETE (SOFT) A SINGLE EXPENSE
export const deleteExpense = asyncHandler(async (req, res) => {
  const { id, expId } = req.params;
  const trip = await FleetTrip.findOne({ _id: id, active: true });

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  const expense = trip.expenses.id(expId);
  if (!expense || expense.active === false) {
    throw new ApiError(404, "Expense not found");
  }

  expense.active = false;
  trip.updated_by = req.user?._id;
  await trip.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Expense deleted successfully"));
});
