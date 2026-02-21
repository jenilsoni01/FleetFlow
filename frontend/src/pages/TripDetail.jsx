import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  DollarSign,
  Truck,
  User,
  MapPin,
  Calendar,
  Package,
  Clock,
  XCircle,
  Trash2,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { PageSpinner } from "../components/ui/Spinner";
import { useToast } from "../context/ToastContext";
import {
  getTrip,
  addExpense,
  getTripExpenses,
  deleteExpense,
} from "../services/trips.service";

const PRIORITY_COLORS = {
  low: "text-gray-400 border-gray-600",
  medium: "text-blue-400 border-blue-700",
  high: "text-amber-400 border-amber-700",
  urgent: "text-red-400 border-red-700",
};

const EXPENSE_TYPES = ["fuel", "toll", "parking", "fine", "other"];
const EMPTY_EXP = {
  expense_type: "fuel",
  amount: "",
  expense_date: "",
  notes: "",
  fuel_quantity: "",
  fuel_type: "diesel",
  odometer_reading: "",
};

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [showAddExp, setShowAddExp] = useState(false);
  const [expForm, setExpForm] = useState(EMPTY_EXP);

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => getTrip(id),
  });

  const { data: expData } = useQuery({
    queryKey: ["tripExpenses", id],
    queryFn: () => getTripExpenses(id),
    enabled: !!id,
  });

  const expenses = expData?.expenses ?? expData ?? [];

  const addExpMut = useMutation({
    mutationFn: (data) => addExpense(id, data),
    onSuccess: () => {
      toast.success("Expense added");
      setShowAddExp(false);
      setExpForm(EMPTY_EXP);
      qc.invalidateQueries({ queryKey: ["tripExpenses", id] });
    },
    onError: (e) =>
      toast.error(e.response?.data?.message ?? "Failed to add expense"),
  });

  const delExpMut = useMutation({
    mutationFn: ({ expId }) => deleteExpense(id, expId),
    onSuccess: () => {
      toast.success("Expense deleted");
      qc.invalidateQueries({ queryKey: ["tripExpenses", id] });
    },
    onError: (e) =>
      toast.error(e.response?.data?.message ?? "Failed to delete expense"),
  });

  const handleAddExp = () => {
    if (!expForm.amount) return;
    if (
      expForm.expense_type === "fuel" &&
      (!expForm.fuel_quantity || Number(expForm.fuel_quantity) <= 0)
    ) {
      toast.error("Fuel quantity must be greater than 0");
      return;
    }
    const payload = {
      expense_type: expForm.expense_type,
      amount: Number(expForm.amount),
      expense_date: expForm.expense_date || undefined,
      notes: expForm.notes,
    };
    if (expForm.expense_type === "fuel") {
      payload.fuel_quantity = Number(expForm.fuel_quantity);
      payload.fuel_type = expForm.fuel_type;
      payload.odometer_reading = expForm.odometer_reading
        ? Number(expForm.odometer_reading)
        : undefined;
    }
    addExpMut.mutate(payload);
  };

  if (isLoading)
    return (
      <AppLayout title="Trip Detail">
        <PageSpinner />
      </AppLayout>
    );

  if (!trip)
    return (
      <AppLayout title="Trip Detail">
        <div className="text-center text-gray-500 py-20">Trip not found.</div>
      </AppLayout>
    );

  const odometerDist =
    trip.odometer?.end > 0 && trip.odometer?.start >= 0
      ? trip.odometer.end - trip.odometer.start
      : null;

  const expenseTotal = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

  return (
    <AppLayout title={trip.trip_reference ?? "Trip Detail"}>
      {/* Back */}
      <button
        onClick={() => navigate("/trips")}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Trips
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-xl font-bold font-mono">
            {trip.trip_reference}
          </h1>
          {trip.region?.name && (
            <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
              <MapPin size={10} /> {trip.region.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {trip.priority && (
            <span
              className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${PRIORITY_COLORS[trip.priority] ?? "text-gray-400 border-gray-600"}`}
            >
              {trip.priority}
            </span>
          )}
          <Badge value={trip.status} />
        </div>
      </div>

      {/* Cancellation banner */}
      {trip.status === "cancelled" && trip.cancellation_reason && (
        <div className="flex items-start gap-3 bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 mb-6 text-sm">
          <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-400 font-medium">Cancellation Reason</p>
            <p className="text-red-300/80 mt-0.5">{trip.cancellation_reason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Route & Assignment */}
          <Card title="Route & Assignment">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoBlock
                icon={MapPin}
                label="Origin"
                value={trip.origin || "—"}
              />
              <InfoBlock
                icon={MapPin}
                label="Destination"
                value={trip.destination || "—"}
              />
              <InfoBlock
                icon={Truck}
                label="Vehicle"
                value={
                  trip.vehicle?.name
                    ? `${trip.vehicle.name}${trip.vehicle.license_plate ? ` · ${trip.vehicle.license_plate}` : ""}`
                    : "—"
                }
              />
              <InfoBlock
                icon={User}
                label="Driver"
                value={
                  trip.driver?.name
                    ? `${trip.driver.name}${trip.driver.employee_id ? ` (${trip.driver.employee_id})` : ""}`
                    : "—"
                }
              />
            </div>
          </Card>

          {/* Schedule */}
          <Card title="Schedule">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoBlock
                icon={Calendar}
                label="Scheduled Departure"
                value={fmt(trip.schedule?.scheduled_departure)}
              />
              <InfoBlock
                icon={Calendar}
                label="Estimated Arrival"
                value={fmt(trip.schedule?.estimated_arrival)}
              />
              <InfoBlock
                icon={Clock}
                label="Actual Departure"
                value={fmt(trip.schedule?.actual_departure)}
                muted={!trip.schedule?.actual_departure}
              />
              <InfoBlock
                icon={Clock}
                label="Actual Arrival"
                value={fmt(trip.schedule?.actual_arrival)}
                muted={!trip.schedule?.actual_arrival}
              />
            </div>
          </Card>

          {/* Cargo */}
          <Card title="Cargo">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoBlock
                icon={Package}
                label="Description"
                value={trip.cargo?.description || "—"}
                wide
              />
              <InfoBlock
                icon={Package}
                label="Weight"
                value={
                  trip.cargo?.weight_kg > 0
                    ? `${Number(trip.cargo.weight_kg).toLocaleString()} kg`
                    : "—"
                }
              />
            </div>
          </Card>

          {/* Odometer */}
          <Card title="Odometer">
            <div className="grid grid-cols-3 gap-4">
              <StatBlock
                label="Start"
                value={
                  trip.odometer?.start != null
                    ? `${trip.odometer.start.toLocaleString()} km`
                    : "—"
                }
              />
              <StatBlock
                label="End"
                value={
                  trip.odometer?.end > 0
                    ? `${trip.odometer.end.toLocaleString()} km`
                    : "—"
                }
              />
              <StatBlock
                label="Distance"
                value={
                  odometerDist != null
                    ? `${odometerDist.toLocaleString()} km`
                    : "—"
                }
                highlight={odometerDist != null}
              />
            </div>
          </Card>

          {/* Notes */}
          {trip.notes && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">
                Notes
              </p>
              <p className="text-gray-300 text-sm leading-relaxed">
                {trip.notes}
              </p>
            </div>
          )}
        </div>

        {/* ── Right column (1/3) ── */}
        <div className="space-y-5">
          {/* Summary stats */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <p className="text-gray-500 text-xs uppercase tracking-widest">
              Summary
            </p>
            <SummaryRow label="Status" value={<Badge value={trip.status} />} />
            <SummaryRow
              label="Priority"
              value={
                <span
                  className={`capitalize font-medium ${(PRIORITY_COLORS[trip.priority] ?? "text-gray-400 border-gray-600").split(" ")[0]}`}
                >
                  {trip.priority ?? "—"}
                </span>
              }
            />
            <SummaryRow
              label="Total Expenses"
              value={
                <span className="text-white font-semibold">
                  ₹{expenseTotal.toLocaleString()}
                </span>
              }
            />
            {odometerDist != null && (
              <SummaryRow
                label="Distance Covered"
                value={
                  <span className="text-emerald-400 font-medium">
                    {odometerDist.toLocaleString()} km
                  </span>
                }
              />
            )}
          </div>

          {/* Expenses */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium flex items-center gap-2 text-sm">
                <DollarSign size={15} className="text-indigo-400" /> Expenses
              </h3>
              {["draft", "dispatched", "in_transit"].includes(trip.status) && (
                <button
                  onClick={() => setShowAddExp(true)}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={12} /> Add
                </button>
              )}
            </div>

            {expenses.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">
                No expenses yet
              </p>
            ) : (
              <div className="space-y-3">
                {expenses.map((exp, i) => (
                  <div
                    key={exp._id ?? i}
                    className="border-b border-gray-800 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 capitalize text-sm">
                            {exp.expense_type}
                          </span>
                          {exp.expense_date && (
                            <span className="text-gray-600 text-xs">
                              {new Date(exp.expense_date).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          )}
                        </div>
                        {exp.notes && (
                          <p className="text-gray-500 text-xs mt-0.5">
                            {exp.notes}
                          </p>
                        )}
                        {exp.fuel_details?.quantity && (
                          <p className="text-gray-500 text-xs mt-0.5">
                            {exp.fuel_details.quantity}L ·{" "}
                            {exp.fuel_details.fuel_type}
                            {exp.fuel_details.station_name
                              ? ` · ${exp.fuel_details.station_name}`
                              : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-white font-medium text-sm">
                          ₹{exp.amount?.toLocaleString()}
                        </span>
                        {["draft", "dispatched", "in_transit"].includes(
                          trip.status,
                        ) && (
                          <button
                            onClick={() => {
                              if (window.confirm("Delete this expense?"))
                                delExpMut.mutate({ expId: exp._id });
                            }}
                            className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold pt-1 border-t border-gray-800">
                  <span className="text-gray-400">Total</span>
                  <span className="text-white">
                    ₹{expenseTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        open={showAddExp}
        onClose={() => setShowAddExp(false)}
        title="Add Expense"
        size="sm"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-gray-400 text-xs mb-1">Type</label>
            <select
              value={expForm.expense_type}
              onChange={(e) =>
                setExpForm((f) => ({ ...f, expense_type: e.target.value }))
              }
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            >
              {EXPENSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="Amount (₹)"
            type="number"
            value={expForm.amount}
            onChange={(v) => setExpForm((f) => ({ ...f, amount: v }))}
          />
          <Field
            label="Date"
            type="date"
            value={expForm.expense_date}
            onChange={(v) => setExpForm((f) => ({ ...f, expense_date: v }))}
          />
          <Field
            label="Notes"
            value={expForm.notes}
            onChange={(v) => setExpForm((f) => ({ ...f, notes: v }))}
          />
          {expForm.expense_type === "fuel" && (
            <>
              <Field
                label="Liters"
                type="number"
                value={expForm.fuel_quantity}
                onChange={(v) =>
                  setExpForm((f) => ({ ...f, fuel_quantity: v }))
                }
              />
              <Field
                label="Odometer Reading (km)"
                type="number"
                value={expForm.odometer_reading}
                onChange={(v) =>
                  setExpForm((f) => ({ ...f, odometer_reading: v }))
                }
              />
              <div>
                <label className="block text-gray-400 text-xs mb-1">
                  Fuel Type
                </label>
                <select
                  value={expForm.fuel_type}
                  onChange={(e) =>
                    setExpForm((f) => ({ ...f, fuel_type: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                >
                  {["diesel", "petrol", "cng", "electric"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={() => setShowAddExp(false)}
            className="px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleAddExp}
            disabled={
              addExpMut.isPending ||
              !expForm.amount ||
              (expForm.expense_type === "fuel" &&
                (!expForm.fuel_quantity || Number(expForm.fuel_quantity) <= 0))
            }
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-60"
          >
            {addExpMut.isPending ? "Adding..." : "Add Expense"}
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function Card({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value, muted = false, wide = false }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <p className="text-gray-500 text-xs mb-1 flex items-center gap-1">
        {Icon && <Icon size={10} />} {label}
      </p>
      <p className={`text-sm ${muted ? "text-gray-600" : "text-gray-200"}`}>
        {value}
      </p>
    </div>
  );
}

function StatBlock({ label, value, highlight = false }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p
        className={`font-semibold text-sm ${highlight ? "text-emerald-400" : "text-gray-200"}`}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-gray-800 pb-3 last:border-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-gray-400 text-xs mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
      />
    </div>
  );
}

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
