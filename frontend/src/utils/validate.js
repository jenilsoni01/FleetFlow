/**
 * Frontend validation rules mirroring backend middleware + Mongoose schema.
 *
 * Each validator returns: null (ok) | string (error message)
 * validate(rules, form) → errors object  { field: "message" } (empty = valid)
 */

// ── Primitives ──────────────────────────────────────────────────────────────

export const required = (label) => (v) =>
  !v || !String(v).trim() ? `${label} is required` : null;

export const minNum = (label, min) => (v) =>
  v === "" || v === null || v === undefined
    ? `${label} is required`
    : Number(v) < min
      ? `${label} must be ≥ ${min}`
      : null;

export const positiveNum = (label) => (v) =>
  v === "" || v === null || v === undefined
    ? `${label} is required`
    : Number(v) <= 0
      ? `${label} must be greater than 0`
      : null;

export const futureDate = (label) => (v) => {
  if (!v) return `${label} is required`;
  return new Date(v) <= new Date() ? `${label} must be a future date` : null;
};

export const pastOrTodayDate = (label) => (v) => {
  if (!v) return `${label} is required`;
  const d = new Date(v);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d > today ? `${label} cannot be in the future` : null;
};

// ── Domain-specific ──────────────────────────────────────────────────────────

/** /^[A-Z0-9-]{6,10}$/ — matches backend model + middleware */
export const licensePlate = (v) => {
  if (!v || !v.trim()) return "License plate is required";
  return /^[A-Z0-9-]{6,10}$/.test(v.trim().toUpperCase())
    ? null
    : "Must be 6–10 uppercase letters, digits or hyphens (e.g. MH12AB1234)";
};

export const mongoId = (label) => (v) =>
  !v || !v.trim()
    ? `${label} is required`
    : !/^[a-f\d]{24}$/i.test(v.trim())
      ? `${label} must be a valid ID (24-char hex)`
      : null;

/** Validate all rules in a { field: [validator, ...] } map. Returns errors object. */
export function validate(rules, form) {
  const errors = {};
  for (const [field, validators] of Object.entries(rules)) {
    for (const validator of validators) {
      const msg = validator(form[field]);
      if (msg) {
        errors[field] = msg;
        break; // first error per field
      }
    }
  }
  return errors;
}

// ── Per-form rule sets ────────────────────────────────────────────────────────

export const VEHICLE_RULES = {
  name: [required("Vehicle name")],
  license_plate: [licensePlate],
  vehicle_type_id: [required("Vehicle type")],
  max_load_kg: [positiveNum("Max load capacity")],
  acquisition_date: [required("Acquisition date")],
  acquisition_cost: [positiveNum("Acquisition cost")],
  current_odometer: [minNum("Odometer", 0)],
};

export const DRIVER_RULES = {
  name: [required("Full name")],
  employee_id: [required("Employee ID")],
  license_number: [required("License number")],
  license_category: [required("License category")],
  license_expiry: [futureDate("License expiry")],
  date_of_joining: [pastOrTodayDate("Date of joining")],
};

export const TRIP_RULES = {
  vehicle_id: [mongoId("Vehicle ID")],
  origin: [required("Origin")],
  destination: [required("Destination")],
};

/** Extra cross-field trip check */
export function validateTrip(form) {
  const errors = validate(TRIP_RULES, form);
  if (
    form.scheduled_departure &&
    form.estimated_arrival &&
    new Date(form.estimated_arrival) <= new Date(form.scheduled_departure)
  ) {
    errors.estimated_arrival =
      "Estimated arrival must be after scheduled departure";
  }
  return errors;
}

export const MAINTENANCE_RULES = {
  vehicle_id: [mongoId("Vehicle ID")],
  service_type: [required("Service type")],
  scheduled_date: [required("Scheduled date")],
};

/** Extra: description required when service_type = "other" */
export function validateMaintenance(form) {
  const errors = validate(MAINTENANCE_RULES, form);
  if (form.service_type === "other" && !form.description?.trim()) {
    errors.description = "Description is required for 'Other' service type";
  }
  if (form.status === "completed" && (Number(form.cost) <= 0 || !form.cost)) {
    errors.cost = "Cost must be > 0 for completed logs";
  }
  return errors;
}
