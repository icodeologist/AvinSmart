import { API_BASE_URL, unwrap } from "./config.js";

const NEXT_PAYROLL_DATE = "30 Sep 2026";

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
    if (error.name === "TypeError") {
      throw new Error(`Could not fetch salary records: ${error.message}`);
    }
    throw error;
  }
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
    const response = await fetch(`${API_BASE_URL}/salaries/${record.id}/pay`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    const data = unwrap(await response.json().catch(() => null));
    if (!response.ok) {
      throw new Error(data?.error || "Could not mark salary as paid");
    }
    return normalize(data);
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error(`Could not mark salary as paid: ${error.message}`);
    }
    throw error;
  }
}