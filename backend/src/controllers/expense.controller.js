import mongoose from "mongoose";
import { FleetTrip } from "../models/fleetTrip.model.js";
import { MaintenanceLog } from "../models/maintenanceLog.model.js";
import { FleetVehicle } from "../models/fleetVehicle.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const buildExpenseMatch = (query) => {
  const { vehicle_id, expense_type, startDate, endDate } = query;

  const tripMatch = { active: true };
  const expenseMatch = { "expenses.active": true };

  if (vehicle_id && mongoose.isValidObjectId(vehicle_id)) {
    tripMatch["vehicle._id"] = new mongoose.Types.ObjectId(vehicle_id);
  }

  if (expense_type) {
    const allowed = ["fuel", "toll", "parking", "fine", "other"];
    if (allowed.includes(expense_type)) {
      expenseMatch["expenses.expense_type"] = expense_type;
    }
  }

  if (startDate || endDate) {
    expenseMatch["expenses.expense_date"] = {};
    if (startDate) {
      const s = new Date(startDate);
      if (isNaN(s.getTime())) throw new ApiError(400, "Invalid startDate");
      expenseMatch["expenses.expense_date"].$gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      if (isNaN(e.getTime())) throw new ApiError(400, "Invalid endDate");
      e.setHours(23, 59, 59, 999);
      expenseMatch["expenses.expense_date"].$lte = e;
    }
  }

  return { tripMatch, expenseMatch };
};

// GET /api/expenses
export const listExpenses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const { tripMatch, expenseMatch } = buildExpenseMatch(req.query);

  const skip = (Number(page) - 1) * Number(limit);

  const pipeline = [
    { $match: tripMatch },
    { $unwind: "$expenses" },
    { $match: expenseMatch },
    {
      $addFields: {
        "expenses.trip_reference": "$trip_reference",
        "expenses.trip_id": "$_id",
        "expenses.vehicle": "$vehicle",
        "expenses.trip_status": "$status",
      },
    },
    { $replaceRoot: { newRoot: "$expenses" } },
    { $sort: { expense_date: -1 } },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: Number(limit) }],
        total: [{ $count: "count" }],
      },
    },
  ];

  const [result] = await FleetTrip.aggregate(pipeline);
  const expenses = result.data;
  const total = result.total[0]?.count ?? 0;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { expenses, total, page: Number(page), limit: Number(limit) },
        "Expenses fetched successfully",
      ),
    );
});

// GET /api/expenses/summary/vehicle/:vehicle_id
export const getVehicleOperationalCost = asyncHandler(async (req, res) => {
  const { vehicle_id } = req.params;

  if (!mongoose.isValidObjectId(vehicle_id)) {
    throw new ApiError(400, "Invalid vehicle_id");
  }

  const vehicleObjId = new mongoose.Types.ObjectId(vehicle_id);

  let dateFilter = {};
  if (req.query.startDate || req.query.endDate) {
    dateFilter = {};
    if (req.query.startDate) {
      const s = new Date(req.query.startDate);
      if (isNaN(s.getTime())) throw new ApiError(400, "Invalid startDate");
      dateFilter.$gte = s;
    }
    if (req.query.endDate) {
      const e = new Date(req.query.endDate);
      if (isNaN(e.getTime())) throw new ApiError(400, "Invalid endDate");
      e.setHours(23, 59, 59, 999);
      dateFilter.$lte = e;
    }
  }

  const expenseDateMatch =
    Object.keys(dateFilter).length > 0
      ? { "expenses.expense_date": dateFilter }
      : {};
  const maintenanceDateMatch =
    Object.keys(dateFilter).length > 0
      ? { "dates.completion": dateFilter }
      : {};

  const [fuelResult, otherExpensesResult, maintenanceResult, distanceResult] =
    await Promise.all([
      FleetTrip.aggregate([
        { $match: { "vehicle._id": vehicleObjId, active: true } },
        { $unwind: "$expenses" },
        {
          $match: {
            "expenses.expense_type": "fuel",
            "expenses.active": true,
            ...expenseDateMatch,
          },
        },
        {
          $group: {
            _id: null,
            totalFuelCost: { $sum: "$expenses.amount" },
            totalFuelLiters: {
              $sum: "$expenses.fuel_details.quantity",
            },
          },
        },
      ]),

      FleetTrip.aggregate([
        { $match: { "vehicle._id": vehicleObjId, active: true } },
        { $unwind: "$expenses" },
        {
          $match: {
            "expenses.expense_type": { $ne: "fuel" },
            "expenses.active": true,
            ...expenseDateMatch,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$expenses.amount" },
          },
        },
      ]),

      MaintenanceLog.aggregate([
        {
          $match: {
            "vehicle._id": vehicleObjId,
            status: "completed",
            active: true,
            ...(Object.keys(maintenanceDateMatch).length > 0
              ? maintenanceDateMatch
              : {}),
          },
        },
        {
          $group: {
            _id: null,
            totalMaintenanceCost: { $sum: "$cost" },
            serviceCount: { $sum: 1 },
          },
        },
      ]),

      FleetTrip.aggregate([
        {
          $match: {
            "vehicle._id": vehicleObjId,
            status: "completed",
            active: true,
          },
        },
        {
          $group: {
            _id: null,
            totalDistanceKm: {
              $sum: { $subtract: ["$odometer.end", "$odometer.start"] },
            },
            completedTrips: { $sum: 1 },
          },
        },
      ]),
    ]);

  const fuelCost = fuelResult[0]?.totalFuelCost ?? 0;
  const fuelLiters = fuelResult[0]?.totalFuelLiters ?? 0;
  const otherExpenses = otherExpensesResult[0]?.total ?? 0;
  const maintenanceCost = maintenanceResult[0]?.totalMaintenanceCost ?? 0;
  const serviceCount = maintenanceResult[0]?.serviceCount ?? 0;
  const totalDistanceKm = distanceResult[0]?.totalDistanceKm ?? 0;
  const completedTrips = distanceResult[0]?.completedTrips ?? 0;

  const totalOperationalCost = fuelCost + otherExpenses + maintenanceCost;
  const costPerKm =
    totalDistanceKm > 0
      ? Math.round((totalOperationalCost / totalDistanceKm) * 100) / 100
      : null;
  const fuelEfficiencyKmL =
    fuelLiters > 0
      ? Math.round((totalDistanceKm / fuelLiters) * 100) / 100
      : null;

  const vehicle = await FleetVehicle.findById(vehicleObjId).select(
    "name license_plate current_odometer",
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        vehicle: vehicle
          ? {
              _id: vehicleObjId,
              name: vehicle.name,
              license_plate: vehicle.license_plate,
              current_odometer: vehicle.current_odometer,
            }
          : null,
        costs: {
          fuel: Math.round(fuelCost * 100) / 100,
          maintenance: Math.round(maintenanceCost * 100) / 100,
          other_expenses: Math.round(otherExpenses * 100) / 100,
          total_operational: Math.round(totalOperationalCost * 100) / 100,
        },
        metrics: {
          total_distance_km: totalDistanceKm,
          cost_per_km: costPerKm, // null if no completed trips
          fuel_liters: Math.round(fuelLiters * 100) / 100,
          fuel_efficiency_km_per_liter: fuelEfficiencyKmL, // null if no fuel records
          completed_trips: completedTrips,
          maintenance_services: serviceCount,
        },
        filters: {
          startDate: req.query.startDate || null,
          endDate: req.query.endDate || null,
        },
      },
      "Vehicle operational cost summary fetched successfully",
    ),
  );
});

// GET /api/expenses/summary/monthly
export const getMonthlyBurnRate = asyncHandler(async (req, res) => {
  const { vehicle_id, months = 6 } = req.query;

  const nMonths = Math.min(Math.max(Number(months), 1), 24); // clamp 1-24
  const since = new Date();
  since.setMonth(since.getMonth() - nMonths);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const tripMatch = { active: true };
  if (vehicle_id && mongoose.isValidObjectId(vehicle_id)) {
    tripMatch["vehicle._id"] = new mongoose.Types.ObjectId(vehicle_id);
  }

  const [tripBurn, maintenanceBurn] = await Promise.all([
    FleetTrip.aggregate([
      { $match: tripMatch },
      { $unwind: "$expenses" },
      {
        $match: {
          "expenses.active": true,
          "expenses.expense_date": { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            month: {
              $dateToString: {
                format: "%Y-%m",
                date: "$expenses.expense_date",
              },
            },
            type: "$expenses.expense_type",
          },
          total: { $sum: "$expenses.amount" },
        },
      },
      {
        $group: {
          _id: "$_id.month",
          breakdown: {
            $push: { type: "$_id.type", amount: { $round: ["$total", 2] } },
          },
          totalExpenses: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    MaintenanceLog.aggregate([
      {
        $match: {
          ...(vehicle_id && mongoose.isValidObjectId(vehicle_id)
            ? { "vehicle._id": new mongoose.Types.ObjectId(vehicle_id) }
            : {}),
          status: "completed",
          active: true,
          "dates.completion": { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$dates.completion" },
          },
          totalMaintenance: { $sum: "$cost" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const monthMap = {};
  tripBurn.forEach(({ _id, breakdown, totalExpenses }) => {
    monthMap[_id] = {
      month: _id,
      trip_expenses: Math.round(totalExpenses * 100) / 100,
      maintenance: 0,
      total: Math.round(totalExpenses * 100) / 100,
      breakdown,
    };
  });
  maintenanceBurn.forEach(({ _id, totalMaintenance }) => {
    if (monthMap[_id]) {
      monthMap[_id].maintenance = Math.round(totalMaintenance * 100) / 100;
      monthMap[_id].total =
        Math.round((monthMap[_id].trip_expenses + totalMaintenance) * 100) /
        100;
    } else {
      monthMap[_id] = {
        month: _id,
        trip_expenses: 0,
        maintenance: Math.round(totalMaintenance * 100) / 100,
        total: Math.round(totalMaintenance * 100) / 100,
        breakdown: [],
      };
    }
  });

  const burnRate = Object.values(monthMap).sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { burnRate, months: nMonths },
        "Monthly burn rate fetched successfully",
      ),
    );
});

// GET /api/expenses/fuel-efficiency/:vehicle_id
export const getVehicleFuelEfficiency = asyncHandler(async (req, res) => {
  const { vehicle_id } = req.params;

  if (!mongoose.isValidObjectId(vehicle_id)) {
    throw new ApiError(400, "Invalid vehicle_id");
  }

  const vehicleObjId = new mongoose.Types.ObjectId(vehicle_id);

  const fuelExpenses = await FleetTrip.aggregate([
    { $match: { "vehicle._id": vehicleObjId, active: true } },
    { $unwind: "$expenses" },
    {
      $match: {
        "expenses.expense_type": "fuel",
        "expenses.active": true,
        "expenses.fuel_details.odometer_reading": { $gt: 0 },
      },
    },
    {
      $project: {
        _id: 0,
        trip_reference: 1,
        expense_date: "$expenses.expense_date",
        quantity: "$expenses.fuel_details.quantity",
        amount: "$expenses.amount",
        fuel_type: "$expenses.fuel_details.fuel_type",
        station_name: "$expenses.fuel_details.station_name",
        odometer_reading: "$expenses.fuel_details.odometer_reading",
      },
    },
    { $sort: { odometer_reading: 1 } },
  ]);

  const efficiencyPoints = fuelExpenses.map((entry, idx) => {
    if (idx === 0) return { ...entry, efficiency_km_per_liter: null };

    const prev = fuelExpenses[idx - 1];
    const distance = entry.odometer_reading - prev.odometer_reading;
    const efficiency =
      entry.quantity > 0
        ? Math.round((distance / entry.quantity) * 100) / 100
        : null;

    return { ...entry, efficiency_km_per_liter: efficiency };
  });

  const validPoints = efficiencyPoints.filter(
    (p) => p.efficiency_km_per_liter !== null && p.efficiency_km_per_liter > 0,
  );
  const avgEfficiency =
    validPoints.length > 0
      ? Math.round(
          (validPoints.reduce((s, p) => s + p.efficiency_km_per_liter, 0) /
            validPoints.length) *
            100,
        ) / 100
      : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        vehicle_id: vehicleObjId,
        average_efficiency_km_per_liter: avgEfficiency,
        fill_ups: efficiencyPoints,
      },
      "Fuel efficiency data fetched successfully",
    ),
  );
});
