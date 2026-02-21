import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, Wrench } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import { PageSpinner } from "../components/ui/Spinner";
import { useToast } from "../context/ToastContext";
import {
  getMaintenanceLogs,
  createMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog,
} from "../services/maintenance.service";

const STATUS_FILTERS = [
  "all",
  "pending",
  "in_progress",
  "completed",
  "cancelled",
];
const SERVICE_TYPES = [
  "preventive",
  "corrective",
  "inspection",
  "tire_change",
  "oil_change",
  "brake_service",
  "other",
];
const EMPTY = {
  vehicle_id: "",
  service_type: "preventive",
  description: "",
  cost: "",
  scheduled_date: "",
  technician_name: "",
};

export default function Maintenance() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const toast = useToast();
  const qc = useQueryClient();

  const params = status !== "all" ? { status } : {};
  const { data, isLoading } = useQuery({
    queryKey: ["maintenance", params],
    queryFn: () => getMaintenanceLogs(params),
    staleTime: 30_000,
  });

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

  const openEdit = (l) => {
    setEditing(l);
    setForm({
      vehicle_id: l.vehicle?._id ?? "",
      service_type: l.service_type ?? "other",
      description: l.description ?? "",
      cost: l.cost ?? "",
      scheduled_date: l.dates?.scheduled?.split("T")[0] ?? "",
      technician_name: l.technician_name ?? "",
      status: l.status,
    });
  };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
          onClick={() => setShowCreate(true)}
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
                  "Scheduled",
                  "Technician",
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
                  <td className="px-4 py-3 text-white font-medium">
                    {l.vehicle?.name ?? "—"}
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
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {l.dates?.scheduled
                      ? new Date(l.dates.scheduled).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {l.technician_name ?? "—"}
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
      {[
        {
          open: showCreate,
          onClose: () => setShowCreate(false),
          title: "New Maintenance Log",
          onSave: () => createMut.mutate(form),
          loading: createMut.isPending,
        },
        {
          open: !!editing,
          onClose: () => setEditing(null),
          title: "Edit Log",
          onSave: () => updateMut.mutate({ id: editing._id, data: form }),
          loading: updateMut.isPending,
        },
      ].map(({ open, onClose, title, onSave, loading }, i) => (
        <Modal key={i} open={open} onClose={onClose} title={title}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1">
                Vehicle ID
              </label>
              <input
                value={form.vehicle_id}
                onChange={(e) => setF("vehicle_id", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">
                Service Type
              </label>
              <select
                value={form.service_type}
                onChange={(e) => setF("service_type", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              >
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">
                Cost (₹)
              </label>
              <input
                type="number"
                value={form.cost}
                onChange={(e) => setF("cost", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => setF("scheduled_date", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-gray-400 text-xs mb-1">
                Technician Name
              </label>
              <input
                value={form.technician_name}
                onChange={(e) => setF("technician_name", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-gray-400 text-xs mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setF("description", e.target.value)}
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            {editing && (
              <div>
                <label className="block text-gray-400 text-xs mb-1">
                  Status
                </label>
                <select
                  value={form.status ?? editing.status}
                  onChange={(e) => setF("status", e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                >
                  {["pending", "in_progress", "completed", "cancelled"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ),
                  )}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:border-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={loading}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-60 transition-colors"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </Modal>
      ))}
    </AppLayout>
  );
}
