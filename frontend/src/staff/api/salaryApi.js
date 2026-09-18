const NEXT_PAYROLL_DATE = "30 Sep 2026";
const API_BASE_URL = "http://localhost:8080/api/v1";

const salaryRecords = [
  { id: 1, name: "John Doe", email: "john@avinsmart.com", role: "Manager", salary: 4200, lastPaid: "2026-08-30", status: "paid" },
  { id: 2, name: "Jane Smith", email: "jane@avinsmart.com", role: "Sales", salary: 3200, lastPaid: "2026-08-30", status: "paid" },
  { id: 3, name: "Mike Johnson", email: "mike@avinsmart.com", role: "Support", salary: 2850, lastPaid: "2026-07-30", status: "pending" },
  { id: 4, name: "Sarah Williams", email: "sarah@avinsmart.com", role: "Inventory", salary: 3000, lastPaid: "2026-08-30", status: "paid" },
];

function unwrap(data) {
  return data && data.success && Object.prototype.hasOwnProperty.call(data, "data")
    ? data.data
    : data;
}

function normalize(record) {
  const member = record.staff || {};
  return {
    id: record.id,
    staffId: record.staff_id,
    name: record.name || member.name || "Unknown",
    email: record.email || member.email || "",
    role: record.role || member.role || "staff",
    salary: Number(record.salary ?? record.amount ?? 0),
    currency: record.currency || "USD",
    payPeriod: record.pay_period || "",
    lastPaid: record.lastPaid || record.paid_at || "",
    status: record.status || "pending",
    _localOnly: record._localOnly || false,
  };
}

export async function fetchSalaryRecords() {
  try {
    const response = await fetch(`${API_BASE_URL}/salaries`);
    const data = unwrap(await response.json().catch(() => []));
    if (!response.ok) {
      throw new Error(data.error || "Could not fetch salary records");
    }
    return Array.isArray(data) ? data.map(normalize) : [];
  } catch (error) {
    return salaryRecords.map((record) => ({ ...record }));
  }
}

export function getSalaryRecords() {
  return salaryRecords.map((record) => ({ ...record }));
}

export function getSalarySummary(records) {
  const total = records.reduce((sum, record) => sum + record.salary, 0);
  const paid = records
    .filter((record) => record.status === "paid")
    .reduce((sum, record) => sum + record.salary, 0);
  return {
    total,
    paid,
    pending: total - paid,
    nextPayrollDate: NEXT_PAYROLL_DATE,
  };
}

export async function markSalaryPaid(record) {
  try {
    if (!record._localOnly) {
      const response = await fetch(`${API_BASE_URL}/salaries/${record.id}/pay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const data = unwrap(await response.json().catch(() => null));
      if (!response.ok) {
        throw new Error(data?.error || "Could not mark salary as paid");
      }
      return normalize(data);
    }
  } catch (error) {
    // Keep the demo workflow usable while the API or database is unavailable.
  }

  return { ...record, status: "paid", lastPaid: new Date().toISOString() };
}
