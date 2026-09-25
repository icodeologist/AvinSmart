import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import {
  addPublicHoliday,
  createLeaveRequest,
  createSalary,
  fetchAttendance,
  fetchLeaveRequests,
  fetchPayrollCalendar,
  fetchPayrollSummary,
  fetchSalaryRecords,
  fetchStaffForPayroll,
  markSalaryPaid,
  saveAttendance,
  updatePayrollCalendar,
  updateLeaveRequest,
  updateSalary,
} from "../api/salaryApi.js";

const statuses = ["present", "absent", "holiday", "not-marked"];
const today = () => new Date().toISOString().slice(0, 10);
const monthLabel = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const dateFor = (month, day) => `${month}-${String(day).padStart(2, "0")}`;
const daysInMonth = (month) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
const currency = (value, code = "INR") => {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(Number(value || 0));
  } catch {
    return `${code} ${Number(value || 0).toFixed(2)}`;
  }
};

function monthOptions() {
  const current = new Date();
  return Array.from({ length: 13 }, (_, index) => {
    const date = new Date(current.getFullYear(), current.getMonth() - 6 + index, 1);
    return date.toISOString().slice(0, 7);
  });
}

function makeRecord(member, salary, attendance, leaveRequests, month, calendar) {
  const count = daysInMonth(month);
  const byDate = Object.fromEntries(attendance.map((item) => [item.date, item.status]));
  const holidayDates = new Set((calendar?.public_holidays || []).map((holiday) => holiday.date));
  const days = Array.from({ length: count }, (_, index) => {
    const date = dateFor(month, index + 1);
    return byDate[date] || (holidayDates.has(date) ? "holiday" : "not-marked");
  });
  const salaryAmount = salary?.salary || "0.00";
  return {
    id: member.id,
    staffId: member.id,
    name: member.name,
    role: member.role,
    monthlyPay: salaryAmount,
    currency: salary?.currency || "INR",
    salaryRecord: salary || null,
    present: days.filter((item) => item === "present").length,
    absent: days.filter((item) => item === "absent").length,
    attendance: days,
    leaveRequests,
    workingDays: calendar?.working_days || 0,
    holidayDates,
  };
}

function approvedLeaveDays(record) {
  return record.leaveRequests.filter((item) => item.status === "approved").length;
}

function payableSalary(record) {
  const payableDays = record.present + approvedLeaveDays(record);
  return Number(record.monthlyPay || 0) * Math.min(record.workingDays, payableDays) / Math.max(record.workingDays, 1);
}

export default function ManageSalaries() {
  const options = useMemo(monthOptions, []);
  const [month, setMonth] = useState(() => options[6]);
  const [calendar, setCalendar] = useState(null);
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [salaryForm, setSalaryForm] = useState({ staffId: "", amount: "", currency: "INR" });
  const [editingSalaryId, setEditingSalaryId] = useState(null);
  const [holidayForm, setHolidayForm] = useState({ date: "", reason: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const selected = records.find((record) => record.id === selectedId);

  async function load() {
    setLoading(true);
    setAlert(null);
    try {
      const [members, salaries, loadedCalendar, loadedSummary] = await Promise.all([fetchStaffForPayroll(), fetchSalaryRecords(month), fetchPayrollCalendar(month), fetchPayrollSummary(month)]);
      const salaryByStaff = Object.fromEntries(salaries.map((item) => [item.staffId, item]));
      const hydrated = await Promise.all(members.map(async (member) => {
        const [attendance, leaveRequests] = await Promise.all([fetchAttendance(member.id, month), fetchLeaveRequests(member.id, month)]);
        return makeRecord(member, salaryByStaff[member.id], attendance || [], leaveRequests || [], month, loadedCalendar);
      }));
      setCalendar(loadedCalendar);
      setSummary(loadedSummary);
      setRecords(hydrated);
      setSelectedId((current) => current && hydrated.some((item) => item.id === current) ? current : null);
    } catch (error) {
      setAlert({ type: "danger", message: error.message, retry: true });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [month]);

  const calculatedTotalPayable = useMemo(() => records.reduce((sum, record) => sum + payableSalary(record), 0), [records]);
  const totalPayable = summary ? Number(summary.total_payable || 0) : calculatedTotalPayable;
  const payrollCurrency = summary?.records?.find((record) => record.currency)?.currency || records.find((record) => record.salaryRecord)?.currency || "INR";

  function showError(error) {
    setAlert({ type: "danger", message: error.message, fields: error.fields });
  }

  function startSalaryForm(record) {
    setEditingSalaryId(record.salaryRecord?.id || null);
    setSalaryForm({ staffId: String(record.staffId), amount: record.salaryRecord?.salary || "", currency: record.currency || "INR" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitSalary(event) {
    event.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      if (!salaryForm.staffId || !salaryForm.amount || Number(salaryForm.amount) <= 0) throw new Error("Choose a staff member and enter a positive amount.");
      if (editingSalaryId) {
        await updateSalary(editingSalaryId, { ...salaryForm, payPeriod: month });
      } else {
        await createSalary({ ...salaryForm, payPeriod: month });
      }
      setSalaryForm({ staffId: "", amount: "", currency: "INR" });
      setEditingSalaryId(null);
      await load();
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  }

  async function paySalary(record) {
    if (!record.salaryRecord || record.salaryRecord.status === "paid" || !window.confirm(`Mark ${record.name}'s ${monthLabel(month)} salary as paid?`)) return;
    setSaving(true);
    try {
      await markSalaryPaid(record.salaryRecord.id, { amount: record.salaryRecord.salary, method: "bank_transfer" });
      await load();
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  }

  async function updateAttendance(day, status) {
    if (!selected) return;
    const date = dateFor(month, day + 1);
    if (date > today() || selected.holidayDates.has(date)) return;
    setSaving(true);
    try {
      await saveAttendance({ staffId: selected.staffId, date, status });
      await load();
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  }

  async function updateLeave(id, status) {
    if (!window.confirm(`${status === "approved" ? "Approve" : "Decline"} this leave request?`)) return;
    setSaving(true);
    try {
      await updateLeaveRequest(id, status);
      await load();
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  }

  async function requestHoliday(event) {
    event.preventDefault();
    if (!selected || !holidayForm.date || !holidayForm.reason.trim()) return;
    setSaving(true);
    try {
      await createLeaveRequest({ staffId: selected.staffId, date: holidayForm.date, reason: holidayForm.reason.trim(), payPeriod: month });
      setHolidayForm({ date: "", reason: "" });
      await load();
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  }

  async function saveWorkingDays(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await updatePayrollCalendar({ payPeriod: month, workingDays: calendar.working_days });
      await load();
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  }

  async function addHoliday(event) {
    event.preventDefault();
    if (!calendar || !holidayForm.date || !holidayForm.reason.trim()) return;
    setSaving(true);
    try {
      await addPublicHoliday({ payPeriod: month, date: holidayForm.date, name: holidayForm.reason.trim() });
      setHolidayForm({ date: "", reason: "" });
      await load();
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <PageHeader title="Manage Salaries" subtitle="Manage monthly pay, attendance, leave, and payroll calendars"><Link to="/staff" className="btn btn-outline-secondary"><i className="ti ti-arrow-left me-1"></i>Back to Staff</Link></PageHeader>
    {alert && <div className={`alert alert-${alert.type}`} role="alert">{alert.message}{alert.fields ? <ul className="mb-0 mt-2">{Object.entries(alert.fields).flatMap(([field, messages]) => (Array.isArray(messages) ? messages : [messages]).map((message) => <li key={`${field}-${message}`}>{field}: {message}</li>))}</ul> : null}{alert.retry ? <button type="button" className="btn btn-sm btn-outline-danger mt-2" onClick={load}>Retry</button> : null}</div>}

    <div className="row g-3 mb-3">
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><label className="small text-muted" htmlFor="salaryMonth">Salary month</label><select id="salaryMonth" className="form-select mt-2" value={month} onChange={(event) => setMonth(event.target.value)}>{options.map((value) => <option value={value} key={value}>{monthLabel(value)}</option>)}</select></div></div></div>
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><form onSubmit={saveWorkingDays}><label className="small text-muted" htmlFor="workingDays">Configured working days</label><div className="input-group mt-2"><input id="workingDays" type="number" min="1" max="31" className="form-control" value={calendar?.working_days || ""} disabled={!calendar || saving} onChange={(event) => setCalendar({ ...calendar, working_days: event.target.value })} /><button className="btn btn-outline-primary" type="submit" disabled={!calendar || saving}>Save</button></div><small className="d-block text-muted mt-1">Public holidays are removed from this count.</small></form></div></div></div>
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><small className="text-muted d-block">Total payable</small><strong className="fs-4 text-primary">{currency(totalPayable, payrollCurrency)}</strong><small className="d-block text-muted">For {monthLabel(month)} · {calendar?.working_days || 0} working days</small></div></div></div>
    </div>

    <section className="card mb-3"><div className="card-header bg-white px-4 py-3 d-flex justify-content-between align-items-center"><div><h2 className="h5 mb-1">Monthly salary table</h2><p className="small text-muted mb-0">Fixed monthly pay is prorated by present days and approved paid leave.</p></div><button type="button" className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading || saving}><i className="ti ti-refresh me-1"></i>Refresh</button></div><div className="card-body border-bottom"><form className="row g-2 align-items-end" onSubmit={submitSalary}><div className="col-md-3"><label className="form-label" htmlFor="salaryStaff">Staff member</label><select id="salaryStaff" className="form-select" value={salaryForm.staffId} onChange={(event) => setSalaryForm({ ...salaryForm, staffId: event.target.value })} disabled={saving}><option value="">Choose staff</option>{records.map((record) => <option value={record.staffId} key={record.staffId}>{record.name}</option>)}</select></div><div className="col-md-3"><label className="form-label" htmlFor="salaryAmount">Monthly amount</label><input id="salaryAmount" className="form-control" inputMode="decimal" placeholder="0.00" value={salaryForm.amount} onChange={(event) => setSalaryForm({ ...salaryForm, amount: event.target.value })} disabled={saving} /></div><div className="col-md-2"><label className="form-label" htmlFor="salaryCurrency">Currency</label><select id="salaryCurrency" className="form-select" value={salaryForm.currency} onChange={(event) => setSalaryForm({ ...salaryForm, currency: event.target.value })} disabled={saving}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></div><div className="col-md-4 d-flex gap-2"><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : editingSalaryId ? "Update salary" : "Create salary"}</button>{editingSalaryId ? <button className="btn btn-outline-secondary" type="button" onClick={() => { setEditingSalaryId(null); setSalaryForm({ staffId: "", amount: "", currency: "INR" }); }}>Cancel</button> : null}</div></form></div><div className="table-responsive"><table className="table mb-0 align-middle"><thead className="table-light"><tr><th>Staff</th><th>Monthly pay</th><th>Present</th><th>Absent</th><th>Paid leave</th><th>Payable</th><th>Status</th><th></th></tr></thead><tbody>{loading ? <tr><td colSpan="8" className="text-center py-4">Loading salary data...</td></tr> : !records.length ? <tr><td colSpan="8" className="text-center py-4 text-muted">No staff members found.</td></tr> : records.map((record) => <tr key={record.id}><td><strong>{record.name}</strong><small className="d-block text-muted">{record.role}</small></td><td>{record.salaryRecord ? currency(record.monthlyPay, record.currency) : <span className="text-muted">No salary record</span>}</td><td className="text-success">{record.present}</td><td className="text-danger">{record.absent}</td><td>{approvedLeaveDays(record)}</td><td className="fw-bold">{record.salaryRecord ? currency(payableSalary(record), record.currency) : "—"}</td><td>{record.salaryRecord ? <span className={`badge ${record.salaryRecord.status === "paid" ? "text-bg-success" : "text-bg-warning"}`}>{record.salaryRecord.status}</span> : "—"}</td><td className="text-end"><div className="d-flex gap-2 justify-content-end"><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => { setSelectedId(record.id); setHolidayForm({ date: "", reason: "" }); }} disabled={saving}>Attendance</button><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => startSalaryForm(record)} disabled={saving || record.salaryRecord?.status === "paid"}>{record.salaryRecord ? "Edit" : "Set salary"}</button>{record.salaryRecord?.status === "pending" ? <button type="button" className="btn btn-sm btn-outline-success" onClick={() => paySalary(record)} disabled={saving}>Mark paid</button> : null}</div></td></tr>)}</tbody></table></div></section>

    <section className="card mb-3"><div className="card-header bg-white px-4 py-3"><h2 className="h5 mb-1">Public holidays</h2><p className="small text-muted mb-0">Persist holidays for {monthLabel(month)}; they are excluded from working days.</p></div><div className="card-body"><form className="row g-2 align-items-end" onSubmit={addHoliday}><div className="col-md-3"><label className="form-label" htmlFor="publicHolidayDate">Date</label><input id="publicHolidayDate" type="date" className="form-control" min={`${month}-01`} max={`${month}-${String(daysInMonth(month)).padStart(2, "0")}`} value={holidayForm.date} onChange={(event) => setHolidayForm({ ...holidayForm, date: event.target.value })} disabled={saving} /></div><div className="col-md-5"><label className="form-label" htmlFor="publicHolidayName">Name</label><input id="publicHolidayName" className="form-control" value={holidayForm.reason} onChange={(event) => setHolidayForm({ ...holidayForm, reason: event.target.value })} placeholder="Holiday name" disabled={saving} /></div><div className="col-md-4"><button className="btn btn-outline-primary" type="submit" disabled={saving}>Add public holiday</button></div></form><div className="d-flex flex-wrap gap-2 mt-3">{calendar?.public_holidays?.length ? calendar.public_holidays.map((holiday) => <span className="badge text-bg-light border" key={holiday.id}>{holiday.date}: {holiday.name}</span>) : <span className="text-muted small">No public holidays configured.</span>}</div></div></section>

    {selected && <div className="row g-3"><div className="col-lg-7"><div className="card"><div className="card-header bg-white px-4 py-3 d-flex justify-content-between"><div><h2 className="h5 mb-1">Daily attendance — {selected.name}</h2><p className="small text-muted mb-0">Future dates and public holidays are read-only.</p></div><button type="button" className="btn-close" aria-label="Close" onClick={() => setSelectedId(null)}></button></div><div className="table-responsive"><table className="table mb-0 align-middle"><thead className="table-light"><tr><th>Day</th><th>Status</th></tr></thead><tbody>{selected.attendance.map((status, index) => { const date = dateFor(month, index + 1); const readOnly = date > today() || selected.holidayDates.has(date); return <tr key={date}><td>{date}{selected.holidayDates.has(date) ? <small className="d-block text-muted">Public holiday</small> : null}</td><td><select className="form-select form-select-sm" value={status} disabled={saving || readOnly} onChange={(event) => updateAttendance(index, event.target.value)}>{statuses.map((option) => <option key={option} value={option}>{option}</option>)}</select></td></tr>; })}</tbody></table></div></div></div><div className="col-lg-5"><div className="card"><div className="card-header bg-white px-4 py-3"><h2 className="h5 mb-0">Leave requests</h2></div><div className="card-body">{selected.leaveRequests.length ? selected.leaveRequests.map((request) => <div className="border rounded p-3 mb-3" key={request.id}><strong>{request.date}</strong><p className="small text-muted mb-2">{request.reason}</p><span className={`badge ${request.status === "approved" ? "text-bg-success" : request.status === "declined" ? "text-bg-danger" : "text-bg-warning"}`}>{request.status}</span>{request.status === "pending" ? <div className="d-flex gap-2 mt-3"><button type="button" className="btn btn-sm btn-success" onClick={() => updateLeave(request.id, "approved")} disabled={saving}>Approve paid leave</button><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => updateLeave(request.id, "declined")} disabled={saving}>Decline</button></div> : null}</div>) : <p className="text-muted mb-3">No leave requests for this staff member.</p>}<hr /><h3 className="h6">Create leave request</h3><p className="small text-muted">Managers and administrators may create requests; future dates are not allowed.</p><form onSubmit={requestHoliday}><label className="form-label" htmlFor="leaveDate">Leave date</label><input id="leaveDate" type="date" className="form-control mb-2" min={`${month}-01`} max={today() < `${month}-${String(daysInMonth(month)).padStart(2, "0")}` ? today() : `${month}-${String(daysInMonth(month)).padStart(2, "0")}`} value={holidayForm.date} onChange={(event) => setHolidayForm({ ...holidayForm, date: event.target.value })} required disabled={saving} /><label className="form-label" htmlFor="leaveReason">Reason</label><input id="leaveReason" className="form-control mb-3" placeholder="Reason for leave" value={holidayForm.reason} onChange={(event) => setHolidayForm({ ...holidayForm, reason: event.target.value })} required disabled={saving} /><button type="submit" className="btn btn-outline-primary w-100" disabled={saving}>Submit leave request</button></form></div></div></div></div>}
  </>;
}
