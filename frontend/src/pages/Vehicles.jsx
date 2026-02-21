import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, Archive } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import { PageSpinner } from "../components/ui/Spinner";
import {
  FormField,
  InputField,
  SelectField,
  inputCls,
} from "../components/ui/FormField";
import { useToast } from "../context/ToastContext";
import { validate, VEHICLE_RULES } from "../utils/validate";
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  retireVehicle,
} from "../services/vehicles.service";
import { getVehicleTypes, getRegions } from "../services/meta.service";

const STATUS_FILTERS = [
  "all",
  "available",
  "in_shop",
  "on_trip",
  "out_of_service",
];
const EMPTY = {
  name: "",
  license_plate: "",
  vehicle_type_id: "",
  max_load_kg: "",
  current_odometer: "0",
  acquisition_date: "",
  acquisition_cost: "",
  region_id: "",
  notes: "",
};

export default function Vehicles() {
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
    queryKey: ["vehicles", params],
    queryFn: () => getVehicles(params),
    staleTime: 30_000,
  });

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ["meta-vehicle-types"],
    queryFn: getVehicleTypes,
    staleTime: 300_000,
  });

  const { data: regions = [] } = useQuery({
    queryKey: ["meta-regions"],
    queryFn: getRegions,
    staleTime: 300_000,
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
      setErrors({});
      setTouched({});
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
      setErrors({});
      setTouched({});
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

  const openCreate = () => {
    setForm(EMPTY);
    setErrors({});
    setTouched({});
    setShowCreate(true);
  };

  const openEdit = (v) => {
    setEditing(v);
    setErrors({});
    setTouched({});
    setForm({
      name: v.name ?? "",
      license_plate: v.license_plate ?? "",
      vehicle_type_id: v.vehicle_type?._id ?? v.vehicle_type_id ?? "",
      max_load_kg: v.max_load_kg ?? "",
      current_odometer: v.current_odometer ?? "0",
      acquisition_date: v.acquisition_date?.split("T")[0] ?? "",
      acquisition_cost: v.acquisition_cost ?? "",
      region_id: v.region?._id ?? v.region_id ?? "",
      notes: v.notes ?? "",
    });
  };

  const setF = (k, val) => {
    const next = { ...form, [k]: val };
    if (k === "license_plate") next.license_plate = val.toUpperCase();
    setForm(next);
    if (touched[k]) {
      const e = validate(VEHICLE_RULES, next);
      setErrors((prev) => ({ ...prev, [k]: e[k] }));
    }
  };

  const blur = (k) => {
    setTouched((t) => ({ ...t, [k]: true }));
    const e = validate(VEHICLE_RULES, form);
    setErrors((prev) => ({ ...prev, [k]: e[k] }));
  };

  const handleSave = (isEdit) => {
    const allTouched = Object.fromEntries(
      Object.keys(VEHICLE_RULES).map((k) => [k, true]),
    );
    setTouched(allTouched);
    const e = validate(VEHICLE_RULES, form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix the validation errors before saving.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      license_plate: form.license_plate.trim().toUpperCase(),
      vehicle_type_id: form.vehicle_type_id,
      max_load_kg: Number(form.max_load_kg),
      current_odometer: Number(form.current_odometer),
      acquisition_date: form.acquisition_date,
      acquisition_cost: Number(form.acquisition_cost),
      notes: form.notes,
      ...(form.region_id && { region_id: form.region_id }),
    };
    if (isEdit) {
      updateMut.mutate({ id: editing._id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const typeOptions = vehicleTypes.map((t) => ({
    value: t._id,
    label: `${t.name} (Cat. ${t.required_license_category})`,
  }));
  const regionOptions = regions.map((r) => ({ value: r._id, label: r.name }));

  const vehicleFormJSX = (
    <div className="grid grid-cols-2 gap-4">
      <div onBlur={() => blur("name")}>
        <InputField
          label="Vehicle Name"
          name="name"
          form={form}
          errors={errors}
          onChange={setF}
          required
          placeholder="e.g. Tata Prima #1"
        />
      </div>
      <div onBlur={() => blur("license_plate")}>
        <InputField
          label="License Plate"
          name="license_plate"
          form={form}
          errors={errors}
          onChange={setF}
          required
          placeholder="e.g. MH12AB1234"
        />
      </div>
      <div onBlur={() => blur("vehicle_type_id")}>
        <SelectField
          label="Vehicle Type"
          name="vehicle_type_id"
          form={form}
          errors={errors}
          onChange={setF}
          options={typeOptions}
          required
        />
      </div>
      <div onBlur={() => blur("max_load_kg")}>
        <InputField
          label="Max Load (kg)"
          name="max_load_kg"
          form={form}
          errors={errors}
          onChange={setF}
          type="number"
          min={0.1}
          step="0.1"
          required
        />
      </div>
      <div onBlur={() => blur("acquisition_date")}>
        <InputField
          label="Acquisition Date"
          name="acquisition_date"
          form={form}
          errors={errors}
          onChange={setF}
          type="date"
          required
        />
      </div>
      <div onBlur={() => blur("acquisition_cost")}>
        <InputField
          label="Acquisition Cost (₹)"
          name="acquisition_cost"
          form={form}
          errors={errors}
          onChange={setF}
          type="number"
          min={0.01}
          step="0.01"
          required
        />
      </div>
      <div onBlur={() => blur("current_odometer")}>
        <InputField
          label="Current Odometer (km)"
          name="current_odometer"
          form={form}
          errors={errors}
          onChange={setF}
          type="number"
          min={0}
        />
      </div>
      <SelectField
        label="Region (optional)"
        name="region_id"
        form={form}
        errors={errors}
        onChange={setF}
        options={regionOptions}
      />
      <div className="col-span-2">
        <FormField label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => setF("notes", e.target.value)}
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-none"
            placeholder="Optional notes..."
          />
        </FormField>
      </div>
    </div>
  );

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
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
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
                  "Type",
                  "Region",
                  "Max Load",
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
                  <td className="px-4 py-3">
                    <div className="text-gray-400">
                      {v.vehicle_type?.name ?? "—"}
                    </div>
                    {v.vehicle_type?.required_license_category && (
                      <div className="text-gray-600 text-xs mt-0.5">
                        Lic. {v.vehicle_type.required_license_category}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {v.region?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {v.max_load_kg != null
                      ? `${Number(v.max_load_kg).toLocaleString()} kg`
                      : "—"}
                  </td>
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
                      {v.status !== "out_of_service" && (
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                "Retire this vehicle? It will be set to out of service.",
                              )
                            )
                              retireMut.mutate(v._id);
                          }}
                          className="p-1.5 text-gray-500 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-colors"
                          title="Retire"
                        >
                          <Archive size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (
                            window.confirm("Delete this vehicle permanently?")
                          )
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

      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setErrors({});
          setTouched({});
        }}
        title="Add New Vehicle"
        size="lg"
      >
        {vehicleFormJSX}
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
            {createMut.isPending ? "Saving..." : "Add Vehicle"}
          </button>
        </div>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => {
          setEditing(null);
          setErrors({});
          setTouched({});
        }}
        title="Edit Vehicle"
        size="lg"
      >
        {editing && vehicleFormJSX}
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
