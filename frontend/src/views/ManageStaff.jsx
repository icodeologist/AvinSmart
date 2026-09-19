import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import StaffGrid from "../components/staff/StaffGrid.jsx";

const dummyStaff = [
  { id: 1, name: "Rahul Kumar", email: "rahul@avinsmart.in", phone: "9876543210", role: "sales", status: "active", joinedOn: "2026-01-12", passwordSet: true },
  { id: 2, name: "Priya Sharma", email: "priya@avinsmart.in", phone: "9988776655", role: "inventory", status: "active", joinedOn: "2026-02-05", passwordSet: true },
  { id: 3, name: "Kiran Reddy", email: "kiran@avinsmart.in", phone: "9123456780", role: "manager", status: "active", joinedOn: "2025-11-20", passwordSet: true },
];

export default function ManageStaff() {
  const [staff, setStaff] = useState(dummyStaff);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const location = useLocation();
  const [registeredName, setRegisteredName] = useState("");
  const handledRegistration = useRef(false);

  useEffect(() => {
    if (!location.state?.staff || handledRegistration.current) return;
    handledRegistration.current = true;
    setStaff((current) => [...current, location.state.staff]);
    setRegisteredName(location.state.staff.name);
  }, []);

  function viewStaff(member) { setSelectedStaff(member); setEditing(false); setPassword(""); setNotice(""); }
  function editStaff(member) { setSelectedStaff(member); setEditing(true); setEditForm({ name: member.name, email: member.email, phone: member.phone, role: member.role, status: member.status }); setPassword(""); setNotice(""); }
  function resetPassword(member) { setSelectedStaff(member); setEditing(false); setPassword(""); setNotice(""); }
  function saveDetails(event) {
    event.preventDefault();
    const updated = { ...selectedStaff, ...editForm };
    setStaff((current) => current.map((member) => member.id === updated.id ? updated : member));
    setSelectedStaff(updated); setEditing(false); setNotice("Staff account details updated in the frontend demo.");
  }
  function savePassword(event) {
    event.preventDefault();
    if (password.length < 6) { setNotice("Password must contain at least 6 characters."); return; }
    setStaff((current) => current.map((member) => member.id === selectedStaff.id ? { ...member, passwordSet: true } : member));
    setSelectedStaff((current) => ({ ...current, passwordSet: true }));
    setPassword(""); setNotice("Password updated for this staff member in the frontend demo.");
  }

  return (
    <>
      <PageHeader title="Manage Staff" subtitle="View your staff members">
        <Link to="/pos/login" className="btn btn-success">
          <i className="ti ti-device-desktop me-1"></i>Open Staff POS
        </Link>
        <Link to="/staff/salaries" className="btn btn-primary">
          <i className="ti ti-wallet me-1"></i>View Staff Salaries
        </Link>
        <Link to="/staff/register" className="btn btn-outline-primary">
          <i className="ti ti-user-plus me-1"></i>Register New Staff
        </Link>
      </PageHeader>

      {registeredName ? (
        <div className="alert alert-success d-flex justify-content-between align-items-center mb-4" role="alert">
          <span><i className="ti ti-circle-check me-2"></i><strong>{registeredName}</strong> was registered successfully.</span>
          <button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setRegisteredName("")}></button>
        </div>
      ) : null}

      {notice ? <div className="alert alert-info mb-4" role="alert">{notice}</div> : null}
      <div className="row g-4"><div className="col-12"><StaffGrid staff={staff} onView={viewStaff} onEdit={editStaff} onResetPassword={resetPassword} /></div></div>
      {selectedStaff ? <div className="card mt-4"><div className="card-header bg-white px-4 py-3 d-flex justify-content-between align-items-center"><h2 className="h5 mb-0">{editing ? "Edit staff account" : "Staff account details"}</h2><button type="button" className="btn-close" aria-label="Close" onClick={() => setSelectedStaff(null)}></button></div><div className="card-body p-4">{editing ? <form className="row g-3" onSubmit={saveDetails}><div className="col-md-6"><label htmlFor="editStaffName" className="form-label">Name</label><input id="editStaffName" className="form-control" value={editForm.name || ""} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} required /></div><div className="col-md-6"><label htmlFor="editStaffEmail" className="form-label">Email</label><input id="editStaffEmail" type="email" className="form-control" value={editForm.email || ""} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} required /></div><div className="col-md-6"><label htmlFor="editStaffPhone" className="form-label">Phone</label><input id="editStaffPhone" className="form-control" value={editForm.phone || ""} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} /></div><div className="col-md-6"><label htmlFor="editStaffRole" className="form-label">Role</label><select id="editStaffRole" className="form-select" value={editForm.role || "staff"} onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}><option value="manager">Manager</option><option value="sales">Sales</option><option value="inventory">Inventory</option><option value="support">Support</option></select></div><div className="col-md-6"><label htmlFor="editStaffStatus" className="form-label">Status</label><select id="editStaffStatus" className="form-select" value={editForm.status || "active"} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div><div className="col-12 d-flex gap-2"><button type="submit" className="btn btn-primary"><i className="ti ti-device-floppy me-1"></i>Save details</button><button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(false)}>Cancel</button></div></form> : <div className="row g-4"><div className="col-md-6"><small className="text-muted d-block">Name</small><strong>{selectedStaff.name}</strong></div><div className="col-md-6"><small className="text-muted d-block">Email</small><strong>{selectedStaff.email}</strong></div><div className="col-md-6"><small className="text-muted d-block">Phone</small><strong>{selectedStaff.phone || "Not available"}</strong></div><div className="col-md-6"><small className="text-muted d-block">Role</small><strong className="text-capitalize">{selectedStaff.role}</strong></div><div className="col-md-6"><small className="text-muted d-block">Account status</small><strong className="text-success">{selectedStaff.status}</strong></div><div className="col-md-6"><small className="text-muted d-block">Password</small><strong>{selectedStaff.passwordSet ? "Set by admin" : "Not set"}</strong></div><div className="col-12"><button type="button" className="btn btn-outline-primary" onClick={() => editStaff(selectedStaff)}><i className="ti ti-edit me-1"></i>Edit account</button></div></div>}<hr /><h3 className="h6">Admin password control</h3><form className="row g-3 align-items-end" onSubmit={savePassword}><div className="col-md-6"><label htmlFor="staffNewPassword" className="form-label">New password</label><input id="staffNewPassword" type="password" className="form-control" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter a new password" minLength="6" required /></div><div className="col-md-3"><button type="submit" className="btn btn-primary"><i className="ti ti-key me-1"></i>Save password</button></div></form></div></div> : null}
    </>
  );
}
