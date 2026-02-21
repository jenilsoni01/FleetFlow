import { Router } from "express";
import {
  createDriver,
  getDrivers,
  getDriver,
  updateDriver,
  updateDriverStatus,
  suspendDriver,
  deleteDriver,
  getDriverPerformance,
  addTrainingRecord,
} from "../controllers/driver.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

// All driver routes require auth
router.use(verifyJwt);

// Collection
router.route("/").get(getDrivers).post(createDriver);

// Document
router.route("/:id").get(getDriver).patch(updateDriver).delete(deleteDriver);

// Status toggle (on_duty ↔ off_duty)
router.patch("/:id/status", updateDriverStatus);

// Suspend with reason (also auto-cancels dispatched trips)
router.patch("/:id/suspend", suspendDriver);

// Performance & safety score (computed on demand)
router.get("/:id/performance", getDriverPerformance);

// Add training record
router.post("/:id/training", addTrainingRecord);

export default router;
