import { Router } from "express";
import {
  listExpenses,
  getVehicleOperationalCost,
  getMonthlyBurnRate,
  getVehicleFuelEfficiency,
} from "../controllers/expense.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

// All expense routes require auth
router.use(verifyJwt);

// List all expenses across trips (filter by vehicle, type, date range)
router.get("/", listExpenses);

// Monthly burn rate across fleet or for a single vehicle
router.get("/summary/monthly", getMonthlyBurnRate);

// Total operational cost + metrics for a specific vehicle
router.get("/summary/vehicle/:vehicle_id", getVehicleOperationalCost);

// Fuel efficiency over time for a specific vehicle
router.get("/fuel-efficiency/:vehicle_id", getVehicleFuelEfficiency);

export default router;
