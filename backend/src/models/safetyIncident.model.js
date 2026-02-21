import mongoose from "mongoose";

const safetyIncidentSchema = new mongoose.Schema(
  {
    // Snapshot pattern: driver details for fast reads
    driver: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FleetDriver",
        required: [true, "Driver is required"],
      },
      name: { type: String, default: "" },
      employee_id: { type: String, default: "" },
    },

    // Optional — incident may occur outside of a tracked trip
    trip: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FleetTrip",
        default: null,
      },
      trip_reference: { type: String, default: "" },
    },

    incident_date: {
      type: Date,
      required: [true, "Incident date is required"],
    },

    incident_type: {
      type: String,
      enum: {
        values: ["accident", "violation", "near_miss", "complaint"],
        message:
          "Incident type must be accident, violation, near_miss, or complaint",
      },
      required: [true, "Incident type is required"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },

    severity: {
      type: String,
      enum: {
        values: ["minor", "moderate", "severe"],
        message: "Severity must be minor, moderate, or severe",
      },
      required: [true, "Severity is required"],
    },

    actions_taken: {
      type: String,
      trim: true,
      default: "",
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
safetyIncidentSchema.index({ "driver._id": 1 });
safetyIncidentSchema.index({ incident_date: -1 });
safetyIncidentSchema.index({ incident_type: 1 });
safetyIncidentSchema.index({ severity: 1 });
safetyIncidentSchema.index({ active: 1 }, { sparse: true });
// Compound: driver safety history sorted by date (used in driver performance tab)
safetyIncidentSchema.index({ "driver._id": 1, incident_date: -1 });

export const SafetyIncident = mongoose.model(
  "SafetyIncident",
  safetyIncidentSchema,
);
