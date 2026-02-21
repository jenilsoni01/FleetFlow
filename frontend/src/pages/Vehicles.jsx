import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, Archive } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import { PageSpinner } from "../components/ui/Spinner";
import { useToast } from "../context/ToastContext";
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  retireVehicle,
} from "../services/vehicles.service";

const STATUS_FILTERS = ["all", "available", "in_shop", "in_transit", "retired"];
const EMPTY = {
  name: "",
  license_plate: "",
  make: "",
  model: "",
  year: "",
  current_odometer: 0,
};

export default function Vehicles() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const toast = useToast();
  const qc = useQueryClient();

  const params = status !== "all" ? { status } : {};
  const { data, isLoading } = useQuery({
    queryKey: ["vehicles", params],
    queryFn: () => getVehicles(params),
    staleTime: 30_000,
  });

  const vehicles = (data?.vehicles ?? data ?? []).filter((v) =>
    search
      ? v.name?.toLowerCase().includes(search.toLowerCase()) ||
        v.license_plate?.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  const inv = () => qc.invalidateQueries({ queryKey: ["vehicles"] });

  const createMut = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      toast.success("Vehicle created");
      setShowCreate(false);
      setForm(EMPTY);
      inv();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message ?? "Failed to create"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateVehicle(id, data),
    onSuccess: () => {
      toast.success("Vehicle updated");
      setEditing(null);
      inv();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message ?? "Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      toast.success("Vehicle deleted");
      inv();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message ?? "Failed to delete"),
  });

  const retireMut = useMutation({
    mutationFn: retireVehicle,
    onSuccess: () => {
      toast.success("Vehicle retired");
      inv();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message ?? "Failed to retire"),
  });

  const openEdit = (v) => {
    setEditing(v);
    setForm({
      name: v.name,
      license_plate: v.license_plate,
      make: v.make ?? "",
      model: v.model ?? "",
      year: v.year ?? "",
      current_odometer: v.current_odometer ?? 0,
    });
  };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const fields = [
    { label: "Vehicle Name", key: "name" },
    { label: "License Plate", key: "license_plate" },
    { label: "Make", key: "make" },
    { label: "Model", key: "model" },
    { label: "Year", key: "year", type: "number" },
    { label: "Current Odometer (km)", key: "current_odometer", type: "number" },
  ];

  return (
    <AppLayout title="Vehicles">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            placeholder="Search name or plate..."
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
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : vehicles.length === 0 ? (
        <EmptyState title="No vehicles found" icon={Archive} />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {[
                  "Name",
                  "License Plate",
                  "Make / Model",
                  "Year",
                  "Odometer",
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
              {vehicles.map((v) => (
                <tr
                  key={v._id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-white font-medium">{v.name}</td>
                  <td className="px-4 py-3 text-gray-300 font-mono">
                    {v.license_plate}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {[v.make, v.model].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{v.year ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {v.current_odometer?.toLocaleString() ?? "—"} km
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={v.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(v)}
                        className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      {v.status !== "retired" && (
                        <button
                          onClick={() => retireMut.mutate(v._id)}
                          className="p-1.5 text-gray-500 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-colors"
                          title="Retire"
                        >
                          <Archive size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm("Delete this vehicle?"))
                            deleteMut.mutate(v._id);
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
          title: "Add New Vehicle",
          onSave: () => createMut.mutate(form),
          loading: createMut.isPending,
        },
        {
          open: !!editing,
          onClose: () => setEditing(null),
          title: "Edit Vehicle",
          onSave: () => updateMut.mutate({ id: editing._id, data: form }),
          loading: updateMut.isPending,
        },
      ].map(({ open, onClose, title, onSave, loading }, i) => (
        <Modal key={i} open={open} onClose={onClose} title={title}>
          <div className="grid grid-cols-2 gap-4">
            {fields.map(({ label, key, type = "text" }) => (
              <div key={key}>
                <label className="block text-gray-400 text-xs mb-1">
                  {label}
                </label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => setF(key, e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
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
