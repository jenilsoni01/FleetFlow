import mongoose from "mongoose";
import { FleetVehicle } from "../models/fleetVehicle.model.js";
import { FleetTrip } from "../models/fleetTrip.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const VALID_VEHICLE_STATUSES = [
  "available",
  "on_trip",
  "in_shop",
  "out_of_service",
];

const buildVehicleMatch = (query, { requireActive = false } = {}) => {
  const match = {};

  if (requireActive) match.active = true;

  // Snapshot pattern: region and vehicle_type are nested objects, not flat _id refs
  if (query.region_id && mongoose.isValidObjectId(query.region_id)) {
    match["region._id"] = new mongoose.Types.ObjectId(query.region_id);
  }
  if (
    query.vehicle_type_id &&
    mongoose.isValidObjectId(query.vehicle_type_id)
  ) {
    match["vehicle_type._id"] = new mongoose.Types.ObjectId(
      query.vehicle_type_id,
    );
  }

  if (query.status) {
    const requested = query.status
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => VALID_VEHICLE_STATUSES.includes(s));

    if (requested.length === 1) {
      match.status = requested[0];
    } else if (requested.length > 1) {
      match.status = { $in: requested };
    }
  }

  return match;
};

const buildTripMatch = (query) => {
  const match = {};

  if (query.region_id && mongoose.isValidObjectId(query.region_id)) {
    match["region._id"] = new mongoose.Types.ObjectId(query.region_id);
  }

  if (
    query.vehicle_type_id &&
    mongoose.isValidObjectId(query.vehicle_type_id)
  ) {
    match["vehicle.vehicle_type_id"] = new mongoose.Types.ObjectId(
      query.vehicle_type_id,
    );
  }

  const start = query.startDate ? new Date(query.startDate) : null;
  const end = query.endDate ? new Date(query.endDate) : null;

  if (start || end) {
    match["schedule.actual_arrival"] = {};
    if (start) match["schedule.actual_arrival"].$gte = start;
    if (end) {
      end.setHours(23, 59, 59, 999);
      match["schedule.actual_arrival"].$lte = end;
    }
  }

  return match;
};

const mergeMatchWithDateRange = (baseMatch, dateField, dateCondition) => {
  if (baseMatch[dateField]) {
    const { [dateField]: existingCondition, ...rest } = baseMatch;
    return {
      ...rest,
      $and: [
        { [dateField]: existingCondition },
        { [dateField]: dateCondition },
      ],
    };
  }
  return { ...baseMatch, [dateField]: dateCondition };
};

// Controller
export const getDashboardSummary = asyncHandler(async (req, res) => {
  if (req.query.status) {
    const requested = req.query.status
      .split(",")
      .map((s) => s.trim().toLowerCase());
    const invalid = requested.filter(
      (s) => !VALID_VEHICLE_STATUSES.includes(s),
    );
    if (invalid.length > 0) {
      throw new ApiError(
        400,
        `Invalid status value(s): ${invalid.join(", ")}. Allowed: ${VALID_VEHICLE_STATUSES.join(", ")}`,
      );
    }
  }

  if (req.query.startDate && isNaN(new Date(req.query.startDate).getTime())) {
    throw new ApiError(
      400,
      "Invalid startDate. Use ISO 8601 format (e.g. 2026-01-15)",
    );
  }
  if (req.query.endDate && isNaN(new Date(req.query.endDate).getTime())) {
    throw new ApiError(
      400,
      "Invalid endDate. Use ISO 8601 format (e.g. 2026-01-15)",
    );
  }

  const vehicleBaseMatch = buildVehicleMatch(req.query, {
    requireActive: true,
  });
  const vehicleKpiMatch = buildVehicleMatch(
    { ...req.query, status: undefined },
    { requireActive: true },
  );
  const tripBaseMatch = buildTripMatch(req.query);
  const tripNoDateMatch = buildTripMatch({
    ...req.query,
    startDate: undefined,
    endDate: undefined,
  });

  // Pre-compute commonly reused date boundaries-
  const now = new Date();

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Run all DB operations concurrently
  const [
    activeFleet,
    maintenanceAlerts,
    pendingCargo,
    totalActiveVehicles,
    fleetStatusBreakdown,
    weeklyTripVolume,
    fuelSpendTrend,
    topVehiclesByDistance,
  ] = await Promise.all([
    // ── KPI 1 ── Active fleet (on trip) 
    FleetVehicle.countDocuments({ ...vehicleKpiMatch, status: "on_trip" }),

    // ── KPI 2 ── Vehicles in maintenance
    FleetVehicle.countDocuments({ ...vehicleKpiMatch, status: "in_shop" }),

    // ── KPI 3 ── Drafts / pending cargo 
    FleetTrip.countDocuments({ ...tripNoDateMatch, status: "draft" }),

    // ── KPI 4 (denominator) ── All active, non-decommissioned vehicles
    FleetVehicle.countDocuments({
      ...vehicleKpiMatch,
      status: { $ne: "out_of_service" },
    }),

    // ── Chart 1 ── Fleet status breakdown
    FleetVehicle.aggregate([
      { $match: vehicleBaseMatch },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          count: 1,
        },
      },
      { $sort: { status: 1 } },
    ]),

    // ── Chart 2 ── Weekly trip volume (completed trips last 7 days, grouped by day)
    FleetTrip.aggregate([
      {
        $match: mergeMatchWithDateRange(
          { ...tripBaseMatch, status: "completed" },
          "schedule.actual_arrival",
          { $gte: sevenDaysAgo },
        ),
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$schedule.actual_arrival",
            },
          },
          trips: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          trips: 1,
        },
      },
      { $sort: { date: 1 } },
    ]),

    // ── Chart 3 ── Fuel spend trend (last 6 months, grouped by month)
    FleetTrip.aggregate([
      {
        $match: {
          ...tripBaseMatch,
          "expenses.expense_type": "fuel",
          "expenses.expense_date": { $gte: sixMonthsAgo },
        },
      },
      { $unwind: "$expenses" },
      {
        $match: {
          "expenses.expense_type": "fuel",
          "expenses.expense_date": { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$expenses.expense_date",
            },
          },
          totalFuelSpend: { $sum: "$expenses.amount" },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id",
          totalFuelSpend: { $round: ["$totalFuelSpend", 2] },
        },
      },
      { $sort: { month: 1 } },
    ]),

    // ── Chart 4 ── Top 5 vehicles by distance (current month, completed trips)
    FleetTrip.aggregate([
      {
        $match: mergeMatchWithDateRange(
          { ...tripBaseMatch, status: "completed" },
          "schedule.actual_arrival",
          { $gte: startOfMonth },
        ),
      },
      {
        $group: {
          _id: "$vehicle._id",
          totalDistance: {
            $sum: { $subtract: ["$odometer.end", "$odometer.start"] },
          },
          tripsCompleted: { $sum: 1 },
        },
      },
      { $sort: { totalDistance: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "fleetvehicles",
          localField: "_id",
          foreignField: "_id",
          as: "vehicle",
          pipeline: [{ $project: { _id: 0, license_plate: 1, name: 1 } }],
        },
      },
      { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          vehicle_id: "$_id",
          license_plate: "$vehicle.license_plate",
          name: "$vehicle.name",
          totalDistance: 1,
          tripsCompleted: 1,
        },
      },
    ]),
  ]);

  // Compute derived KPI
  const utilizationRate =
    totalActiveVehicles > 0
      ? Math.round((activeFleet / totalActiveVehicles) * 100 * 10) / 10 
      : 0;

  // Shape the response
  const payload = {
    kpis: {
      activeFleet,
      maintenanceAlerts,
      pendingCargo,
      utilizationRate, 
      totalActiveVehicles,
    },
    charts: {
      fleetStatusBreakdown, 
      weeklyTripVolume, 
      fuelSpendTrend, 
      topVehiclesByDistance, 
    },
    meta: {
      generatedAt: new Date().toISOString(),
      filters: {
        region_id: req.query.region_id || null,
        vehicle_type_id: req.query.vehicle_type_id || null,
        status: req.query.status
          ? req.query.status.split(",").map((s) => s.trim().toLowerCase())
          : null,
        startDate: req.query.startDate || null,
        endDate: req.query.endDate || null,
      },
      note: req.query.status
        ? "KPI counts (activeFleet, maintenanceAlerts, utilizationRate) always reflect the full fleet scoped by region/type. The status filter applies to fleetStatusBreakdown only."
        : undefined,
    },
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, payload, "Dashboard summary fetched successfully"),
    );
});
