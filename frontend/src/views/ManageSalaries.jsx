import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import {
  createSalary,
  fetchAttendance,
  fetchPayrollCalendar,
  fetchPayrollSummary,
  fetchSalaryRecords,
  fetchStaffForPayroll,
  markSalaryPaid,
  saveAttendance,
  saveDailyAttendance,
  updatePayrollCalendar,
  updateSalary,
} from "../api/salaryApi.js";

const statuses = ["present", "absent", "holiday", "not-marked"];
const today = () => {
  const current = new Date();
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, "0");
  const day = String(current.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const monthLabel = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const dateFor = (month, day) => `${month}-${String(day).padStart(2, "0")}`;
const displayDate = (date) => {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
};
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

function makeRecord(member, salary, attendance, month, calendar, payrollRecord) {
  const count = daysInMonth(month);
  const byDate = Object.fromEntries(attendance.map((item) => [String(item.date || "").slice(0, 10), item.status]));
  const days = Array.from({ length: count }, (_, index) => byDate[dateFor(month, index + 1)] || "not-marked");
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
    workingDays: calendar?.working_days || 0,
    payableAmount: payrollRecord?.payable_amount || null,
  };
}

function payableSalary(record) {
  if (record.payableAmount !== null) return Number(record.payableAmount);
  const payableDays = record.present;
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
  const [dailyDate, setDailyDate] = useState(today);
  const [dailyStatuses, setDailyStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDailyStaffId, setSavingDailyStaffId] = useState(null);
  const [alert, setAlert] = useState(null);
  const selected = records.find((record) => record.id === selectedId);

  async function load() {
    setLoading(true);
    setAlert(null);
    try {
      const [members, salaries, loadedCalendar, loadedSummary] = await Promise.all([fetchStaffForPayroll(), fetchSalaryRecords(month), fetchPayrollCalendar(month), fetchPayrollSummary(month)]);
      const salaryByStaff = Object.fromEntries(salaries.map((item) => [item.staffId, item]));
      const payrollByStaff = Object.fromEntries((loadedSummary.records || []).map((item) => [item.staff_id, item]));
      const hydrated = await Promise.all(members.map(async (member) => {
        const attendance = await fetchAttendance(member.id, month);
        return makeRecord(member, salaryByStaff[member.id], attendance || [], month, loadedCalendar, payrollByStaff[member.id]);
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

  useEffect(() => {
    const currentMonth = today().slice(0, 7);
    const lastDay = `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
    setDailyDate(month === currentMonth ? today() : month < currentMonth ? lastDay : "");
  }, [month]);

  useEffect(() => {
    if (!dailyDate || !dailyDate.startsWith(month)) {
      setDailyStatuses({});
      return;
    }
    const dayIndex = Number(dailyDate.slice(-2)) - 1;
    setDailyStatuses(Object.fromEntries(records.map((record) => [record.staffId, record.attendance[dayIndex] || "not-marked"])));
  }, [dailyDate, month, records]);

  const calculatedTotalPayable = useMemo(() => records.reduce((sum, record) => sum + payableSalary(record), 0), [records]);
  const totalPayable = summary ? Number(summary.total_payable || 0) : calculatedTotalPayable;
  const payrollCurrency = summary?.records?.find((record) => record.currency)?.currency || records.find((record) => record.salaryRecord)?.currency || "INR";
  const dailyDateMax = month === today().slice(0, 7) ? today() : month < today().slice(0, 7) ? `${month}-${String(daysInMonth(month)).padStart(2, "0")}` : "";

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
    const amount = record.payableAmount || payableSalary(record).toFixed(2);
    if (Number(amount) <= 0) {
      setAlert({ type: "danger", message: "Record attendance before marking a salary as paid." });
      return;
    }
    setSaving(true);
    try {
      await markSalaryPaid(record.salaryRecord.id, { amount, method: "bank_transfer" });
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
    if (date > today()) return;
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

  async function updateDailyAttendance(staffId, status) {
    if (!dailyDate || dailyDate > today()) return;
    const previousStatus = dailyStatuses[staffId] || "not-marked";
    setDailyStatuses((current) => ({ ...current, [staffId]: status }));
    setSavingDailyStaffId(staffId);
    setAlert(null);
    try {
      await saveAttendance({ staffId, date: dailyDate, status });
      await load();
      setAlert({ type: "success", message: `Attendance updated for ${displayDate(dailyDate)}.` });
    } catch (error) {
      setDailyStatuses((current) => ({ ...current, [staffId]: previousStatus }));
      showError(error);
    } finally {
      setSavingDailyStaffId(null);
    }
  }

  async function saveDailyRegister() {
    if (!dailyDate || dailyDate > today() || !records.length) return;
    setSaving(true);
    setAlert(null);
    try {
      await saveDailyAttendance({ date: dailyDate, entries: records.map((record) => ({ staff_id: record.staffId, status: dailyStatuses[record.staffId] || "not-marked" })) });
      await load();
      setAlert({ type: "success", message: `Attendance saved for ${displayDate(dailyDate)}.` });
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

  return <>
    <PageHeader title="Manage Salaries" subtitle="Manage monthly pay, attendance, and payroll calendars"><Link to="/staff" className="btn btn-outline-secondary"><i className="ti ti-arrow-left me-1"></i>Back to Staff</Link></PageHeader>
    {alert && <div className={`alert alert-${alert.type}`} role="alert">{alert.message}{alert.fields ? <ul className="mb-0 mt-2">{Object.entries(alert.fields).flatMap(([field, messages]) => (Array.isArray(messages) ? messages : [messages]).map((message) => <li key={`${field}-${message}`}>{field}: {message}</li>))}</ul> : null}{alert.retry ? <button type="button" className="btn btn-sm btn-outline-danger mt-2" onClick={load}>Retry</button> : null}</div>}

    <div className="row g-3 mb-3">
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><label className="small text-muted" htmlFor="salaryMonth">Salary month</label><select id="salaryMonth" className="form-select mt-2" value={month} onChange={(event) => setMonth(event.target.value)}>{options.map((value) => <option value={value} key={value}>{monthLabel(value)}</option>)}</select></div></div></div>
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><form onSubmit={saveWorkingDays}><label className="small text-muted" htmlFor="workingDays">Configured working days</label><div className="input-group mt-2"><input id="workingDays" type="number" min="1" max="31" className="form-control" value={calendar?.working_days || ""} disabled={!calendar || saving} onChange={(event) => setCalendar({ ...calendar, working_days: event.target.value })} /><button className="btn btn-outline-primary" type="submit" disabled={!calendar || saving}>Save</button></div><small className="d-block text-muted mt-1">Used to calculate prorated monthly pay.</small></form></div></div></div>
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><small className="text-muted d-block">Total payable</small><strong className="fs-4 text-primary">{currency(totalPayable, payrollCurrency)}</strong><small className="d-block text-muted">For {monthLabel(month)} · {calendar?.working_days || 0} working days</small></div></div></div>
    </div>

    <section className="card mb-3"><div className="card-header bg-white px-4 py-3 d-flex flex-wrap justify-content-between align-items-center gap-3"><div><h2 className="h5 mb-1">Daily attendance</h2><p className="small text-muted mb-0">Each employee's status saves immediately. Use Save day to submit the full register.</p></div><div className="d-flex align-items-center gap-2"><input type="date" className="form-control form-control-sm" style={{ width: 150 }} min={`${month}-01`} max={dailyDateMax || undefined} value={dailyDate} disabled={!dailyDateMax || saving || savingDailyStaffId !== null} onChange={(event) => setDailyDate(event.target.value)} /><button type="button" className="btn btn-sm btn-primary" disabled={saving || savingDailyStaffId !== null || !dailyDate || !records.length} onClick={saveDailyRegister}>{saving ? "Saving..." : "Save day"}</button></div></div><div className="table-responsive"><table className="table mb-0 align-middle"><thead className="table-light"><tr><th>Employee</th><th>Role</th><th>Status</th></tr></thead><tbody>{loading ? <tr><td colSpan="3" className="text-center py-4">Loading staff...</td></tr> : !dailyDateMax ? <tr><td colSpan="3" className="text-center py-4 text-muted">Daily attendance cannot be recorded for a future month.</td></tr> : !records.length ? <tr><td colSpan="3" className="text-center py-4 text-muted">No staff members found.</td></tr> : records.map((record) => <tr key={record.staffId}><td><strong>{record.name}</strong></td><td><span className="text-muted text-capitalize">{record.role}</span></td><td><div className="d-flex align-items-center gap-2"><select className="form-select form-select-sm" style={{ width: 132 }} value={dailyStatuses[record.staffId] || "not-marked"} disabled={saving || savingDailyStaffId !== null} onChange={(event) => updateDailyAttendance(record.staffId, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>{savingDailyStaffId === record.staffId ? <span className="small text-primary">Saving...</span> : null}</div></td></tr>)}</tbody></table></div></section>

    <section className="card mb-3"><div className="card-header bg-white px-4 py-3"><h2 className="h5 mb-1">Attendance overview</h2><p className="small text-muted mb-0">A simple monthly summary for every employee.</p></div><div className="table-responsive"><table className="table mb-0 align-middle"><thead className="table-light"><tr><th>Employee</th><th className="text-success">Present</th><th className="text-danger">Absent</th><th>Not marked</th><th></th></tr></thead><tbody>{loading ? <tr><td colSpan="5" className="text-center py-4">Loading attendance...</td></tr> : !records.length ? <tr><td colSpan="5" className="text-center py-4 text-muted">No staff members found.</td></tr> : records.map((record) => { const notMarked = record.attendance.filter((status) => status === "not-marked").length; return <tr key={record.id}><td><strong>{record.name}</strong><small className="d-block text-muted text-capitalize">{record.role}</small></td><td className="text-success fw-semibold">{record.present}</td><td className="text-danger fw-semibold">{record.absent}</td><td>{notMarked ? <span className="badge text-bg-light border">{notMarked}</span> : <span className="text-muted">—</span>}</td><td className="text-end"><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSelectedId(record.id)} disabled={saving}>View days</button></td></tr>; })}</tbody></table></div></section>

    <section className="card mb-3"><div className="card-header bg-white px-4 py-3 d-flex justify-content-between align-items-center"><div><h2 className="h5 mb-1">Monthly salary table</h2><p className="small text-muted mb-0">Fixed monthly pay is prorated by present days.</p></div><button type="button" className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading || saving}><i className="ti ti-refresh me-1"></i>Refresh</button></div><div className="card-body border-bottom"><form className="row g-2 align-items-end" onSubmit={submitSalary}><div className="col-md-3"><label className="form-label" htmlFor="salaryStaff">Staff member</label><select id="salaryStaff" className="form-select" value={salaryForm.staffId} onChange={(event) => setSalaryForm({ ...salaryForm, staffId: event.target.value })} disabled={saving}><option value="">Choose staff</option>{records.map((record) => <option value={record.staffId} key={record.staffId}>{record.name}</option>)}</select></div><div className="col-md-3"><label className="form-label" htmlFor="salaryAmount">Monthly amount</label><input id="salaryAmount" className="form-control" inputMode="decimal" placeholder="0.00" value={salaryForm.amount} onChange={(event) => setSalaryForm({ ...salaryForm, amount: event.target.value })} disabled={saving} /></div><div className="col-md-2"><label className="form-label" htmlFor="salaryCurrency">Currency</label><select id="salaryCurrency" className="form-select" value={salaryForm.currency} onChange={(event) => setSalaryForm({ ...salaryForm, currency: event.target.value })} disabled={saving}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></div><div className="col-md-4 d-flex gap-2"><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : editingSalaryId ? "Update salary" : "Create salary"}</button>{editingSalaryId ? <button className="btn btn-outline-secondary" type="button" onClick={() => { setEditingSalaryId(null); setSalaryForm({ staffId: "", amount: "", currency: "INR" }); }}>Cancel</button> : null}</div></form></div><div className="table-responsive"><table className="table mb-0 align-middle"><thead className="table-light"><tr><th>Staff</th><th>Monthly pay</th><th>Present</th><th>Absent</th><th>Payable</th><th>Status</th><th></th></tr></thead><tbody>{loading ? <tr><td colSpan="7" className="text-center py-4">Loading salary data...</td></tr> : !records.length ? <tr><td colSpan="7" className="text-center py-4 text-muted">No staff members found.</td></tr> : records.map((record) => <tr key={record.id}><td><strong>{record.name}</strong><small className="d-block text-muted">{record.role}</small></td><td>{record.salaryRecord ? currency(record.monthlyPay, record.currency) : <span className="text-muted">No salary record</span>}</td><td className="text-success">{record.present}</td><td className="text-danger">{record.absent}</td><td className="fw-bold">{record.salaryRecord ? currency(payableSalary(record), record.currency) : "—"}</td><td>{record.salaryRecord ? <span className={`badge ${record.salaryRecord.status === "paid" ? "text-bg-success" : "text-bg-warning"}`}>{record.salaryRecord.status}</span> : "—"}</td><td className="text-end"><div className="d-flex gap-2 justify-content-end"><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSelectedId(record.id)} disabled={saving}>Attendance</button><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => startSalaryForm(record)} disabled={saving || record.salaryRecord?.status === "paid"}>{record.salaryRecord ? "Edit" : "Set salary"}</button>{record.salaryRecord?.status === "pending" ? <button type="button" className="btn btn-sm btn-outline-success" onClick={() => paySalary(record)} disabled={saving}>Mark paid</button> : null}</div></td></tr>)}</tbody></table></div></section>

    {selected && <div className="card"><div className="card-header bg-white px-4 py-3 d-flex justify-content-between"><div><h2 className="h5 mb-1">Daily attendance — {selected.name}</h2><p className="small text-muted mb-0">Future dates are read-only.</p></div><button type="button" className="btn-close" aria-label="Close" onClick={() => setSelectedId(null)}></button></div><div className="table-responsive"><table className="table mb-0 align-middle"><thead className="table-light"><tr><th>Date</th><th>Status</th></tr></thead><tbody>{selected.attendance.map((status, index) => { const date = dateFor(month, index + 1); const readOnly = date > today(); return <tr key={date}><td>{displayDate(date)}</td><td><select className="form-select form-select-sm" style={{ width: 132 }} value={status} disabled={saving || readOnly} onChange={(event) => updateAttendance(index, event.target.value)}>{statuses.map((option) => <option key={option} value={option}>{option}</option>)}</select></td></tr>; })}</tbody></table></div></div>}
  </>;
}
