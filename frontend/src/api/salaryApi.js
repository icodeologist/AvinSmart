import { API_BASE_URL, unwrap } from "./config.js";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  const data = unwrap(body);
  if (!response.ok) throw new Error(body.error || data?.error || "Salary request failed");
  return data;
}

function normalize(record) {
  const member = record.staff || {};
  return { id: record.id, staffId: record.staff_id, name: record.name || member.name || "Unknown", email: record.email || member.email || "", role: record.role || member.role || "staff", salary: Number(record.salary ?? record.amount ?? 0), currency: record.currency || "INR", payPeriod: record.pay_period || "", lastPaid: record.lastPaid || record.paid_at || "", status: record.status || "pending" };
}

export function fetchSalaryRecords(month) {
  return request(`/salaries${month ? `?pay_period=${encodeURIComponent(month)}` : ""}`).then((data) => Array.isArray(data) ? data.map(normalize) : []);
}
export function fetchStaffForPayroll() { return request("/staff"); }
export function fetchAttendance(staffId, month) { return request(`/salaries/attendance?staff_id=${staffId}&month=${encodeURIComponent(month)}`); }
export function fetchLeaveRequests(staffId, month) { return request(`/salaries/leave-requests?staff_id=${staffId}&month=${encodeURIComponent(month)}`); }
export function saveAttendance({ staffId, date, status }) { return request("/salaries/attendance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staff_id: staffId, date, status }) }); }
export function createLeaveRequest({ staffId, date, reason }) { return request("/salaries/leave-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staff_id: staffId, date, reason }) }); }
export function updateLeaveRequest(id, status) { return request(`/salaries/leave-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); }
