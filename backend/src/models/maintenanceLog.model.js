import mongoose from "mongoose";

const partSchema = new mongoose.Schema(
  {
    part_name: {
      type: String,
      required: [true, "Part name is required"],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be >= 1"],
    },
    unit_cost: {
      type: Number,
      required: [true, "Unit cost is required"],
      min: [0, "Unit cost cannot be negative"],
    },
    total_cost: { type: Number }, 
    created_at: { type: Date, default: Date.now },
  },
  { _id: true },
);

const maintenanceLogSchema = new mongoose.Schema(
  {
    vehicle: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FleetVehicle",
        required: [true, "Vehicle is required"],
      },
      license_plate: { type: String, default: "" },
      name: { type: String, default: "" },
    },

    service_type: {
      type: String,
      enum: {
        values: [
          "oil_change",
          "tire_replacement",
          "brake_service",
          "engine_repair",
          "body_work",
          "inspection",
          "other",
        ],
        message: "Invalid service type",
      },
      required: [true, "Service type is required"],
    },

    description: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: function (v) {
          if (this.service_type === "other" && (!v || !v.trim())) return false;
          return true;
        },
        message: "Description is required when service type is 'other'",
      },
    },

    dates: {
      scheduled: { type: Date, required: [true, "Scheduled date is required"] },
      start: { type: Date, default: null },
      completion: { type: Date, default: null }, 
    },

    odometer_at_service: { type: Number, min: 0, default: 0 },

    cost: {
      type: Number,
      min: [0, "Cost cannot be negative"],
      default: 0,
      validate: {
        validator: function (v) {
          if (this.status === "completed" && (!v || v <= 0)) return false;
          return true;
        },
        message: "Cost must be greater than 0 when status is completed",
      },
    },

    service_provider: { type: String, trim: true, default: "" },

    previous_vehicle_status: {
      type: String,
      enum: ["available", "on_trip", "in_shop", "out_of_service"],
      default: "available",
    },

    status: {
      type: String,
      enum: {
        values: ["scheduled", "in_progress", "completed", "cancelled"],
        message:
          "Status must be scheduled, in_progress, completed, or cancelled",
      },
      default: "scheduled",
      required: true,
    },

    next_service_due_km: { type: Number, min: 0, default: 0 },

    parts: { type: [partSchema], default: [] },

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

maintenanceLogSchema.index({ "vehicle._id": 1 });
maintenanceLogSchema.index({ status: 1 });
maintenanceLogSchema.index({ "dates.scheduled": 1 });
maintenanceLogSchema.index({ active: 1 }, { sparse: true });
maintenanceLogSchema.index({ "vehicle._id": 1, status: 1 }); s

maintenanceLogSchema.pre("save", function () {
  if (this.isModified("parts")) {
    this.parts.forEach((part) => {
      part.total_cost = part.quantity * part.unit_cost;
    });
  }
  if (
    this.dates.completion &&
    this.dates.start &&
    this.dates.completion < this.dates.start
  ) {
    throw new Error("Completion date cannot be before start date");
  }
});

export const MaintenanceLog = mongoose.model(
  "MaintenanceLog",
  maintenanceLogSchema,
);
