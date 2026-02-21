import express from "express";

import {
  createVehicle,
  getVehicles,
  getVehicle,
  updateVehicle,
  deleteVehicle,
  retireVehicle,
} from "../controllers/vehicle.controller.js";

import {
  validateVehicle,
  validateVehicleUpdate,
} from "../middlewares/vehicle.middleware.js";

import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Create vehicle
router.post(
  "/",
  verifyJwt,
  validateVehicle,
  createVehicle
);

// Get all vehicles (with optional filters)
router.get("/", verifyJwt, getVehicles);

// Get single vehicle by ID
router.get("/:id", verifyJwt, getVehicle);

// Update vehicle
router.patch(
  "/:id",
  verifyJwt,
  // checkRole("Fleet Manager"),
  validateVehicleUpdate,
  updateVehicle
);

// Delete vehicle (soft delete)
router.delete(
  "/:id",
  verifyJwt,
  deleteVehicle
);

// Retire vehicle (set status to out_of_service)
router.patch(
  "/retire/:id",
  verifyJwt,
  retireVehicle
);

export default router;