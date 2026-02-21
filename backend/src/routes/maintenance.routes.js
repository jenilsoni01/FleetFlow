import { Router } from "express";
import {
  createMaintenanceLog,
  getMaintenanceLogs,
  getMaintenanceLogById,
  updateMaintenanceLog,
  deleteMaintenanceLog,
} from "../controllers/maintenance.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

// All maintenance routes require auth
router.use(verifyJwt);

// Collection routes
router.route("/").get(getMaintenanceLogs).post(createMaintenanceLog);

// Document routes
router
  .route("/:id")
  .get(getMaintenanceLogById)
  .patch(updateMaintenanceLog)
  .delete(deleteMaintenanceLog);

export default router;
