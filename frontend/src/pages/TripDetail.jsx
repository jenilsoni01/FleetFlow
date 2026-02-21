import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, DollarSign } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { PageSpinner } from "../components/ui/Spinner";
import { useToast } from "../context/ToastContext";
import {
  getTrip,
  addExpense,
  getTripExpenses,
} from "../services/trips.service";

const EXPENSE_TYPES = ["fuel", "toll", "parking", "fine", "other"];
const EMPTY_EXP = {
  expense_type: "fuel",
  amount: "",
  expense_date: "",
  description: "",
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

  const handleAddExp = () => {
    const payload = {
      expense_type: expForm.expense_type,
      amount: Number(expForm.amount),
      expense_date: expForm.expense_date,
      description: expForm.description,
    };
    if (expForm.expense_type === "fuel") {
      payload.fuel_details = {
        quantity: Number(expForm.fuel_quantity),
        fuel_type: expForm.fuel_type,
        odometer_reading: Number(expForm.odometer_reading),
      };
    }
    addExpMut.mutate(payload);
  };

  if (isLoading)
    return (
      <AppLayout title="Trip Detail">
        <PageSpinner />
      </AppLayout>
    );

  return (
    <AppLayout title={trip?.trip_reference ?? "Trip Detail"}>
      <button
        onClick={() => navigate("/trips")}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Trips
      </button>

      {trip && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trip Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">
                  {trip.trip_reference}
                </h2>
                <Badge value={trip.status} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="Vehicle" value={trip.vehicle?.name ?? "—"} />
                <InfoRow label="Driver" value={trip.driver?.name ?? "—"} />
                <InfoRow label="Origin" value={trip.origin?.address ?? "—"} />
                <InfoRow
                  label="Destination"
                  value={trip.destination?.address ?? "—"}
                />
                <InfoRow
                  label="Departure"
                  value={fmt(trip.schedule?.scheduled_departure)}
                />
                <InfoRow
                  label="Arrival"
                  value={fmt(trip.schedule?.scheduled_arrival)}
                />
                <InfoRow
                  label="Odometer Start"
                  value={trip.odometer?.start ?? "—"}
                />
                <InfoRow
                  label="Odometer End"
                  value={trip.odometer?.end ?? "—"}
                />
              </div>
              {trip.notes && (
                <p className="mt-4 text-gray-500 text-sm border-t border-gray-800 pt-4">
                  {trip.notes}
                </p>
              )}
            </div>
          </div>

          {/* Expenses */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <DollarSign size={16} className="text-indigo-400" /> Expenses
                </h3>
                {["draft", "dispatched", "in_transit"].includes(
                  trip.status,
                ) && (
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
                      key={i}
                      className="flex items-start justify-between text-sm border-b border-gray-800 pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <span className="text-gray-300 capitalize">
                          {exp.expense_type}
                        </span>
                        {exp.description && (
                          <p className="text-gray-500 text-xs mt-0.5">
                            {exp.description}
                          </p>
                        )}
                        {exp.fuel_details?.quantity && (
                          <p className="text-gray-500 text-xs">
                            {exp.fuel_details.quantity}L ·{" "}
                            {exp.fuel_details.fuel_type}
                          </p>
                        )}
                      </div>
                      <span className="text-white font-medium">
                        ₹{exp.amount?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold pt-2">
                    <span className="text-gray-400">Total</span>
                    <span className="text-white">
                      ₹
                      {expenses
                        .reduce((s, e) => s + (e.amount ?? 0), 0)
                        .toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
            label="Description"
            value={expForm.description}
            onChange={(v) => setExpForm((f) => ({ ...f, description: v }))}
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
                label="Odometer Reading"
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
            disabled={addExpMut.isPending || !expForm.amount}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-60"
          >
            {addExpMut.isPending ? "Adding..." : "Add Expense"}
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
      <p className="text-gray-200">{value}</p>
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
  return new Date(d).toLocaleString();
}
