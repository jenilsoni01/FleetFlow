import mongoose from "mongoose";

const vehicleTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vehicle type name is required"],
      unique: true,
      trim: true,
    },
    default_max_load: {
      type: Number,
      required: [true, "Default max load is required"],
      min: [0.1, "Default max load must be greater than 0"],
    },
    // Maps to the driver license category required to operate this vehicle type
    required_license_category: {
      type: String,
      enum: {
        values: ["A", "B", "C", "D"],
        message: "License category must be A, B, C, or D",
      },
      required: [true, "Required license category is required"],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

vehicleTypeSchema.index({ active: 1 });

export const VehicleType = mongoose.model("VehicleType", vehicleTypeSchema);
