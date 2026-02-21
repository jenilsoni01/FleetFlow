import mongoose from "mongoose";
import { MaintenanceLog } from "../models/maintenanceLog.model.js";
import { FleetVehicle } from "../models/fleetVehicle.model.js";
import { FleetTrip } from "../models/fleetTrip.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// ---------------------------------------------------------------------------
// Helper: apply side-effects when a maintenance log status changes
// ---------------------------------------------------------------------------
/**
 * Handles all vehicle-status and trip-cancellation side-effects driven by
 * the maintenance log status machine:
 *
 *   → in_progress : vehicle.status = "in_shop"
 *                   dispatched trips for that vehicle are cancelled
 *   → completed   : vehicle.status = "available"  (only if still "in_shop")
 *                   vehicle.current_odometer updated if log odometer > current
 *   → cancelled   : vehicle.status restored to log.previous_vehicle_status
 *                   (only if vehicle is still "in_shop", i.e. we set it)
 */
const applyStatusSideEffects = async ({
  log,
  vehicle,
  newStatus,
  previousStatus = null, // null on first create
  performedBy = null,
}) => {
  if (!vehicle) return;

  // Status hasn't changed – nothing to do
  if (previousStatus === newStatus) return;

  if (newStatus === "in_progress") {
    // ── Put vehicle in shop ──────────────────────────────────────────────────
    vehicle.status = "in_shop";
    vehicle.updated_by = performedBy;
    await vehicle.save({ validateBeforeSave: false });

    // ── Cancel all DISPATCHED trips for this vehicle ─────────────────────────
    // "dispatched" trips are assigned but not yet moving; cancelling prevents
    // the dispatcher from thinking a vehicle is on its way.
    await FleetTrip.updateMany(
      { "vehicle._id": vehicle._id, status: "dispatched" },
      {
        $set: {
          status: "cancelled",
          cancellation_reason: `Vehicle sent to maintenance shop: ${log.service_type.replace(/_/g, " ")}`,
          updated_by: performedBy,
        },
      },
    );
  } else if (newStatus === "completed") {
    // ── Release vehicle back to available ────────────────────────────────────
    if (vehicle.status === "in_shop") {
      vehicle.status = "available";
      vehicle.updated_by = performedBy;
    }

    // ── Advance odometer if the service reading is higher ───────────────────
    if (
      log.odometer_at_service &&
      log.odometer_at_service > vehicle.current_odometer
    ) {
      vehicle.current_odometer = log.odometer_at_service;
    }

    await vehicle.save({ validateBeforeSave: false });
  } else if (newStatus === "cancelled") {
    // ── Restore vehicle to the status it had before we moved it to in_shop ──
    // Only act if we were the ones who set it to in_shop (defensive check).
    if (vehicle.status === "in_shop") {
      vehicle.status = log.previous_vehicle_status || "available";
      vehicle.updated_by = performedBy;
      await vehicle.save({ validateBeforeSave: false });
    }
  }
};

// ---------------------------------------------------------------------------
// POST /api/maintenance  — Create a new maintenance log
// ---------------------------------------------------------------------------
export const createMaintenanceLog = asyncHandler(async (req, res) => {
  const {
    vehicle_id,
    service_type,
    description,
    scheduled_date,
    odometer_at_service,
    cost,
    service_provider,
    status = "scheduled",
    next_service_due_km,
    parts,
  } = req.body;

  // ── Validate vehicle_id ────────────────────────────────────────────────────
  if (!vehicle_id || !mongoose.isValidObjectId(vehicle_id)) {
    throw new ApiError(400, "A valid vehicle_id is required");
  }

  // ── Fetch and guard vehicle ────────────────────────────────────────────────
  const vehicle = await FleetVehicle.findById(vehicle_id);
  if (!vehicle) throw new ApiError(404, "Vehicle not found");
  if (!vehicle.active)
    throw new ApiError(
      400,
      "Cannot schedule maintenance for an inactive vehicle",
    );
  if (vehicle.status === "out_of_service")
    throw new ApiError(
      400,
      "Cannot schedule maintenance for a vehicle that is out of service",
    );

  // ── Build document ──────────────────────────────────────────────────────────
  const log = new MaintenanceLog({
    vehicle: {
      _id: vehicle._id,
      license_plate: vehicle.license_plate,
      name: vehicle.name,
    },
    service_type,
    description: description || "",
    dates: {
      scheduled: scheduled_date,
      start: status === "in_progress" ? new Date() : null,
      completion: status === "completed" ? new Date() : null,
    },
    odometer_at_service: odometer_at_service ?? vehicle.current_odometer,
    cost: cost ?? 0,
    service_provider: service_provider || "",
    // Save original vehicle status so cancel can restore it
    previous_vehicle_status: vehicle.status,
    status,
    next_service_due_km: next_service_due_km ?? 0,
    parts: parts || [],
    created_by: req.user?._id ?? null,
    updated_by: req.user?._id ?? null,
  });

  // Validate before applying side-effects (catches schema-level validators)
  await log.validate();
  await log.save();

  // ── Status side-effects ────────────────────────────────────────────────────
  await applyStatusSideEffects({
    log,
    vehicle,
    newStatus: status,
    previousStatus: null, // first save – treat every status as a "change"
    performedBy: req.user?._id ?? null,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, log, "Maintenance log created successfully"));
});

// ---------------------------------------------------------------------------
// GET /api/maintenance  — List logs (with optional filters)
// ---------------------------------------------------------------------------
export const getMaintenanceLogs = asyncHandler(async (req, res) => {
  const {
    vehicle_id,
    status,
    upcoming,
    overdue,
    page = 1,
    limit = 20,
  } = req.query;

  const match = { active: true };

  if (vehicle_id && mongoose.isValidObjectId(vehicle_id)) {
    match["vehicle._id"] = new mongoose.Types.ObjectId(vehicle_id);
  }

  if (status) {
    const allowed = ["scheduled", "in_progress", "completed", "cancelled"];
    const statuses = status
      .split(",")
      .map((s) => s.trim())
      .filter((s) => allowed.includes(s));
    if (statuses.length === 1) match.status = statuses[0];
    else if (statuses.length > 1) match.status = { $in: statuses };
  } else {
    // Default: show open jobs only (matches table-view default in spec)
    match.status = { $in: ["scheduled", "in_progress"] };
  }

  // "Upcoming services" quick action: next 7 days scheduled jobs
  if (upcoming === "true") {
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    match.status = "scheduled";
    match["dates.scheduled"] = { $lte: in7Days, $gte: new Date() };
  }

  // "Overdue maintenance" quick action: scheduled_date < today and still scheduled
  if (overdue === "true") {
    match.status = "scheduled";
    match["dates.scheduled"] = { $lt: new Date() };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    MaintenanceLog.find(match)
      .sort({ "dates.scheduled": 1 })
      .skip(skip)
      .limit(Number(limit)),
    MaintenanceLog.countDocuments(match),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { logs, total, page: Number(page), limit: Number(limit) },
        "Maintenance logs fetched successfully",
      ),
    );
});

// ---------------------------------------------------------------------------
// GET /api/maintenance/:id  — Get single log
// ---------------------------------------------------------------------------
export const getMaintenanceLogById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, "Invalid log id");
  }

  const log = await MaintenanceLog.findOne({
    _id: req.params.id,
    active: true,
  });

  if (!log) throw new ApiError(404, "Maintenance log not found");

  return res
    .status(200)
    .json(new ApiResponse(200, log, "Maintenance log fetched successfully"));
});

// ---------------------------------------------------------------------------
// PATCH /api/maintenance/:id  — Update a log (handles status transitions)
// ---------------------------------------------------------------------------
export const updateMaintenanceLog = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, "Invalid log id");
  }

  const log = await MaintenanceLog.findOne({
    _id: req.params.id,
    active: true,
  });
  if (!log) throw new ApiError(404, "Maintenance log not found");

  const previousStatus = log.status;

  const {
    status,
    service_type,
    description,
    scheduled_date,
    odometer_at_service,
    cost,
    service_provider,
    next_service_due_km,
    parts,
  } = req.body;

  const newStatus = status ?? previousStatus;

  // ── Apply scalar updates ───────────────────────────────────────────────────
  if (service_type !== undefined) log.service_type = service_type;
  if (description !== undefined) log.description = description;
  if (scheduled_date !== undefined)
    log.dates.scheduled = new Date(scheduled_date);
  if (odometer_at_service !== undefined)
    log.odometer_at_service = odometer_at_service;
  if (cost !== undefined) log.cost = cost;
  if (service_provider !== undefined) log.service_provider = service_provider;
  if (next_service_due_km !== undefined)
    log.next_service_due_km = next_service_due_km;
  if (parts !== undefined) log.parts = parts;

  // ── Auto-set dates on status transitions ──────────────────────────────────
  if (newStatus !== previousStatus) {
    if (newStatus === "in_progress" && !log.dates.start) {
      log.dates.start = new Date();
    }
    if (newStatus === "completed" && !log.dates.completion) {
      log.dates.completion = new Date();
    }
  }

  log.status = newStatus;
  log.updated_by = req.user?._id ?? null;

  // Save first — if schema validation fails (e.g. cost > 0 required when completed),
  // we never touch the vehicle, keeping DB state consistent.
  await log.save();

  // Fetch vehicle for side-effects (use snapshot _id)
  const vehicle = await FleetVehicle.findById(log.vehicle._id);

  // ── Status side-effects ────────────────────────────────────────────────────
  await applyStatusSideEffects({
    log,
    vehicle,
    newStatus,
    previousStatus,
    performedBy: req.user?._id ?? null,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, log, "Maintenance log updated successfully"));
});

// ---------------------------------------------------------------------------
// DELETE /api/maintenance/:id  — Soft-delete (active = false)
// ---------------------------------------------------------------------------
export const deleteMaintenanceLog = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, "Invalid log id");
  }

  const log = await MaintenanceLog.findOne({
    _id: req.params.id,
    active: true,
  });
  if (!log) throw new ApiError(404, "Maintenance log not found");

  // Prevent deletion of in-progress jobs — complete or cancel them first
  if (log.status === "in_progress") {
    throw new ApiError(
      400,
      "Cannot delete an in-progress maintenance log. Complete or cancel it first.",
    );
  }

  log.active = false;
  log.updated_by = req.user?._id ?? null;
  await log.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Maintenance log deleted successfully"));
});
