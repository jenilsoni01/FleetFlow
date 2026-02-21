
export function exportToCsv(filename, rows, columns) {
  if (!rows || rows.length === 0) return;

  const headers = columns ?? Object.keys(rows[0]);

  const escape = (value) => {
    const s = value == null ? "" : String(value);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const csvRows = [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


 
export function exportMonthlyTrend(burnData, months) {
  const rows = burnData.map((m) => ({
    Month: m.month ?? "",
    "Trip Expenses (INR)": m.trip_expenses ?? 0,
    "Maintenance (INR)": m.maintenance ?? 0,
    "Total (INR)": m.total ?? 0,
  }));
  exportToCsv(`fleetflow-monthly-trend-${months}mo.csv`, rows);
}


 
export function exportMonthlyComposition(stackedData, months) {
  const TYPES = ["fuel", "toll", "parking", "fine", "other", "maintenance"];
  const rows = stackedData.map((m) => {
    const row = { Month: m.month ?? "" };
    TYPES.forEach((t) => {
      row[t.charAt(0).toUpperCase() + t.slice(1) + " (INR)"] = m[t] ?? 0;
    });
    return row;
  });
  exportToCsv(`fleetflow-expense-composition-${months}mo.csv`, rows);
}


export function exportCategoryBreakdown(typeAgg, totalSpend) {
  const rows = typeAgg.map((t) => ({
    Category: t.type ?? "",
    "Total (INR)": t.total ?? 0,
    "% of Total":
      totalSpend > 0 ? `${Math.round((t.total / totalSpend) * 100)}%` : "0%",
  }));
  exportToCsv("fleetflow-category-breakdown.csv", rows);
}


export function exportExpensesList(expenseChartData) {
  const rows = expenseChartData.map((e) => ({
    Date: e.fullDate ?? e.label ?? "",
    "Trip Reference": e.tripRef ?? "",
    Type: e.type ?? "",
    "Amount (INR)": e.amount ?? 0,
    Description: e.description ?? "",
  }));
  exportToCsv("fleetflow-all-expenses.csv", rows);
}
