import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Play,
  CheckCircle,
  X,
  Send,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import { PageSpinner } from "../components/ui/Spinner";
import { FormField, InputField, SelectField } from "../components/ui/FormField";
import { useToast } from "../context/ToastContext";
import { TRIP_RULES, validateTrip } from "../utils/validate";
import {
  getTrips,
  createTrip,
  dispatchTrip,
  startTrip,
  completeTrip,
  cancelTrip,
} from "../services/trips.service";
import { getVehicles } from "../services/vehicles.service";
import { getDrivers } from "../services/drivers.service";
import { useNavigate } from "react-router-dom";

const STATUS_FILTERS = [
  "all",
  "draft",
  "dispatched",
  "in_transit",
  "completed",
  "cancelled",
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const EMPTY_FORM = {
  origin: "",
  destination: "",
  driver_id: "",
  vehicle_id: "",
  scheduled_departure: "",
  estimated_arrival: "",
  cargo_description: "",
  cargo_weight_kg: "",
  priority: "medium",
  notes: "",
};

export default function Trips() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [actionModal, setActionModal] = useState(null); // { type, trip }
  const [cancelReason, setCancelReason] = useState("");
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const params = { ...(status !== "all" && { status }) };
  const { data, isLoading } = useQuery({
    queryKey: ["trips", params],
    queryFn: () => getTrips(params),
    staleTime: 30_000,
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles", {}],
    queryFn: () => getVehicles({}),
    staleTime: 60_000,
  });
  const { data: driversData } = useQuery({
    queryKey: ["drivers", {}],
    queryFn: () => getDrivers({}),
    staleTime: 60_000,
  });

  const vehicleOptions = (vehiclesData?.vehicles ?? vehiclesData ?? [])
    .filter((v) => v.status === "available" || v.status === "in_shop")
    .map((v) => ({ value: v._id, label: `${v.name} — ${v.license_plate}` }));
  const driverOptions = (driversData?.drivers ?? driversData ?? [])
    .filter((d) => d.status === "on_duty" || d.status === "off_duty")
    .map((d) => ({ value: d._id, label: `${d.name} (${d.employee_id})` }));

  const trips = (data?.trips ?? data ?? []).filter((t) =>
    search
      ? t.trip_reference?.toLowerCase().includes(search.toLowerCase()) ||
        t.vehicle?.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.driver?.name?.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ["trips"] });

  const createMut = useMutation({
    mutationFn: createTrip,
    onSuccess: () => {
      toast.success("Trip created");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setErrors({});
      setTouched({});
      invalidate();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message ?? "Failed to create trip"),
  });

  const actionMut = useMutation({
    mutationFn: ({ type, id, payload }) => {
      if (type === "dispatch") return dispatchTrip(id, payload);
      if (type === "start") return startTrip(id, payload);
      if (type === "complete") return completeTrip(id, payload);
      if (type === "cancel") return cancelTrip(id, payload);
    },
    onSuccess: (_, { type }) => {
      toast.success(`Trip ${type}ed successfully`);
      setActionModal(null);
      setCancelReason("");
      invalidate();
    },
    onError: (e) => toast.error(e.response?.data?.message ?? "Action failed"),
  });

  const handleAction = (type) => {
    const { trip } = actionModal;
    const payload =
      type === "cancel" ? { cancellation_reason: cancelReason } : {};
    actionMut.mutate({ type, id: trip._id, payload });
  };

  const setF = (k, val) => {
    const next = { ...form, [k]: val };
    setForm(next);
    if (touched[k]) {
      const e = validateTrip(next);
      setErrors((prev) => ({ ...prev, [k]: e[k] }));
    }
  };

  const blur = (k) => {
    setTouched((t) => ({ ...t, [k]: true }));
    const e = validateTrip(form);
    setErrors((prev) => ({ ...prev, [k]: e[k] }));
  };

  const handleCreate = () => {
    const allTouched = Object.fromEntries(
      Object.keys(TRIP_RULES).map((k) => [k, true]),
    );
    setTouched(allTouched);
    const e = validateTrip(form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix the validation errors before saving.");
      return;
    }
    createMut.mutate({
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id || undefined,
      scheduled_departure: form.scheduled_departure || undefined,
      estimated_arrival: form.estimated_arrival || undefined,
      cargo_description: form.cargo_description || undefined,
      cargo_weight_kg: form.cargo_weight_kg
        ? Number(form.cargo_weight_kg)
        : undefined,
      priority: form.priority || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <AppLayout title="Trips">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            placeholder="Search trips, vehicles, drivers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                status === s
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-900 border border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> New Trip
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <PageSpinner />
      ) : trips.length === 0 ? (
        <EmptyState
          title="No trips found"
          description="Create your first trip to get started."
          icon={Send}
        />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {[
                  "Reference",
                  "Vehicle",
                  "Driver",
                  "Origin → Destination",
                  "Scheduled",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-gray-500 font-medium text-xs uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr
                  key={trip._id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-indigo-400 font-mono text-xs font-medium">
                    {trip.trip_reference}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {trip.vehicle?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {trip.driver?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-48 truncate text-xs">
                    {trip.origin?.address} → {trip.destination?.address}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {trip.schedule?.scheduled_departure
                      ? new Date(
                          trip.schedule.scheduled_departure,
                        ).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={trip.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/trips/${trip._id}`)}
                        className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                      {trip.status === "draft" && (
                        <button
                          onClick={() =>
                            setActionModal({ type: "dispatch", trip })
                          }
                          className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-colors"
                          title="Dispatch"
                        >
                          <Send size={14} />
                        </button>
                      )}
                      {trip.status === "dispatched" && (
                        <button
                          onClick={() =>
                            setActionModal({ type: "start", trip })
                          }
                          className="p-1.5 text-gray-500 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-colors"
                          title="Start"
                        >
                          <Play size={14} />
                        </button>
                      )}
                      {trip.status === "in_transit" && (
                        <button
                          onClick={() =>
                            setActionModal({ type: "complete", trip })
                          }
                          className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition-colors"
                          title="Complete"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                      {["draft", "dispatched"].includes(trip.status) && (
                        <button
                          onClick={() =>
                            setActionModal({ type: "cancel", trip })
                          }
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setErrors({});
          setTouched({});
        }}
        title="Create New Trip"
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div onBlur={() => blur("origin")}>
            <InputField
              label="Origin"
              name="origin"
              form={form}
              errors={errors}
              onChange={setF}
              required
              placeholder="e.g. Mumbai Warehouse"
            />
          </div>
          <div onBlur={() => blur("destination")}>
            <InputField
              label="Destination"
              name="destination"
              form={form}
              errors={errors}
              onChange={setF}
              required
              placeholder="e.g. Pune Depot"
            />
          </div>
          <div onBlur={() => blur("vehicle_id")}>
            <SelectField
              label="Vehicle"
              name="vehicle_id"
              form={form}
              errors={errors}
              onChange={setF}
              options={vehicleOptions}
              required
            />
          </div>
          <SelectField
            label="Driver (optional)"
            name="driver_id"
            form={form}
            errors={errors}
            onChange={setF}
            options={driverOptions}
          />
          <div onBlur={() => blur("scheduled_departure")}>
            <InputField
              label="Scheduled Departure"
              name="scheduled_departure"
              form={form}
              errors={errors}
              onChange={setF}
              type="datetime-local"
            />
          </div>
          <div onBlur={() => blur("estimated_arrival")}>
            <InputField
              label="Estimated Arrival"
              name="estimated_arrival"
              form={form}
              errors={errors}
              onChange={setF}
              type="datetime-local"
            />
          </div>
          <InputField
            label="Cargo Description"
            name="cargo_description"
            form={form}
            errors={errors}
            onChange={setF}
            placeholder="e.g. Electronics"
          />
          <InputField
            label="Cargo Weight (kg)"
            name="cargo_weight_kg"
            form={form}
            errors={errors}
            onChange={setF}
            type="number"
            min={0}
            step="0.1"
          />
          <SelectField
            label="Priority"
            name="priority"
            form={form}
            errors={errors}
            onChange={setF}
            options={PRIORITY_OPTIONS}
          />
          <div className="col-span-2">
            <FormField label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => setF("notes", e.target.value)}
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </FormField>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setShowCreate(false);
              setErrors({});
              setTouched({});
            }}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:border-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={createMut.isPending}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60"
          >
            {createMut.isPending ? "Creating..." : "Create Trip"}
          </button>
        </div>
      </Modal>

      {/* Action Confirmation Modal */}
      <Modal
        open={!!actionModal}
        onClose={() => {
          setActionModal(null);
          setCancelReason("");
        }}
        title={
          actionModal
            ? `${actionModal.type.charAt(0).toUpperCase() + actionModal.type.slice(1)} Trip`
            : ""
        }
        size="sm"
      >
        {actionModal && (
          <>
            <p className="text-gray-400 text-sm mb-4">
              {actionModal.type === "cancel"
                ? "Please provide a reason for cancellation."
                : `Are you sure you want to ${actionModal.type} trip ${actionModal.trip.trip_reference}?`}
            </p>
            {actionModal.type === "cancel" && (
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Cancellation reason..."
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-none mb-4"
              />
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setActionModal(null);
                  setCancelReason("");
                }}
                className="px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:border-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(actionModal.type)}
                disabled={
                  actionMut.isPending ||
                  (actionModal.type === "cancel" && !cancelReason.trim())
                }
                className={`px-4 py-2 text-sm rounded-lg text-white transition-colors disabled:opacity-60 ${
                  actionModal.type === "cancel"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {actionMut.isPending ? "Processing..." : "Confirm"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </AppLayout>
  );
}
