import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import { createLeaveRequest, fetchAttendance, fetchLeaveRequests, fetchSalaryRecords, fetchStaffForPayroll, saveAttendance, updateLeaveRequest } from "../api/salaryApi.js";

const monthDays = 30;
const statuses = ["present", "absent", "holiday", "not-marked"];
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const dateFor = (month, day) => `${month}-${String(day).padStart(2, "0")}`;
const monthLabel = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

function makeRecord(member, salary, attendance, leaveRequests, month) {
  const byDate = Object.fromEntries(attendance.map((item) => [item.date, item.status]));
  const days = Array.from({ length: monthDays }, (_, index) => byDate[dateFor(month, index + 1)] || "not-marked");
  return { id: member.id, staffId: member.id, name: member.name, role: member.role, monthlyPay: Number(salary?.salary || 0), present: days.filter((item) => item === "present").length, absent: days.filter((item) => item === "absent").length, attendance: days, leaveRequests };
}
function approvedLeaveDays(record) { return record.leaveRequests.filter((item) => item.status === "approved").length; }
function payableSalary(record) { return record.monthlyPay * Math.min(monthDays, record.present + approvedLeaveDays(record)) / monthDays; }

export default function ManageSalaries() {
  const [month, setMonth] = useState("2026-09");
  const [records, setRecords] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [holidayForm, setHolidayForm] = useState({ date: "", reason: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const selected = records.find((record) => record.id === selectedId);

  async function load() {
    setLoading(true);
    try {
      const [members, salaries] = await Promise.all([fetchStaffForPayroll(), fetchSalaryRecords(month)]);
      const salaryByStaff = Object.fromEntries(salaries.map((item) => [item.staffId, item]));
      const hydrated = await Promise.all(members.map(async (member) => {
        const [attendance, leaveRequests] = await Promise.all([fetchAttendance(member.id, month), fetchLeaveRequests(member.id, month)]);
        return makeRecord(member, salaryByStaff[member.id], attendance || [], leaveRequests || [], month);
      }));
      setRecords(hydrated);
      setSelectedId((current) => current && hydrated.some((item) => item.id === current) ? current : null);
    } catch (error) { setAlert({ type: "danger", message: error.message }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [month]);

  const totalPayable = useMemo(() => records.reduce((sum, record) => sum + payableSalary(record), 0), [records]);

  async function updateAttendance(day, status) {
    if (!selected) return;
    setSaving(true);
    try {
      await saveAttendance({ staffId: selected.staffId, date: dateFor(month, day + 1), status });
      setRecords((current) => current.map((record) => {
        if (record.id !== selected.id) return record;
        const attendance = record.attendance.map((item, index) => index === day ? status : item);
        return { ...record, attendance, present: attendance.filter((item) => item === "present").length, absent: attendance.filter((item) => item === "absent").length };
      }));
    } catch (error) { setAlert({ type: "danger", message: error.message }); }
    finally { setSaving(false); }
  }

  async function updateLeave(id, status) {
    try {
      const updated = await updateLeaveRequest(id, status);
      setRecords((current) => current.map((record) => ({ ...record, leaveRequests: record.leaveRequests.map((item) => item.id === id ? updated : item) })));
    } catch (error) { setAlert({ type: "danger", message: error.message }); }
  }

  async function requestHoliday(event) {
    event.preventDefault();
    if (!selected || !holidayForm.date || !holidayForm.reason.trim()) return;
    try {
      const created = await createLeaveRequest({ staffId: selected.staffId, ...holidayForm, reason: holidayForm.reason.trim() });
      setRecords((current) => current.map((record) => record.id === selected.id ? { ...record, leaveRequests: [...record.leaveRequests, created] } : record));
      setHolidayForm({ date: "", reason: "" });
    } catch (error) { setAlert({ type: "danger", message: error.message }); }
  }

  return <>
    <PageHeader title="Manage Salaries" subtitle="Manage monthly pay, daily attendance, and staff holidays"><Link to="/staff" className="btn btn-outline-secondary"><i className="ti ti-arrow-left me-1"></i>Back to Staff</Link></PageHeader>
    {alert && <div className={`alert alert-${alert.type}`} role="alert">{alert.message}</div>}
    <div className="row g-3 mb-3"><div className="col-md-4"><div className="card h-100"><div className="card-body"><small className="text-muted d-block">Salary month</small><select className="form-select mt-2" value={month} onChange={(event) => setMonth(event.target.value)}><option value="2026-09">September 2026</option><option value="2026-10">October 2026</option><option value="2026-11">November 2026</option></select></div></div></div><div className="col-md-4"><div className="card h-100"><div className="card-body"><small className="text-muted d-block">Working days</small><strong className="fs-4">{monthDays} days</strong><small className="d-block text-muted">Stored attendance data</small></div></div></div><div className="col-md-4"><div className="card h-100"><div className="card-body"><small className="text-muted d-block">Total payable</small><strong className="fs-4 text-primary">{money(totalPayable)}</strong><small className="d-block text-muted">For {monthLabel(month)}</small></div></div></div></div>
    <section className="card mb-3"><div className="card-header bg-white px-4 py-3"><h2 className="h5 mb-1">Monthly salary table</h2><p className="small text-muted mb-0">Salary and attendance are loaded from the backend.</p></div><div className="table-responsive"><table className="table mb-0 align-middle"><thead className="table-light"><tr><th>Staff</th><th>Monthly pay</th><th>Present</th><th>Absent</th><th>Approved holidays</th><th>Payable</th><th></th></tr></thead><tbody>{loading ? <tr><td colSpan="7" className="text-center py-4">Loading salary data...</td></tr> : !records.length ? <tr><td colSpan="7" className="text-center py-4 text-muted">No staff members found.</td></tr> : records.map((record) => <tr key={record.id}><td><strong>{record.name}</strong><small className="d-block text-muted">{record.role}</small></td><td>{money(record.monthlyPay)}</td><td className="text-success">{record.present}</td><td className="text-danger">{record.absent}</td><td>{approvedLeaveDays(record)}</td><td className="fw-bold">{money(payableSalary(record))}</td><td><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSelectedId(record.id)}><i className="ti ti-calendar me-1"></i>Attendance</button></td></tr>)}</tbody></table></div></section>
    {selected && <div className="row g-3"><div className="col-lg-7"><div className="card"><div className="card-header bg-white px-4 py-3 d-flex justify-content-between"><div><h2 className="h5 mb-1">Daily attendance — {selected.name}</h2><p className="small text-muted mb-0">Changes are saved to the backend immediately.</p></div><button type="button" className="btn-close" aria-label="Close" onClick={() => setSelectedId(null)}></button></div><div className="table-responsive"><table className="table mb-0 align-middle"><thead className="table-light"><tr><th>Day</th><th>Status</th></tr></thead><tbody>{selected.attendance.map((status, index) => <tr key={index}><td>{dateFor(month, index + 1)}</td><td><select className="form-select form-select-sm" value={status} disabled={saving} onChange={(event) => updateAttendance(index, event.target.value)}>{statuses.map((option) => <option key={option} value={option}>{option}</option>)}</select></td></tr>)}</tbody></table></div></div></div><div className="col-lg-5"><div className="card"><div className="card-header bg-white px-4 py-3"><h2 className="h5 mb-0">Holiday requests</h2></div><div className="card-body">{selected.leaveRequests.length ? selected.leaveRequests.map((request) => <div className="border rounded p-3 mb-3" key={request.id}><strong>{request.date}</strong><p className="small text-muted mb-2">{request.reason}</p><span className={`badge ${request.status === "approved" ? "text-bg-success" : request.status === "declined" ? "text-bg-danger" : "text-bg-warning"}`}>{request.status}</span>{request.status === "pending" && <div className="d-flex gap-2 mt-3"><button type="button" className="btn btn-sm btn-success" onClick={() => updateLeave(request.id, "approved")}>Approve paid holiday</button><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => updateLeave(request.id, "declined")}>Decline</button></div>}</div>) : <p className="text-muted mb-3">No holiday requests for this staff member.</p>}<hr /><h3 className="h6">Request a holiday</h3><form onSubmit={requestHoliday}><label className="form-label" htmlFor="holidayDate">Holiday date</label><input id="holidayDate" type="date" className="form-control mb-2" value={holidayForm.date} onChange={(event) => setHolidayForm({ ...holidayForm, date: event.target.value })} required /><label className="form-label" htmlFor="holidayReason">Reason</label><input id="holidayReason" className="form-control mb-3" placeholder="Reason for holiday" value={holidayForm.reason} onChange={(event) => setHolidayForm({ ...holidayForm, reason: event.target.value })} required /><button type="submit" className="btn btn-outline-primary w-100">Submit holiday request</button></form></div></div></div></div>}
  </>;
}
