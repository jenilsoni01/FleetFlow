import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, Wrench } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import { PageSpinner } from "../components/ui/Spinner";
import { FormField, InputField, SelectField } from "../components/ui/FormField";
import { useToast } from "../context/ToastContext";
import { MAINTENANCE_RULES, validateMaintenance } from "../utils/validate";
import {
  getMaintenanceLogs,
  createMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog,
} from "../services/maintenance.service";
import { getVehicles } from "../services/vehicles.service";

const STATUS_FILTERS = [
  "all",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
];
const SERVICE_TYPES = [
  "oil_change",
  "tire_replacement",
  "brake_service",
  "engine_repair",
  "body_work",
  "inspection",
  "other",
];
const EMPTY = {
  vehicle_id: "",
  service_type: "oil_change",
  description: "",
  cost: "",
  scheduled_date: "",
  service_provider: "",
};

export default function Maintenance() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const toast = useToast();
  const qc = useQueryClient();

  const params = status !== "all" ? { status } : {};
  const { data, isLoading } = useQuery({
    queryKey: ["maintenance", params],
    queryFn: () => getMaintenanceLogs(params),
    staleTime: 30_000,
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles", {}],
    queryFn: () => getVehicles({}),
    staleTime: 60_000,
  });
  const vehicleOptions = (vehiclesData?.vehicles ?? vehiclesData ?? []).map(
    (v) => ({ value: v._id, label: `${v.name} — ${v.license_plate}` }),
  );

  const logs = (data?.logs ?? data ?? []).filter((l) =>
    search
      ? l.vehicle?.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.description?.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  const inv = () => qc.invalidateQueries({ queryKey: ["maintenance"] });

  const createMut = useMutation({
    mutationFn: createMaintenanceLog,
    onSuccess: () => {
      toast.success("Log created");
      setShowCreate(false);
      setForm(EMPTY);
      setErrors({});
      setTouched({});
      inv();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message ?? "Failed to create"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateMaintenanceLog(id, data),
    onSuccess: () => {
      toast.success("Log updated");
      setEditing(null);
      setErrors({});
      setTouched({});
      inv();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message ?? "Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteMaintenanceLog,
    onSuccess: () => {
      toast.success("Log deleted");
      inv();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message ?? "Failed to delete"),
  });

  const openCreate = () => {
    setForm(EMPTY);
    setErrors({});
    setTouched({});
    setShowCreate(true);
  };

  const openEdit = (l) => {
    setEditing(l);
    setErrors({});
    setTouched({});
    setForm({
      vehicle_id: l.vehicle?._id ?? "",
      service_type: l.service_type ?? "oil_change",
      description: l.description ?? "",
      cost: l.cost ?? "",
      scheduled_date: l.dates?.scheduled?.split("T")[0] ?? "",
      service_provider: l.service_provider ?? "",
      status: l.status,
    });
  };

  const setF = (k, val) => {
    const next = { ...form, [k]: val };
    setForm(next);
    if (touched[k]) {
      const e = validateMaintenance(next);
      setErrors((prev) => ({ ...prev, [k]: e[k] }));
    }
  };

  const blur = (k) => {
    setTouched((t) => ({ ...t, [k]: true }));
    const e = validateMaintenance(form);
    setErrors((prev) => ({ ...prev, [k]: e[k] }));
  };

  const handleSave = (isEdit) => {
    const allTouched = Object.fromEntries(
      Object.keys(MAINTENANCE_RULES).map((k) => [k, true]),
    );
    setTouched(allTouched);
    const e = validateMaintenance(form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix the validation errors before saving.");
      return;
    }
    const payload = {
      vehicle_id: form.vehicle_id,
      service_type: form.service_type,
      description: form.description || undefined,
      cost: form.cost ? Number(form.cost) : undefined,
      scheduled_date: form.scheduled_date,
      service_provider: form.service_provider || undefined,
      ...(isEdit && form.status && { status: form.status }),
    };
    if (isEdit) {
      updateMut.mutate({ id: editing._id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  return (
    <AppLayout title="Maintenance">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            placeholder="Search vehicle or description..."
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
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${status === s ? "bg-indigo-600 text-white" : "bg-gray-900 border border-gray-700 text-gray-400 hover:text-white"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> New Log
        </button>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No maintenance logs"
          icon={Wrench}
          description="Log a vehicle service to get started."
        />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {[
                  "Vehicle",
                  "Service Type",
                  "Description",
                  "Cost",
                  "Odometer",
                  "Dates",
                  "Provider",
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
              {logs.map((l) => (
                <tr
                  key={l._id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">
                      {l.vehicle?.name ?? "—"}
                    </div>
                    {l.vehicle?.license_plate && (
                      <div className="text-gray-600 text-xs mt-0.5 font-mono">
                        {l.vehicle.license_plate}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 capitalize">
                    {l.service_type?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-48 truncate text-xs">
                    {l.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {l.cost != null
                      ? `₹${Number(l.cost).toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {l.odometer_at_service != null
                      ? `${Number(l.odometer_at_service).toLocaleString()} km`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="text-gray-500">
                      Sched:{" "}
                      {l.dates?.scheduled
                        ? new Date(l.dates.scheduled).toLocaleDateString()
                        : "—"}
                    </div>
                    {l.dates?.start && (
                      <div className="text-blue-400/70 mt-0.5">
                        Start: {new Date(l.dates.start).toLocaleDateString()}
                      </div>
                    )}
                    {l.dates?.completion && (
                      <div className="text-emerald-400/70 mt-0.5">
                        Done:{" "}
                        {new Date(l.dates.completion).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {l.service_provider ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={l.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(l)}
                        className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm("Delete this log?"))
                            deleteMut.mutate(l._id);
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setErrors({});
          setTouched({});
        }}
        title="New Maintenance Log"
      >
        <div className="grid grid-cols-2 gap-4">
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
          <div onBlur={() => blur("service_type")}>
            <SelectField
              label="Service Type"
              name="service_type"
              form={form}
              errors={errors}
              onChange={setF}
              required
              options={SERVICE_TYPES.map((t) => ({
                value: t,
                label: t.replace(/_/g, " "),
              }))}
            />
          </div>
          <div onBlur={() => blur("scheduled_date")}>
            <InputField
              label="Scheduled Date"
              name="scheduled_date"
              form={form}
              errors={errors}
              onChange={setF}
              type="date"
              required
            />
          </div>
          <InputField
            label="Cost (₹)"
            name="cost"
            form={form}
            errors={errors}
            onChange={setF}
            type="number"
            min={0}
            step="0.01"
          />
          <div className="col-span-2">
            <InputField
              label="Service Provider"
              name="service_provider"
              form={form}
              errors={errors}
              onChange={setF}
            />
          </div>
          <div className="col-span-2" onBlur={() => blur("description")}>
            <FormField
              label={`Description${form.service_type === "other" ? " *" : ""}`}
              error={errors.description}
            >
              <textarea
                value={form.description}
                onChange={(e) => setF("description", e.target.value)}
                rows={2}
                className={`w-full bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none resize-none border ${errors.description ? "border-red-500" : "border-gray-700 focus:border-indigo-500"}`}
                placeholder={
                  form.service_type === "other"
                    ? 'Required for "Other" service type'
                    : "Optional notes..."
                }
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
            className="px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:border-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={createMut.isPending}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-60 transition-colors"
          >
            {createMut.isPending ? "Saving..." : "Create Log"}
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editing}
        onClose={() => {
          setEditing(null);
          setErrors({});
          setTouched({});
        }}
        title="Edit Log"
      >
        {editing && (
          <div className="grid grid-cols-2 gap-4">
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
            <div onBlur={() => blur("service_type")}>
              <SelectField
                label="Service Type"
                name="service_type"
                form={form}
                errors={errors}
                onChange={setF}
                required
                options={SERVICE_TYPES.map((t) => ({
                  value: t,
                  label: t.replace(/_/g, " "),
                }))}
              />
            </div>
            <div onBlur={() => blur("scheduled_date")}>
              <InputField
                label="Scheduled Date"
                name="scheduled_date"
                form={form}
                errors={errors}
                onChange={setF}
                type="date"
                required
              />
            </div>
            <InputField
              label="Cost (₹)"
              name="cost"
              form={form}
              errors={errors}
              onChange={setF}
              type="number"
              min={0}
              step="0.01"
            />
            <InputField
              label="Service Provider"
              name="service_provider"
              form={form}
              errors={errors}
              onChange={setF}
            />
            <div>
              <label className="block text-gray-400 text-xs mb-1">Status</label>
              <select
                value={form.status ?? editing.status}
                onChange={(e) => setF("status", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              >
                {["scheduled", "in_progress", "completed", "cancelled"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="col-span-2" onBlur={() => blur("description")}>
              <FormField
                label={`Description${form.service_type === "other" ? " *" : ""}`}
                error={errors.description}
              >
                <textarea
                  value={form.description}
                  onChange={(e) => setF("description", e.target.value)}
                  rows={2}
                  className={`w-full bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none resize-none border ${errors.description ? "border-red-500" : "border-gray-700 focus:border-indigo-500"}`}
                  placeholder={
                    form.service_type === "other"
                      ? 'Required for "Other" service type'
                      : "Optional..."
                  }
                />
              </FormField>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setEditing(null);
              setErrors({});
              setTouched({});
            }}
            className="px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:border-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={updateMut.isPending}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-60 transition-colors"
          >
            {updateMut.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}
