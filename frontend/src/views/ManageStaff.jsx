import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import StaffGrid from "../components/staff/StaffGrid.jsx";
import { changeStaffPassword, deleteStaff, fetchStaff, updateStaff } from "../api/staffApi.js";
import { fetchOutlets } from "../api/outletsApi.js";

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const location = useLocation();
  const [registeredName, setRegisteredName] = useState("");
  const handledRegistration = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchStaff().then((data) => {
      if (cancelled) return;
      setStaff(data);
      setLoading(false);
    }).catch((error) => {
      if (cancelled) return;
      setLoadError(error.message);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetchOutlets().then(setOutlets).catch((error) => setLoadError((current) => current || error.message));
  }, []);

  useEffect(() => {
    if (!location.state?.staff || handledRegistration.current) return;
    handledRegistration.current = true;
    setRegisteredName(location.state.staff.name);
  }, [location.state]);

  function viewStaff(member) {
    setSelectedStaff(member);
    setEditing(false);
    setPassword("");
    setNotice("");
  }

  function editStaff(member) {
    setSelectedStaff(member);
    setEditing(true);
    setEditForm({ name: member.name, email: member.email, phone: member.phone, role: member.role, status: member.status, outletIds: (member.outlets || []).map((outlet) => outlet.id) });
    setPassword("");
    setNotice("");
  }

  function resetPassword(member) {
    setSelectedStaff(member);
    setEditing(false);
    setPassword("");
    setNotice("");
  }

  async function saveDetails(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const updated = await updateStaff(selectedStaff.id, editForm);
      setStaff((current) => current.map((member) => member.id === updated.id ? updated : member));
      setSelectedStaff(updated);
      setEditing(false);
      setNotice("Staff account details updated.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    if (password.length < 8) {
      setNotice("Password must contain at least 8 characters.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      await changeStaffPassword(selectedStaff.id, password, password);
      setStaff((current) => current.map((member) => member.id === selectedStaff.id ? { ...member, passwordSet: true } : member));
      setSelectedStaff((current) => ({ ...current, passwordSet: true }));
      setPassword("");
      setNotice("Password updated for this staff member.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeStaff() {
    if (!selectedStaff || !window.confirm(`Delete ${selectedStaff.name}'s staff account?`)) return;
    setSaving(true);
    setNotice("");
    try {
      await deleteStaff(selectedStaff.id);
      setStaff((current) => current.filter((member) => member.id !== selectedStaff.id));
      setSelectedStaff(null);
      setNotice(`${selectedStaff.name} was deleted.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Manage Staff" subtitle="View your staff members">
        <Link to="/staff/sales/login" className="btn btn-success"><i className="ti ti-device-desktop me-1"></i>Open Staff / Sales Login</Link>
        <Link to="/staff/salaries" className="btn btn-primary"><i className="ti ti-wallet me-1"></i>View Staff Salaries</Link>
        <Link to="/staff/register" className="btn btn-outline-primary"><i className="ti ti-user-plus me-1"></i>Register New Staff</Link>
      </PageHeader>

      {registeredName ? <div className="alert alert-success d-flex justify-content-between align-items-center mb-4" role="alert"><span><i className="ti ti-circle-check me-2"></i><strong>{registeredName}</strong> was registered successfully.</span><button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setRegisteredName("")}></button></div> : null}
      {notice ? <div className="alert alert-info mb-4" role="alert">{notice}</div> : null}
      {loadError ? <div className="alert alert-danger mb-4" role="alert"><i className="ti ti-alert-triangle me-2"></i>{loadError}</div> : null}

      <div className="row g-4"><div className="col-12"><StaffGrid staff={staff} loading={loading} onView={viewStaff} onEdit={editStaff} onResetPassword={resetPassword} /></div></div>

      {selectedStaff ? <div className="card mt-4">
        <div className="card-header bg-white px-4 py-3 d-flex justify-content-between align-items-center"><h2 className="h5 mb-0">{editing ? "Edit staff account" : "Staff account details"}</h2><button type="button" className="btn-close" aria-label="Close" onClick={() => setSelectedStaff(null)}></button></div>
        <div className="card-body p-4">
          {editing ? <form className="row g-3" onSubmit={saveDetails}>
            <div className="col-md-6"><label htmlFor="editStaffName" className="form-label">Name</label><input id="editStaffName" className="form-control" value={editForm.name || ""} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} required /></div>
            <div className="col-md-6"><label htmlFor="editStaffEmail" className="form-label">Email</label><input id="editStaffEmail" type="email" className="form-control" value={editForm.email || ""} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} required /></div>
            <div className="col-md-6"><label htmlFor="editStaffPhone" className="form-label">Phone</label><input id="editStaffPhone" className="form-control" value={editForm.phone || ""} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} required /></div>
            <div className="col-md-6"><label htmlFor="editStaffRole" className="form-label">Role</label><select id="editStaffRole" className="form-select" value={editForm.role || "staff"} onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}><option value="manager">Manager</option><option value="sales">Sales</option><option value="inventory">Inventory</option><option value="inventory_staff">Inventory Staff</option><option value="support">Support</option></select></div>
            <div className="col-md-6"><label htmlFor="editStaffStatus" className="form-label">Status</label><select id="editStaffStatus" className="form-select" value={editForm.status || "active"} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            <div className="col-md-6"><label htmlFor="editStaffOutlets" className="form-label">Assigned outlets</label><select id="editStaffOutlets" className="form-select" multiple size="4" value={editForm.outletIds || []} onChange={(event) => setEditForm({ ...editForm, outletIds: Array.from(event.target.selectedOptions).map((option) => Number(option.value)) })}>{outlets.map((outlet) => <option value={outlet.id} key={outlet.id}>{outlet.name}</option>)}</select></div>
            <div className="col-12 d-flex gap-2"><button type="submit" className="btn btn-primary" disabled={saving}><i className="ti ti-device-floppy me-1"></i>{saving ? "Saving..." : "Save details"}</button><button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(false)}>Cancel</button></div>
          </form> : <>
            <div className="row g-4"><div className="col-md-6"><small className="text-muted d-block">Name</small><strong>{selectedStaff.name}</strong></div><div className="col-md-6"><small className="text-muted d-block">Email</small><strong>{selectedStaff.email}</strong></div><div className="col-md-6"><small className="text-muted d-block">Phone</small><strong>{selectedStaff.phone || "Not available"}</strong></div><div className="col-md-6"><small className="text-muted d-block">Role</small><strong className="text-capitalize">{selectedStaff.role}</strong></div><div className="col-md-6"><small className="text-muted d-block">Account status</small><strong className="text-success">{selectedStaff.status}</strong></div><div className="col-md-6"><small className="text-muted d-block">Assigned outlets</small><strong>{(selectedStaff.outlets || []).map((outlet) => outlet.name).join(", ") || "None"}</strong></div><div className="col-md-6"><small className="text-muted d-block">Password</small><strong>{selectedStaff.passwordSet ? "Set by admin" : "Not set"}</strong></div></div>
            <div className="d-flex gap-2 mt-4"><button type="button" className="btn btn-outline-primary" onClick={() => editStaff(selectedStaff)}><i className="ti ti-edit me-1"></i>Edit account</button><button type="button" className="btn btn-outline-danger" onClick={removeStaff} disabled={saving}><i className="ti ti-trash me-1"></i>Delete account</button></div>
          </>}
          <hr /><h3 className="h6">Admin password control</h3>
          <form className="row g-3 align-items-end" onSubmit={savePassword}><div className="col-md-6"><label htmlFor="staffNewPassword" className="form-label">New password</label><input id="staffNewPassword" type="password" className="form-control" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter a new password" minLength="8" required /></div><div className="col-md-3"><button type="submit" className="btn btn-primary" disabled={saving}><i className="ti ti-key me-1"></i>{saving ? "Saving..." : "Save password"}</button></div></form>
        </div>
      </div> : null}
    </>
  );
}
