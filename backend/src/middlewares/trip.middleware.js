import { ApiError } from "../utils/ApiError.js";

// Validate trip creation
export const validateTripCreation = (req, res, next) => {
  const { vehicle_id, origin, destination } = req.body;

  if (!vehicle_id) {
    throw new ApiError(400, "Vehicle ID is required");
  }

  if (!origin || !origin.trim()) {
    throw new ApiError(400, "Origin is required");
  }

  if (!destination || !destination.trim()) {
    throw new ApiError(400, "Destination is required");
  }

  next();
};

// Validate trip update
export const validateTripUpdate = (req, res, next) => {
  const { cargo_weight_kg } = req.body;

  if (cargo_weight_kg !== undefined && cargo_weight_kg < 0) {
    throw new ApiError(400, "Cargo weight cannot be negative");
  }

  next();
};

// Validate trip completion
export const validateTripCompletion = (req, res, next) => {
  const { odometer_end } = req.body;

  if (!odometer_end) {
    throw new ApiError(400, "End odometer reading is required");
  }

  if (odometer_end < 0) {
    throw new ApiError(400, "Odometer reading cannot be negative");
  }

  next();
};

// Validate trip cancellation
export const validateTripCancellation = (req, res, next) => {
  const { cancellation_reason } = req.body;

  if (!cancellation_reason || !cancellation_reason.trim()) {
    throw new ApiError(400, "Cancellation reason is required");
  }

  next();
};

// Validate expense creation
export const validateExpense = (req, res, next) => {
  const { expense_type, amount, fuel_quantity, fuel_type } = req.body;

  if (!expense_type) {
    throw new ApiError(400, "Expense type is required");
  }

  const validExpenseTypes = ["fuel", "toll", "parking", "fine", "other"];
  if (!validExpenseTypes.includes(expense_type)) {
    throw new ApiError(
      400,
      `Invalid expense type. Must be one of: ${validExpenseTypes.join(", ")}`
    );
  }

  if (!amount || amount <= 0) {
    throw new ApiError(400, "Amount must be greater than 0");
  }

  // Validate fuel-specific fields
  if (expense_type === "fuel") {
    if (!fuel_quantity || fuel_quantity <= 0) {
      throw new ApiError(400, "Fuel quantity must be greater than 0");
    }

    if (!fuel_type) {
      throw new ApiError(400, "Fuel type is required for fuel expenses");
    }

    const validFuelTypes = ["diesel", "petrol", "electric", "cng"];
    if (!validFuelTypes.includes(fuel_type)) {
      throw new ApiError(
        400,
        `Invalid fuel type. Must be one of: ${validFuelTypes.join(", ")}`
      );
    }
  }

  next();
};
