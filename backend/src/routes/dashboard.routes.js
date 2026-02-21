import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/dashboard/summary
router.route("/summary").get(verifyJwt, getDashboardSummary);

export default router;
