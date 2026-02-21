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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the base $match object for FleetVehicle from query params.
 * Optionally restrict to active vehicles only.
 *
 * Supported query params:
 *   region_id        – ObjectId string
 *   vehicle_type_id  – ObjectId string
 *   status           – single value OR comma-separated list
 *                      e.g. "available" or "available,on_trip"
 */
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

  // Status filter – supports single or comma-separated values
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
    // If none of the provided values are valid, no status filter is applied
  }

  return match;
};

/**
 * Build the base $match object for FleetTrip from query params.
 * startDate / endDate are matched against schedule.actual_arrival (nested).
 */
const buildTripMatch = (query) => {
  const match = {};

  // Snapshot pattern: region is a nested object in trips
  if (query.region_id && mongoose.isValidObjectId(query.region_id)) {
    match["region._id"] = new mongoose.Types.ObjectId(query.region_id);
  }

  // Filter trip charts by vehicle type via the vehicle snapshot field
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

/**
 * Merges a base $match with a chart-specific date condition on `dateField`.
 * If the base match already contains `dateField` (from a user date filter),
 * uses $and to combine both conditions instead of overwriting one with the other.
 */
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

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export const getDashboardSummary = asyncHandler(async (req, res) => {
  // Validate status query param early so we can return a clear error
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

  // Bug fix: validate date strings before passing to new Date() to avoid
  // Invalid Date objects silently reaching MongoDB aggregation pipelines
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

  // vehicleBaseMatch includes the status filter (used for fleetStatusBreakdown chart)
  // vehicleKpiMatch intentionally omits the status filter so KPI hardcoded statuses
  // (on_trip, in_shop) are not shadowed by user-supplied status filter
  const vehicleBaseMatch = buildVehicleMatch(req.query, {
    requireActive: true,
  });
  const vehicleKpiMatch = buildVehicleMatch(
    { ...req.query, status: undefined },
    { requireActive: true },
  );
  const tripBaseMatch = buildTripMatch(req.query);
  // pendingCargo counts drafts which have no actual_arrival – date filter must not apply
  const tripNoDateMatch = buildTripMatch({
    ...req.query,
    startDate: undefined,
    endDate: undefined,
  });

  // ------------------------------------------------------------------
  // Pre-compute commonly reused date boundaries
  // ------------------------------------------------------------------
  const now = new Date();

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // ------------------------------------------------------------------
  // Run all DB operations concurrently
  // ------------------------------------------------------------------
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
    // ── KPI 1 ── Active fleet (on trip) – uses kpiMatch so status filter doesn't zero this out
    FleetVehicle.countDocuments({ ...vehicleKpiMatch, status: "on_trip" }),

    // ── KPI 2 ── Vehicles in maintenance – same reasoning
    FleetVehicle.countDocuments({ ...vehicleKpiMatch, status: "in_shop" }),

    // ── KPI 3 ── Drafts / pending cargo (date filter excluded – drafts have no actual_arrival)
    FleetTrip.countDocuments({ ...tripNoDateMatch, status: "draft" }),

    // ── KPI 4 (denominator) ── All active, non-decommissioned vehicles
    // Always uses kpiMatch so utilization rate reflects the real fleet, not just the filtered subset
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
    // mergeMatchWithDateRange prevents the hardcoded $gte from silently overwriting
    // any user-supplied startDate/endDate already present in tripBaseMatch
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
      // Stage 1: Only trips that have at least one fuel expense in range
      {
        $match: {
          ...tripBaseMatch,
          "expenses.expense_type": "fuel",
          "expenses.expense_date": { $gte: sixMonthsAgo },
        },
      },
      // Stage 2: Expand each expense into its own document
      { $unwind: "$expenses" },
      // Stage 3: Keep only fuel expenses within the 6-month window
      {
        $match: {
          "expenses.expense_type": "fuel",
          "expenses.expense_date": { $gte: sixMonthsAgo },
        },
      },
      // Stage 4: Group by year-month and sum amount
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
    // mergeMatchWithDateRange prevents the startOfMonth $gte from overwriting
    // any user-supplied date filter already present in tripBaseMatch
    FleetTrip.aggregate([
      {
        $match: mergeMatchWithDateRange(
          { ...tripBaseMatch, status: "completed" },
          "schedule.actual_arrival",
          { $gte: startOfMonth },
        ),
      },
      // Stage 2: Group by vehicle snapshot _id, sum odometer delta
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
      // Stage 5: Populate vehicle details from fleet_vehicles collection
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

  // ------------------------------------------------------------------
  // Compute derived KPI
  // ------------------------------------------------------------------
  const utilizationRate =
    totalActiveVehicles > 0
      ? Math.round((activeFleet / totalActiveVehicles) * 100 * 10) / 10 // 1 decimal place
      : 0;

  // ------------------------------------------------------------------
  // Shape the response
  // ------------------------------------------------------------------
  const payload = {
    kpis: {
      activeFleet,
      maintenanceAlerts,
      pendingCargo,
      utilizationRate, // e.g. 62.5 (%)
      totalActiveVehicles,
    },
    charts: {
      fleetStatusBreakdown, // [{ status, count }]
      weeklyTripVolume, // [{ date, trips }]
      fuelSpendTrend, // [{ month, totalFuelSpend }]
      topVehiclesByDistance, // [{ vehicle_id, license_plate, name, totalDistance, tripsCompleted }]
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
