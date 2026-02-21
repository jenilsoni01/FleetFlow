import mongoose from "mongoose";

const trainingRecordSchema = new mongoose.Schema(
  {
    training_type: {
      type: String,
      enum: {
        values: ["safety", "defensive_driving", "hazmat", "other"],
        message:
          "Training type must be safety, defensive_driving, hazmat, or other",
      },
      required: [true, "Training type is required"],
    },
    completion_date: {
      type: Date,
      required: [true, "Completion date is required"],
    },
    expiry_date: { type: Date, default: null },
    certificate_number: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
  },
  { _id: true },
);

const fleetDriverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Driver name is required"],
      trim: true,
    },
    employee_id: {
      type: String,
      required: [true, "Employee ID is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    license_number: {
      type: String,
      required: [true, "License number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    license_category: {
      type: String,
      enum: {
        values: ["A", "B", "C", "D"],
        message: "License category must be A, B, C, or D",
      },
      required: [true, "License category is required"],
    },
    license_expiry: {
      type: Date,
      required: [true, "License expiry date is required"],
    },
    date_of_joining: {
      type: Date,
      required: [true, "Date of joining is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["on_duty", "on_trip", "off_duty", "suspended"],
        message: "Status must be on_duty, on_trip, off_duty, or suspended",
      },
      default: "off_duty",
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

    profile_photo: {
      type: mongoose.Schema.Types.ObjectId, 
      default: null,
    },

    medical_cert_expiry: { type: Date, default: null },

    contact: {
      phone: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, lowercase: true, default: "" },
    },

    metrics: {
      safety_score: { type: Number, min: 0, max: 100, default: 100 },
      trip_completion_rate: { type: Number, min: 0, max: 100, default: 0 },
    },

    training_records: { type: [trainingRecordSchema], default: [] },

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

fleetDriverSchema.index({ status: 1 });
fleetDriverSchema.index({ license_expiry: 1 }); 
fleetDriverSchema.index({ "region._id": 1 });
fleetDriverSchema.index({ "training_records.expiry_date": 1 }); 
fleetDriverSchema.index({ active: 1 }, { sparse: true });
fleetDriverSchema.index({ "metrics.safety_score": -1 }); 
fleetDriverSchema.pre("save", function () {
  if (this.isNew && this.license_expiry && this.license_expiry <= new Date()) {
    throw new Error(
      "License expiry date must be in the future when creating a driver",
    );
  }
});

export const FleetDriver = mongoose.model("FleetDriver", fleetDriverSchema);
