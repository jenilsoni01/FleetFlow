import mongoose from "mongoose";

const fleetVehicleSchema = new mongoose.Schema(
  {
    license_plate: {
      type: String,
      required: [true, "License plate is required"],
      unique: true,
      trim: true,
      uppercase: true,
      match: [
        /^[A-Z0-9-]{6,10}$/,
        "License plate must be 6-10 uppercase alphanumeric characters",
      ],
    },
    name: {
      type: String,
      required: [true, "Vehicle name is required"],
      trim: true,
    },
    vehicle_type: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VehicleType",
        required: [true, "Vehicle type is required"],
      },
      name: { type: String, default: "" },
      required_license_category: { type: String, default: "" },
    },
    max_load_kg: {
      type: Number,
      required: [true, "Max load capacity is required"],
      min: [0.1, "Max load must be greater than 0"],
    },
    current_odometer: {
      type: Number,
      required: [true, "Current odometer is required"],
      min: [0, "Odometer cannot be negative"],
      default: 0,
    },
    acquisition_date: {
      type: Date,
      required: [true, "Acquisition date is required"],
    },
    acquisition_cost: {
      type: Number,
      required: [true, "Acquisition cost is required"],
      min: [0.01, "Acquisition cost must be greater than 0"],
    },
    status: {
      type: String,
      enum: {
        values: ["available", "on_trip", "in_shop", "out_of_service"],
        message:
          "Status must be available, on_trip, in_shop, or out_of_service",
      },
      default: "available",
      required: true,
    },
    region: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Region",
        default: null,
      },
      name: { type: String, default: "" },
      code: { type: String, default: "" },
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
    },
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

fleetVehicleSchema.index({ status: 1 });
fleetVehicleSchema.index({ "vehicle_type._id": 1 });
fleetVehicleSchema.index({ "region._id": 1 });
fleetVehicleSchema.index({ active: 1 }, { sparse: true });
fleetVehicleSchema.index({ status: 1, active: 1 });
fleetVehicleSchema.index({ "region._id": 1, status: 1, active: 1 });
fleetVehicleSchema.index({ "vehicle_type._id": 1, status: 1, active: 1 });

export const FleetVehicle = mongoose.model("FleetVehicle", fleetVehicleSchema);
