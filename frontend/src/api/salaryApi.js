import { API_BASE_URL, getAdminToken, unwrap } from "./config.js";

function authHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const mutating = options.method && options.method !== "GET";
  const headers = { ...authHeaders(), ...(options.headers || {}) };
  if (mutating) {
    headers["Idempotency-Key"] = options.idempotencyKey || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  const data = unwrap(body);
  if (!response.ok) {
    const error = new Error(body.error || data?.error || "Salary request failed");
    if (body.fields) error.fields = body.fields;
    throw error;
  }
  return data;
}

function normalize(record) {
  const member = record.staff || {};
  return { id: record.id, staffId: record.staff_id, name: record.name || member.name || "Unknown", email: record.email || member.email || "", role: record.role || member.role || "staff", salary: String(record.salary ?? record.amount ?? "0.00"), currency: record.currency || "INR", payPeriod: record.pay_period || "", lastPaid: record.lastPaid || record.paid_at || "", status: record.status || "pending", paidAmount: String(record.paid_amount ?? "0.00"), paymentMethod: record.payment_method || "" };
}

export function fetchSalaryRecords(month) {
  return request(`/salaries${month ? `?pay_period=${encodeURIComponent(month)}` : ""}`).then((data) => Array.isArray(data) ? data.map(normalize) : []);
}
export function fetchStaffForPayroll() { return request("/staff"); }
export function fetchAttendance(staffId, month) { return request(`/salaries/attendance?staff_id=${staffId}&month=${encodeURIComponent(month)}`); }
export function fetchLeaveRequests(staffId, month) { return request(`/salaries/leave-requests?staff_id=${staffId}&month=${encodeURIComponent(month)}`); }
export function saveAttendance({ staffId, date, status }) { return request("/salaries/attendance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staff_id: staffId, date, status }) }); }
export function createLeaveRequest({ staffId, date, reason, payPeriod }) { return request("/salaries/leave-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staff_id: staffId, date, reason, pay_period: payPeriod }) }); }
export function updateLeaveRequest(id, status) { return request(`/salaries/leave-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); }
export function createSalary({ staffId, amount, currency, payPeriod }) { return request("/salaries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staff_id: Number(staffId), amount: String(amount), currency, pay_period: payPeriod }) }).then(normalize); }
export function updateSalary(id, { staffId, amount, currency, payPeriod }) { return request(`/salaries/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staff_id: Number(staffId), amount: String(amount), currency, pay_period: payPeriod }) }).then(normalize); }
export function markSalaryPaid(id, { amount, method, reference }) { return request(`/salaries/${id}/pay`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: String(amount || ""), method, reference }) }).then(normalize); }
export function fetchPayrollSummary(month) { return request(`/salaries/summary?pay_period=${encodeURIComponent(month)}`); }
export function fetchPayrollCalendar(month) { return request(`/salaries/calendar?pay_period=${encodeURIComponent(month)}`); }
export function updatePayrollCalendar({ payPeriod, workingDays }) { return request("/salaries/calendar", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pay_period: payPeriod, working_days: Number(workingDays) }) }); }
export function addPublicHoliday({ payPeriod, date, name }) { return request("/salaries/calendar/holidays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pay_period: payPeriod, date, name }) }); }
