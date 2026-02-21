import mongoose from "mongoose";

// ── Embedded: fuel_details (only present when expense_type = "fuel") ──────────
const fuelDetailsSchema = new mongoose.Schema(
  {
    quantity: { type: Number, min: [0.01, "Fuel quantity must be > 0"] },
    unit_price: { type: Number, min: 0 },
    fuel_type: { type: String, enum: ["diesel", "petrol", "electric", "cng"] },
    station_name: { type: String, trim: true, default: "" },
    odometer_reading: { type: Number, min: 0 },
  },
  { _id: false },
);

// ── Embedded: single expense entry ───────────────────────────────────────────
const expenseSchema = new mongoose.Schema(
  {
    expense_type: {
      type: String,
      enum: ["fuel", "toll", "parking", "fine", "other"],
      required: true,
    },
    expense_date: { type: Date, required: true, default: Date.now },
    amount: { type: Number, required: true, min: [0.01, "Amount must be > 0"] },
    fuel_details: { type: fuelDetailsSchema, default: null }, // only if expense_type = "fuel"
    receipt: { type: mongoose.Schema.Types.ObjectId, default: null }, // GridFS ref
    notes: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    created_at: { type: Date, default: Date.now },
  },
  { _id: true },
);

// ── Main trip schema ──────────────────────────────────────────────────────────
const fleetTripSchema = new mongoose.Schema(
  {
    trip_reference: {
      type: String,
      unique: true,
      sparse: true, // auto-generated before save; sparse so draft doesn't conflict
      trim: true,
      uppercase: true,
    },
    origin: { type: String, trim: true, default: "" },
    destination: { type: String, trim: true, default: "" },

    cargo: {
      description: { type: String, trim: true, default: "" },
      weight_kg: {
        type: Number,
        min: [0, "Cargo weight cannot be negative"],
        default: 0,
      },
    },

    schedule: {
      scheduled_departure: { type: Date, default: null },
      estimated_arrival: { type: Date, default: null },
      actual_departure: { type: Date, default: null },
      actual_arrival: { type: Date, default: null }, // used in dashboard date filters
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    // Snapshot pattern: keep _id for authoritative lookup + denormalized fields for fast reads
    vehicle: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FleetVehicle",
        required: [true, "Vehicle is required"],
      },
      license_plate: { type: String, default: "" },
      name: { type: String, default: "" },
      vehicle_type_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VehicleType",
        default: null,
      },
    },

    // Snapshot pattern for driver
    driver: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FleetDriver",
        default: null,
      },
      name: { type: String, default: "" },
      employee_id: { type: String, default: "" },
    },

    status: {
      type: String,
      enum: {
        values: ["draft", "dispatched", "in_transit", "completed", "cancelled"],
        message:
          "Status must be draft, dispatched, in_transit, completed, or cancelled",
      },
      default: "draft",
      required: true,
    },

    odometer: {
      start: { type: Number, min: 0, default: 0 },
      end: { type: Number, min: 0, default: 0 },
    },

    cancellation_reason: {
      type: String,
      trim: true,
      default: "",
      // Bug fix: enforce this field at the schema level rather than relying on a comment
      validate: {
        validator: function (v) {
          if (this.status === "cancelled" && (!v || !v.trim())) {
            return false;
          }
          return true;
        },
        message: "Cancellation reason is required when status is cancelled",
      },
    },

    expenses: { type: [expenseSchema], default: [] },

    // region is carried from the vehicle snapshot for trip-level filtering
    region: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Region",
        default: null,
      },
      name: { type: String, default: "" },
      code: { type: String, default: "" },
    },

    active: { type: Boolean, default: true },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Note: trip_reference index is declared via unique+sparse on the field itself above
fleetTripSchema.index({ status: 1 });
fleetTripSchema.index({ "vehicle._id": 1, status: 1 });
fleetTripSchema.index({ "vehicle.vehicle_type_id": 1, status: 1 }); // supports vehicle_type filter on trip charts
fleetTripSchema.index({ "driver._id": 1, status: 1 });
fleetTripSchema.index({ "region._id": 1, status: 1 });
fleetTripSchema.index({ "schedule.scheduled_departure": 1 });
fleetTripSchema.index({ status: 1, "schedule.actual_arrival": -1 }); // dashboard: completed trips by date
fleetTripSchema.index({
  "expenses.expense_type": 1,
  "expenses.expense_date": -1,
}); // fuel trend
fleetTripSchema.index({ active: 1 }, { sparse: true });

// ── Auto-generate trip_reference before save ──────────────────────────────────
fleetTripSchema.pre("save", async function () {
  if (!this.trip_reference) {
    const d = new Date();
    const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    // Bug fix: countDocuments() is not atomic — two concurrent saves get the same
    // count, collide on the unique index, and crash. Instead, derive uniqueness from
    // this._id (already assigned by Mongoose before pre-save hooks run), which is
    // guaranteed unique by MongoDB's ObjectId spec.
    const uniqueSuffix = this._id.toString().slice(-6).toUpperCase();
    this.trip_reference = `TRIP-${datePart}-${uniqueSuffix}`;
  }
});

export const FleetTrip = mongoose.model("FleetTrip", fleetTripSchema);
