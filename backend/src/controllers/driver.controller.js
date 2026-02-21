import mongoose from "mongoose";
import { FleetDriver } from "../models/fleetDriver.model.js";
import { SafetyIncident } from "../models/safetyIncident.model.js";
import { FleetTrip } from "../models/fleetTrip.model.js";
import { Region } from "../models/region.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// POST /api/drivers  — Create a new driver
export const createDriver = asyncHandler(async (req, res) => {
  const {
    name,
    employee_id,
    license_number,
    license_category,
    license_expiry,
    date_of_joining,
    status,
    region_id,
    contact,
    medical_cert_expiry,
  } = req.body;

  if (
    !name ||
    !employee_id ||
    !license_number ||
    !license_category ||
    !license_expiry ||
    !date_of_joining
  ) {
    throw new ApiError(
      400,
      "name, employee_id, license_number, license_category, license_expiry, and date_of_joining are required",
    );
  }

  const existing = await FleetDriver.findOne({
    $or: [
      { employee_id: employee_id.toUpperCase() },
      { license_number: license_number.toUpperCase() },
    ],
  });
  if (existing) {
    if (existing.employee_id === employee_id.toUpperCase()) {
      throw new ApiError(409, `Employee ID '${employee_id}' is already in use`);
    }
    throw new ApiError(
      409,
      `License number '${license_number}' is already in use`,
    );
  }

  const driverData = {
    name,
    employee_id,
    license_number,
    license_category,
    license_expiry: new Date(license_expiry),
    date_of_joining: new Date(date_of_joining),
    status: status || "off_duty",
    contact: contact || {},
    medical_cert_expiry: medical_cert_expiry
      ? new Date(medical_cert_expiry)
      : null,
    created_by: req.user?._id ?? null,
    updated_by: req.user?._id ?? null,
  };

  if (region_id && mongoose.isValidObjectId(region_id)) {
    const region = await Region.findById(region_id);
    if (region) {
      driverData.region = {
        _id: region._id,
        name: region.name,
        code: region.code,
      };
    }
  }

  const driver = await FleetDriver.create(driverData);

  return res
    .status(201)
    .json(new ApiResponse(201, driver, "Driver created successfully"));
});

export const getDrivers = asyncHandler(async (req, res) => {
  const {
    status,
    region_id,
    license_category,
    compliance,
    expiring,
    page = 1,
    limit = 20,
  } = req.query;

  const match = { active: true };

  if (status) match.status = status;
  if (license_category) match.license_category = license_category;
  if (region_id && mongoose.isValidObjectId(region_id)) {
    match["region._id"] = new mongoose.Types.ObjectId(region_id);
  }

  const now = new Date();

  if (compliance === "expired") {
    match.license_expiry = { $lt: now };
  }
  if (compliance === "valid") {
    match.license_expiry = { $gte: now };
  }

  if (expiring) {
    const days = Number(expiring);
    if (!isNaN(days) && days > 0) {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() + days);
      match.license_expiry = { $gte: now, $lte: cutoff };
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [drivers, total] = await Promise.all([
    FleetDriver.find(match).sort({ name: 1 }).skip(skip).limit(Number(limit)),
    FleetDriver.countDocuments(match),
  ]);

  const enriched = drivers.map((d) => {
    const doc = d.toObject();
    const daysUntilExpiry = Math.ceil(
      (d.license_expiry - now) / (1000 * 60 * 60 * 24),
    );
    doc.license_days_remaining = daysUntilExpiry;
    doc.compliance_status =
      d.license_expiry < now || d.status === "suspended" ? "blocked" : "valid";
    doc.license_expiry_warning = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
    return doc;
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { drivers: enriched, total, page: Number(page), limit: Number(limit) },
        "Drivers fetched successfully",
      ),
    );
});

// GET /api/drivers/:id  
export const getDriver = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, "Invalid driver id");
  }

  const driver = await FleetDriver.findOne({
    _id: req.params.id,
    active: true,
  });
  if (!driver) throw new ApiError(404, "Driver not found");

  const now = new Date();
  const doc = driver.toObject();
  const daysUntilExpiry = Math.ceil(
    (driver.license_expiry - now) / (1000 * 60 * 60 * 24),
  );
  doc.license_days_remaining = daysUntilExpiry;
  doc.compliance_status =
    driver.license_expiry < now || driver.status === "suspended"
      ? "blocked"
      : "valid";
  doc.license_expiry_warning = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

  return res
    .status(200)
    .json(new ApiResponse(200, doc, "Driver fetched successfully"));
});

// PATCH /api/drivers/:id  — Update driver fields
export const updateDriver = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, "Invalid driver id");
  }

  const driver = await FleetDriver.findOne({
    _id: req.params.id,
    active: true,
  });
  if (!driver) throw new ApiError(404, "Driver not found");

  const {
    name,
    license_number,
    license_category,
    license_expiry,
    date_of_joining,
    region_id,
    contact,
    medical_cert_expiry,
    next_service_due_km,
  } = req.body;

  if (name !== undefined) driver.name = name;
  if (license_number !== undefined) driver.license_number = license_number;
  if (license_category !== undefined)
    driver.license_category = license_category;
  if (license_expiry !== undefined)
    driver.license_expiry = new Date(license_expiry);
  if (date_of_joining !== undefined)
    driver.date_of_joining = new Date(date_of_joining);
  if (contact !== undefined) driver.contact = { ...driver.contact, ...contact };
  if (medical_cert_expiry !== undefined)
    driver.medical_cert_expiry = medical_cert_expiry
      ? new Date(medical_cert_expiry)
      : null;

  if (region_id && mongoose.isValidObjectId(region_id)) {
    const region = await Region.findById(region_id);
    if (region) {
      driver.region = { _id: region._id, name: region.name, code: region.code };
    }
  }

  driver.updated_by = req.user?._id ?? null;
  await driver.save();

  return res
    .status(200)
    .json(new ApiResponse(200, driver, "Driver updated successfully"));
});

// PATCH /api/drivers/:id/status  
export const updateDriverStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, "Invalid driver id");
  }

  const { status } = req.body;
  const allowed = ["on_duty", "off_duty"];
  if (!allowed.includes(status)) {
    throw new ApiError(
      400,
      `Status must be one of: ${allowed.join(", ")}. Use /suspend for suspension.`,
    );
  }

  const driver = await FleetDriver.findOne({
    _id: req.params.id,
    active: true,
  });
  if (!driver) throw new ApiError(404, "Driver not found");

  if (driver.status === "on_trip") {
    throw new ApiError(
      400,
      "Cannot change status of a driver who is currently on a trip",
    );
  }
  if (driver.status === "suspended" && status !== "on_duty") {
    throw new ApiError(
      400,
      "A suspended driver can only be reinstated to on_duty",
    );
  }

  driver.status = status;
  driver.updated_by = req.user?._id ?? null;
  await driver.save();

  return res
    .status(200)
    .json(new ApiResponse(200, driver, `Driver status updated to ${status}`));
});

// PATCH /api/drivers/:id/suspend 
export const suspendDriver = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, "Invalid driver id");
  }

  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    throw new ApiError(400, "A reason is required to suspend a driver");
  }

  const driver = await FleetDriver.findOne({
    _id: req.params.id,
    active: true,
  });
  if (!driver) throw new ApiError(404, "Driver not found");

  if (driver.status === "suspended") {
    throw new ApiError(400, "Driver is already suspended");
  }

  // Cancel all dispatched trips for this driver
  const cancelledTrips = await FleetTrip.updateMany(
    { "driver._id": driver._id, status: "dispatched" },
    {
      $set: {
        status: "cancelled",
        cancellation_reason: `Driver suspended: ${reason.trim()}`,
        updated_by: req.user?._id ?? null,
      },
    },
  );

  driver.status = "suspended";
  driver.updated_by = req.user?._id ?? null;
  await driver.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { driver, tripsAutoCancel: cancelledTrips.modifiedCount },
        `Driver suspended. ${cancelledTrips.modifiedCount} dispatched trip(s) cancelled.`,
      ),
    );
});

// DELETE /api/drivers/:id 
export const deleteDriver = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, "Invalid driver id");
  }

  const driver = await FleetDriver.findOne({
    _id: req.params.id,
    active: true,
  });
  if (!driver) throw new ApiError(404, "Driver not found");

  if (driver.status === "on_trip") {
    throw new ApiError(
      400,
      "Cannot delete a driver who is currently on a trip",
    );
  }

  driver.active = false;
  driver.updated_by = req.user?._id ?? null;
  await driver.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Driver deleted successfully"));
});

// GET /api/drivers/:id/performance
export const getDriverPerformance = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, "Invalid driver id");
  }

  const driverObjId = new mongoose.Types.ObjectId(req.params.id);

  const driver = await FleetDriver.findOne({ _id: driverObjId, active: true });
  if (!driver) throw new ApiError(404, "Driver not found");

  const [tripStats, incidentStats] = await Promise.all([
    FleetTrip.aggregate([
      { $match: { "driver._id": driverObjId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    SafetyIncident.aggregate([
      { $match: { "driver._id": driverObjId, active: true } },
      {
        $group: {
          _id: "$incident_type",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const tripCounts = { total: 0, completed: 0, cancelled: 0, in_transit: 0 };
  tripStats.forEach(({ _id, count }) => {
    tripCounts.total += count;
    if (_id === "completed") tripCounts.completed = count;
    if (_id === "cancelled") tripCounts.cancelled = count;
    if (_id === "in_transit") tripCounts.in_transit = count;
  });

  const tripCompletionRate =
    tripCounts.total > 0
      ? Math.round((tripCounts.completed / tripCounts.total) * 100 * 10) / 10
      : 0;

  const onTimeCount = await FleetTrip.countDocuments({
    "driver._id": driverObjId,
    status: "completed",
    $expr: {
      $lte: ["$schedule.actual_arrival", "$schedule.estimated_arrival"],
    },
  });

  const onTimeRate =
    tripCounts.completed > 0
      ? Math.round((onTimeCount / tripCounts.completed) * 100 * 10) / 10
      : 0;

  const incidentCounts = {
    accident: 0,
    violation: 0,
    near_miss: 0,
    complaint: 0,
  };
  incidentStats.forEach(({ _id, count }) => {
    if (incidentCounts[_id] !== undefined) incidentCounts[_id] = count;
  });

  let safetyScore = 100;
  safetyScore -= incidentCounts.violation * 10;
  safetyScore -= incidentCounts.accident * 20;
  safetyScore -= incidentCounts.complaint * 5;
  safetyScore -= incidentCounts.near_miss * 2;

  const totalIncidents = Object.values(incidentCounts).reduce(
    (s, v) => s + v,
    0,
  );
  if (tripCounts.completed >= 100 && totalIncidents === 0) {
    safetyScore += 5; 
  }

  safetyScore = Math.max(0, Math.min(100, safetyScore)); 
  const safetyScoreColor =
    safetyScore > 80 ? "green" : safetyScore >= 60 ? "yellow" : "red";

  const storedScore = driver.metrics.safety_score;
  const storedRate = driver.metrics.trip_completion_rate;
  if (storedScore !== safetyScore || storedRate !== tripCompletionRate) {
    await FleetDriver.updateOne(
      { _id: driverObjId },
      {
        $set: {
          "metrics.safety_score": safetyScore,
          "metrics.trip_completion_rate": tripCompletionRate,
        },
      },
    );
  }

  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (driver.license_expiry - now) / (1000 * 60 * 60 * 24),
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        driver: {
          _id: driver._id,
          name: driver.name,
          employee_id: driver.employee_id,
          license_category: driver.license_category,
          license_days_remaining: daysUntilExpiry,
          status: driver.status,
        },
        trips: {
          total: tripCounts.total,
          completed: tripCounts.completed,
          cancelled: tripCounts.cancelled,
          completion_rate_pct: tripCompletionRate,
          on_time_deliveries: onTimeCount,
          on_time_rate_pct: onTimeRate,
        },
        safety: {
          score: safetyScore,
          score_color: safetyScoreColor,
          incidents: incidentCounts,
          total_incidents: totalIncidents,
        },
      },
      "Driver performance fetched successfully",
    ),
  );
});

// POST /api/drivers/:id/training  
export const addTrainingRecord = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, "Invalid driver id");
  }

  const driver = await FleetDriver.findOne({
    _id: req.params.id,
    active: true,
  });
  if (!driver) throw new ApiError(404, "Driver not found");

  const { training_type, completion_date, expiry_date, certificate_number } =
    req.body;

  if (!training_type || !completion_date) {
    throw new ApiError(400, "training_type and completion_date are required");
  }

  driver.training_records.push({
    training_type,
    completion_date: new Date(completion_date),
    expiry_date: expiry_date ? new Date(expiry_date) : null,
    certificate_number: certificate_number || "",
  });

  driver.updated_by = req.user?._id ?? null;
  await driver.save();

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        driver.training_records,
        "Training record added successfully",
      ),
    );
});
