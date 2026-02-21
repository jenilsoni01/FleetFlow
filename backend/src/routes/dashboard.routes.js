import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/dashboard/summary
// Protected – only authenticated users can view the dashboard
// Optional query params: region_id, vehicle_type_id, startDate, endDate
router.route("/summary").get(verifyJwt, getDashboardSummary);

export default router;
