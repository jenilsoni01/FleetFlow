import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Users,
  ToggleLeft,
  ToggleRight,
  ShieldOff,
  BarChart2,
  Trash2,
  AlertTriangle,
  Edit2,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import { PageSpinner } from "../components/ui/Spinner";
import { useToast } from "../context/ToastContext";
import { InputField, SelectField } from "../components/ui/FormField";
import { validate, DRIVER_RULES } from "../utils/validate";
import {
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  updateDriverStatus,
  suspendDriver,
  getDriverPerformance,
} from "../services/drivers.service";

const LICENSE_CATEGORIES = ["A", "B", "C", "D", "BE", "CE"];

const STATUS_FILTERS = ["all", "on_duty", "off_duty", "on_trip", "suspended"];
const EMPTY = {
  name: "",
  employee_id: "",
  license_number: "",
  license_category: "B",
  license_expiry: "",
  date_of_joining: "",
};

export default function Drivers() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [suspendModal, setSuspendModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [perfModal, setPerfModal] = useState(null);
  const toast = useToast();
  const qc = useQueryClient();

  const params = status !== "all" ? { status } : {};
  const { data, isLoading } = useQuery({
    queryKey: ["drivers", params],
    queryFn: () => getDrivers(params),
    staleTime: 30_000,
  });

  const drivers = (data?.drivers ?? data ?? []).filter((d) =>
    search
      ? d.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.employee_id?.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  const inv = () => qc.invalidateQueries({ queryKey: ["drivers"] });

  const createMut = useMutation({
    mutationFn: createDriver,
    onSuccess: () => {
      toast.success("Driver created");
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
    mutationFn: ({ id, data }) => updateDriver(id, data),
    onSuccess: () => {
      toast.success("Driver updated");
      setEditing(null);
      setErrors({});
      setTouched({});
      inv();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message ?? "Failed to update"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateDriverStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      inv();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message ?? "Cannot change status"),
  });

  const suspendMut = useMutation({
    mutationFn: ({ id, reason }) => suspendDriver(id, reason),
    onSuccess: (d) => {
      toast.success(
        `Driver suspended. ${d.tripsAutoCancel ?? 0} trips cancelled.`,
      );
      setSuspendModal(null);
      setSuspendReason("");
      inv();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message ?? "Failed to suspend"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDriver,
    onSuccess: () => {
      toast.success("Driver deleted");
      inv();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message ?? "Failed to delete"),
  });

  const { data: perfData, isFetching: perfLoading } = useQuery({
    queryKey: ["driverPerf", perfModal?._id],
    queryFn: () => getDriverPerformance(perfModal._id),
    enabled: !!perfModal,
    staleTime: 60_000,
  });

  const openCreate = () => {
    setForm(EMPTY);
    setErrors({});
    setTouched({});
    setShowCreate(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setErrors({});
    setTouched({});
    setForm({
      name: d.name ?? "",
      employee_id: d.employee_id ?? "",
      license_number: d.license_number ?? "",
      license_category: d.license_category ?? "B",
      license_expiry: d.license_expiry?.split("T")[0] ?? "",
      date_of_joining: d.date_of_joining?.split("T")[0] ?? "",
    });
  };

  const setF = (k, val) => {
    const next = { ...form, [k]: val };
    if (k === "employee_id" || k === "license_number")
      next[k] = val.toUpperCase();
    setForm(next);
    if (touched[k]) {
      const e = validate(DRIVER_RULES, next);
      setErrors((prev) => ({ ...prev, [k]: e[k] }));
    }
  };

  const blur = (k) => {
    setTouched((t) => ({ ...t, [k]: true }));
    const e = validate(DRIVER_RULES, form);
    setErrors((prev) => ({ ...prev, [k]: e[k] }));
  };

  const handleSave = (isEdit) => {
    const allTouched = Object.fromEntries(
      Object.keys(DRIVER_RULES).map((k) => [k, true]),
    );
    setTouched(allTouched);
    const e = validate(DRIVER_RULES, form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix the validation errors before saving.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      employee_id: form.employee_id.trim().toUpperCase(),
      license_number: form.license_number.trim().toUpperCase(),
      license_category: form.license_category,
      license_expiry: form.license_expiry,
      date_of_joining: form.date_of_joining,
    };
    if (isEdit) {
      updateMut.mutate({ id: editing._id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  return (
    <AppLayout title="Drivers">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            placeholder="Search name or employee ID..."
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
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Driver
        </button>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : drivers.length === 0 ? (
        <EmptyState title="No drivers found" icon={Users} />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {[
                  "Name",
                  "Employee ID",
                  "License",
                  "Expiry / Med. Cert",
                  "Compliance",
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
              {drivers.map((d) => (
                <tr
                  key={d._id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{d.name}</div>
                    {d.contact?.phone && (
                      <div className="text-gray-600 text-xs mt-0.5">
                        {d.contact.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-400 font-mono text-xs">
                      {d.employee_id}
                    </div>
                    {d.region?.name && (
                      <div className="text-gray-600 text-xs mt-0.5">
                        {d.region.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {d.license_number}{" "}
                    <span className="text-gray-600">
                      ({d.license_category})
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-400 text-xs">
                      {d.license_expiry
                        ? new Date(d.license_expiry).toLocaleDateString()
                        : "—"}
                    </div>
                    {d.license_expiry_warning && (
                      <div className="text-amber-400 text-xs flex items-center gap-1">
                        <AlertTriangle size={10} /> {d.license_days_remaining}d
                        left
                      </div>
                    )}
                    {d.medical_cert_expiry && (
                      <div className="text-gray-600 text-xs mt-1">
                        Med:{" "}
                        {new Date(d.medical_cert_expiry).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={d.compliance_status} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={d.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(d)}
                        className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setPerfModal(d)}
                        className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-colors"
                        title="Performance"
                      >
                        <BarChart2 size={14} />
                      </button>
                      {d.status === "on_duty" && (
                        <button
                          onClick={() =>
                            statusMut.mutate({ id: d._id, status: "off_duty" })
                          }
                          className="p-1.5 text-gray-500 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-colors"
                          title="Set Off Duty"
                        >
                          <ToggleRight size={14} />
                        </button>
                      )}
                      {d.status === "off_duty" && (
                        <button
                          onClick={() =>
                            statusMut.mutate({ id: d._id, status: "on_duty" })
                          }
                          className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition-colors"
                          title="Set On Duty"
                        >
                          <ToggleLeft size={14} />
                        </button>
                      )}
                      {d.status !== "suspended" && (
                        <button
                          onClick={() => setSuspendModal(d)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                          title="Suspend"
                        >
                          <ShieldOff size={14} />
                        </button>
                      )}
                      {d.status === "suspended" && (
                        <button
                          onClick={() =>
                            statusMut.mutate({ id: d._id, status: "on_duty" })
                          }
                          className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition-colors"
                          title="Reinstate"
                        >
                          <ToggleLeft size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm("Delete this driver?"))
                            deleteMut.mutate(d._id);
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
        title="Add Driver"
      >
        <div className="grid grid-cols-2 gap-4">
          <div onBlur={() => blur("name")}>
            <InputField
              label="Full Name"
              name="name"
              form={form}
              errors={errors}
              onChange={setF}
              required
              placeholder="e.g. Ramesh Kumar"
            />
          </div>
          <div onBlur={() => blur("employee_id")}>
            <InputField
              label="Employee ID"
              name="employee_id"
              form={form}
              errors={errors}
              onChange={setF}
              required
              placeholder="e.g. EMP001"
            />
          </div>
          <div onBlur={() => blur("license_number")}>
            <InputField
              label="License Number"
              name="license_number"
              form={form}
              errors={errors}
              onChange={setF}
              required
              placeholder="e.g. MH1420240012345"
            />
          </div>
          <div onBlur={() => blur("license_category")}>
            <SelectField
              label="License Category"
              name="license_category"
              form={form}
              errors={errors}
              onChange={setF}
              required
              options={LICENSE_CATEGORIES.map((c) => ({
                value: c,
                label: `Category ${c}`,
              }))}
            />
          </div>
          <div onBlur={() => blur("license_expiry")}>
            <InputField
              label="License Expiry"
              name="license_expiry"
              form={form}
              errors={errors}
              onChange={setF}
              type="date"
              required
            />
          </div>
          <div onBlur={() => blur("date_of_joining")}>
            <InputField
              label="Date of Joining"
              name="date_of_joining"
              form={form}
              errors={errors}
              onChange={setF}
              type="date"
              required
            />
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
            {createMut.isPending ? "Saving..." : "Add Driver"}
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
        title="Edit Driver"
      >
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <div onBlur={() => blur("name")}>
              <InputField
                label="Full Name"
                name="name"
                form={form}
                errors={errors}
                onChange={setF}
                required
              />
            </div>
            <div onBlur={() => blur("employee_id")}>
              <InputField
                label="Employee ID"
                name="employee_id"
                form={form}
                errors={errors}
                onChange={setF}
                required
              />
            </div>
            <div onBlur={() => blur("license_number")}>
              <InputField
                label="License Number"
                name="license_number"
                form={form}
                errors={errors}
                onChange={setF}
                required
              />
            </div>
            <div onBlur={() => blur("license_category")}>
              <SelectField
                label="License Category"
                name="license_category"
                form={form}
                errors={errors}
                onChange={setF}
                required
                options={LICENSE_CATEGORIES.map((c) => ({
                  value: c,
                  label: `Category ${c}`,
                }))}
              />
            </div>
            <div onBlur={() => blur("license_expiry")}>
              <InputField
                label="License Expiry"
                name="license_expiry"
                form={form}
                errors={errors}
                onChange={setF}
                type="date"
                required
              />
            </div>
            <div onBlur={() => blur("date_of_joining")}>
              <InputField
                label="Date of Joining"
                name="date_of_joining"
                form={form}
                errors={errors}
                onChange={setF}
                type="date"
                required
              />
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

      <Modal
        open={!!suspendModal}
        onClose={() => {
          setSuspendModal(null);
          setSuspendReason("");
        }}
        title="Suspend Driver"
        size="sm"
      >
        {suspendModal && (
          <>
            <p className="text-gray-400 text-sm mb-3">
              Suspending{" "}
              <span className="text-white font-medium">
                {suspendModal.name}
              </span>{" "}
              will cancel all their dispatched trips.
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Reason for suspension..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSuspendModal(null);
                  setSuspendReason("");
                }}
                className="px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  suspendMut.mutate({
                    id: suspendModal._id,
                    reason: suspendReason,
                  })
                }
                disabled={suspendMut.isPending || !suspendReason.trim()}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-60"
              >
                {suspendMut.isPending ? "Suspending..." : "Suspend"}
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!perfModal}
        onClose={() => setPerfModal(null)}
        title={`Performance — ${perfModal?.name ?? ""}`}
        size="md"
      >
        {perfLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : perfData ? (
          <div className="space-y-6">
            {/* Safety Score */}
            <div className="text-center">
              <div
                className={`text-5xl font-bold mb-1 ${perfData.safety.score_color === "green" ? "text-emerald-400" : perfData.safety.score_color === "yellow" ? "text-amber-400" : "text-red-400"}`}
              >
                {perfData.safety.score}
              </div>
              <p className="text-gray-500 text-sm">Safety Score / 100</p>
            </div>
            {/* Trip Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Trips", value: perfData.trips.total },
                {
                  label: "Completion Rate",
                  value: `${perfData.trips.completion_rate_pct}%`,
                },
                { label: "Completed", value: perfData.trips.completed },
                {
                  label: "On-Time Rate",
                  value: `${perfData.trips.on_time_rate_pct}%`,
                },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-800 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">{label}</p>
                  <p className="text-white font-semibold">{value}</p>
                </div>
              ))}
            </div>
            {/* Incidents */}
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">
                Incident Breakdown
              </p>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(perfData.safety.incidents).map(([k, v]) => (
                  <div
                    key={k}
                    className="bg-gray-800 rounded-lg p-2 text-center"
                  >
                    <p className="text-white font-bold text-lg">{v}</p>
                    <p className="text-gray-500 text-xs capitalize">
                      {k.replace("_", " ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </AppLayout>
  );
}
