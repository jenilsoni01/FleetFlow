import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/ApiError.js";

import authRouter from "./routes/auth.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import maintenanceRouter from "./routes/maintenance.routes.js";
import vehicleRouter from "./routes/vehicle.routes.js";
import tripRouter from "./routes/trip.routes.js";
import expenseRouter from "./routes/expense.routes.js";
import driverRouter from "./routes/driver.routes.js";
import metaRouter from "./routes/meta.routes.js";

import "./models/user.model.js";
import "./models/vehicleType.model.js";
import "./models/region.model.js";
import "./models/fleetVehicle.model.js";
import "./models/fleetDriver.model.js";
import "./models/fleetTrip.model.js";
import "./models/maintenanceLog.model.js";
import "./models/safetyIncident.model.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"],
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/maintenance", maintenanceRouter);
app.use("/api/vehicles", vehicleRouter);
app.use("/api/trips", tripRouter);
app.use("/api/expenses", expenseRouter);
app.use("/api/drivers", driverRouter);
app.use("/api/meta", metaRouter);

app.use((err, req, res, next) => {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message =
    err instanceof ApiError ? err.message : "Internal Server Error";
  const errors = err instanceof ApiError ? err.errors : [];

  // Log non-ApiErrors so we can see the raw Mongoose / JWT error
  if (!(err instanceof ApiError)) {
    console.error("[UNHANDLED ERROR]", err);
  }

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
  });
});

export default app;
