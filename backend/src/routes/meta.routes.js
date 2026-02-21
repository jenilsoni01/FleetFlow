/**
 * GET /api/meta/vehicle-types  → all active VehicleType documents
 * GET /api/meta/regions        → all active Region documents
 *
 * Used by the frontend to populate dropdown lists in forms.
 */
import express from "express";
import { VehicleType } from "../models/vehicleType.model.js";
import { Region } from "../models/region.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/vehicle-types",
  verifyJwt,
  asyncHandler(async (_req, res) => {
    const types = await VehicleType.find({ active: true }).sort({ name: 1 });
    return res.json(new ApiResponse(200, types, "Vehicle types fetched"));
  }),
);

router.get(
  "/regions",
  verifyJwt,
  asyncHandler(async (_req, res) => {
    const regions = await Region.find({ active: true }).sort({ name: 1 });
    return res.json(new ApiResponse(200, regions, "Regions fetched"));
  }),
);

export default router;
