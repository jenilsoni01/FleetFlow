import mongoose from "mongoose";

const regionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Region name is required"],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Region code is required"],
      unique: true,
      trim: true,
      uppercase: true,
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

regionSchema.index({ active: 1 });

export const Region = mongoose.model("Region", regionSchema);
