import express from "express";
import {
  createTrip,
  getTrips,
  getTrip,
  updateTrip,
  dispatchTrip,
  startTrip,
  completeTrip,
  cancelTrip,
  addExpense,
  getTripExpenses,
} from "../controllers/trip.controller.js";

import {
  validateTripCreation,
  validateTripUpdate,
  validateTripCompletion,
  validateTripCancellation,
  validateExpense,
} from "../middlewares/trip.middleware.js";

import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Create trip (draft)
router.post("/", verifyJwt, validateTripCreation, createTrip);

// Get all trips (with optional filters)
router.get("/", verifyJwt, getTrips);

// Get single trip by ID
router.get("/:id", verifyJwt, getTrip);

// Update trip details (only for draft/dispatched status)
router.patch("/:id", verifyJwt, validateTripUpdate, updateTrip);

// Dispatch trip (draft -> dispatched, updates vehicle and driver status)
router.patch("/dispatch/:id", verifyJwt, dispatchTrip);

// Start trip (dispatched -> in_transit)
router.patch("/start/:id", verifyJwt, startTrip);

// Complete trip (dispatched/in_transit -> completed, updates vehicle and driver status)
router.patch("/complete/:id", verifyJwt, validateTripCompletion, completeTrip);

// Cancel trip (any status -> cancelled, frees up vehicle and driver)
router.patch("/cancel/:id", verifyJwt, validateTripCancellation, cancelTrip);

// Add expense to trip
router.post("/:id/expenses", verifyJwt, validateExpense, addExpense);

// Get trip expenses
router.get("/:id/expenses", verifyJwt, getTripExpenses);

export default router;