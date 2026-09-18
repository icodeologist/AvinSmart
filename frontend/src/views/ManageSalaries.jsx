import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";

const monthDays = 30;
const makeAttendance = (presentDays, absentDays, holidayDays = []) => Array.from({ length: monthDays }, (_, index) => {
  if (holidayDays.includes(index)) return "holiday";
  if (index < presentDays) return "present";
  if (index < presentDays + absentDays) return "absent";
  return "not-marked";
});
const dummySalaries = [
  { id: 1, name: "Rahul Kumar", role: "Sales", monthlyPay: 10000, present: 22, absent: 2, attendance: makeAttendance(22, 2, [25]), leaveRequests: [{ id: 11, date: "18 Sep 2026", reason: "Family function", status: "pending" }] },
  { id: 2, name: "Priya Sharma", role: "Inventory", monthlyPay: 10000, present: 24, absent: 1, attendance: makeAttendance(24, 1, [26]), leaveRequests: [{ id: 12, date: "22 Sep 2026", reason: "Personal work", status: "pending" }] },
  { id: 3, name: "Kiran Reddy", role: "Manager", monthlyPay: 15000, present: 23, absent: 0, attendance: makeAttendance(23, 0, [24]), leaveRequests: [] },
];

function money(value) { return `₹${Number(value || 0).toFixed(2)}`; }
function approvedLeaveDays(staff) { return staff.leaveRequests.filter((request) => request.status === "approved").length; }
function payableSalary(staff) {
  const paidDays = Math.min(monthDays, staff.present + approvedLeaveDays(staff));
  return staff.monthlyPay * paidDays / monthDays;
}

export default function ManageSalaries() {
  const [records, setRecords] = useState(dummySalaries);
  const [selectedId, setSelectedId] = useState(null);
  const [month, setMonth] = useState("September 2026");
  const [holidayForm, setHolidayForm] = useState({ date: "", reason: "" });
  const selected = records.find((record) => record.id === selectedId);
  const totalPayable = useMemo(() => records.reduce((sum, record) => sum + payableSalary(record), 0), [records]);

  function updateAttendance(index, status) {
    setRecords((current) => current.map((record) => {
      if (record.id !== selectedId) return record;
      const previousStatus = record.attendance[index];
      let present = record.present;
      let absent = record.absent;
      if (previousStatus === "present") present -= 1;
      if (previousStatus === "absent") absent -= 1;
      if (status === "present") present += 1;
      if (status === "absent") absent += 1;
      return { ...record, present, absent, attendance: record.attendance.map((item, itemIndex) => itemIndex === index ? status : item) };
    }));
  }

  function updateLeave(requestId, status) {
    setRecords((current) => current.map((record) => ({ ...record, leaveRequests: record.leaveRequests.map((request) => request.id === requestId ? { ...request, status } : request) })));
  }

  function requestHoliday(event) {
    event.preventDefault();
    if (!holidayForm.date || !holidayForm.reason.trim()) return;
    setRecords((current) => current.map((record) => record.id === selectedId ? { ...record, leaveRequests: [...record.leaveRequests, { id: Date.now(), date: holidayForm.date, reason: holidayForm.reason.trim(), status: "pending" }] } : record));
    setHolidayForm({ date: "", reason: "" });
  }

  return <>
    <PageHeader title="Manage Salaries" subtitle="Manage monthly pay, daily attendance, and staff holidays">
      <Link to="/staff" className="btn btn-outline-secondary"><i className="ti ti-arrow-left me-1"></i>Back to Staff</Link>
    </PageHeader>
    <div className="row g-3 mb-3"><div className="col-md-4"><div className="card h-100"><div className="card-body"><small className="text-muted d-block">Salary month</small><select className="form-select mt-2" value={month} onChange={(event) => setMonth(event.target.value)}><option>September 2026</option><option>October 2026</option><option>November 2026</option></select></div></div></div><div className="col-md-4"><div className="card h-100"><div className="card-body"><small className="text-muted d-block">Working days</small><strong className="fs-4">{monthDays} days</strong><small className="d-block text-muted">Attendance-based demo</small></div></div></div><div className="col-md-4"><div className="card h-100"><div className="card-body"><small className="text-muted d-block">Total payable</small><strong className="fs-4 text-primary">{money(totalPayable)}</strong><small className="d-block text-muted">For {month}</small></div></div></div></div>
    <section className="card mb-3"><div className="card-header bg-white px-4 py-3"><h2 className="h5 mb-1">Monthly salary table</h2><p className="small text-muted mb-0">Approved holidays are counted as paid days and do not reduce salary.</p></div><div className="table-responsive"><table className="table mb-0 align-middle"><thead className="table-light"><tr><th>Staff</th><th>Monthly pay</th><th>Present</th><th>Absent</th><th>Approved holidays</th><th>Payable</th><th></th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><strong>{record.name}</strong><small className="d-block text-muted">{record.role}</small></td><td>{money(record.monthlyPay)}</td><td className="text-success">{record.present}</td><td className="text-danger">{record.absent}</td><td>{approvedLeaveDays(record)}</td><td className="fw-bold">{money(payableSalary(record))}</td><td><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSelectedId(record.id)}><i className="ti ti-calendar me-1"></i>Attendance</button></td></tr>)}</tbody></table></div></section>
    {selected ? <div className="row g-3"><div className="col-lg-7"><div className="card"><div className="card-header bg-white px-4 py-3 d-flex justify-content-between"><div><h2 className="h5 mb-1">Daily attendance — {selected.name}</h2><p className="small text-muted mb-0">Click each day to update the demo status.</p></div><button type="button" className="btn-close" aria-label="Close" onClick={() => setSelectedId(null)}></button></div><div className="table-responsive"><table className="table mb-0 align-middle"><thead className="table-light"><tr><th>Day</th><th>Status</th></tr></thead><tbody>{selected.attendance.map((status, index) => <tr key={index}><td>{index + 1} Sep 2026</td><td><select className="form-select form-select-sm" value={status} onChange={(event) => updateAttendance(index, event.target.value)}><option value="present">Present</option><option value="absent">Absent</option><option value="holiday">Holiday</option><option value="not-marked">Not marked</option></select></td></tr>)}</tbody></table></div></div></div><div className="col-lg-5"><div className="card"><div className="card-header bg-white px-4 py-3"><h2 className="h5 mb-0">Holiday requests</h2></div><div className="card-body">{selected.leaveRequests.length ? selected.leaveRequests.map((request) => <div className="border rounded p-3 mb-3" key={request.id}><strong>{request.date}</strong><p className="small text-muted mb-2">{request.reason}</p><span className={`badge ${request.status === "approved" ? "text-bg-success" : request.status === "declined" ? "text-bg-danger" : "text-bg-warning"}`}>{request.status}</span>{request.status === "pending" ? <div className="d-flex gap-2 mt-3"><button type="button" className="btn btn-sm btn-success" onClick={() => updateLeave(request.id, "approved")}>Approve paid holiday</button><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => updateLeave(request.id, "declined")}>Decline</button></div> : null}</div>) : <p className="text-muted mb-3">No holiday requests for this staff member.</p>}<hr /><h3 className="h6">Request a holiday</h3><form onSubmit={requestHoliday}><label className="form-label" htmlFor="holidayDate">Holiday date</label><input id="holidayDate" type="date" className="form-control mb-2" value={holidayForm.date} onChange={(event) => setHolidayForm({ ...holidayForm, date: event.target.value })} required /><label className="form-label" htmlFor="holidayReason">Reason</label><input id="holidayReason" className="form-control mb-3" placeholder="Reason for holiday" value={holidayForm.reason} onChange={(event) => setHolidayForm({ ...holidayForm, reason: event.target.value })} required /><button type="submit" className="btn btn-outline-primary w-100">Submit holiday request</button></form></div></div></div></div> : null}
  </>;
}
