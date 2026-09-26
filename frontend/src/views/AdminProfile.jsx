import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import { API_BASE_URL } from "../api/config.js";
import { updateProfile } from "../api/profileApi.js";
import { useState } from "react";

function photoPath(photo) {
  if (!photo) return "/assets/images/avatar/avatar-1.jpg";
  if (photo.startsWith("http") || photo.startsWith("data:")) return photo;
  if (photo.startsWith("/static/")) return new URL(API_BASE_URL, window.location.origin).origin + photo;
  return photo;
}

function currentAccount() {
  try {
    const staff = JSON.parse(sessionStorage.getItem("avinSmartPosStaff") || "null");
    if (staff) return { ...staff, accountType: "staff" };
    const admin = JSON.parse(localStorage.getItem("admin") || "null");
    return admin ? { ...admin, accountType: "admin" } : null;
  } catch {
    return null;
  }
}

export default function AdminProfile() {
  const [account, setAccount] = useState(currentAccount);
  const [name, setName] = useState(account?.username || account?.name || "");
  const [photoBase64, setPhotoBase64] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const displayName = account?.username || account?.name || "Account";
  const email = account?.email || "Not available";
  const phone = account?.phone_num || account?.phone || "Not available";
  const joined = account?.created_at ? new Date(account.created_at).toLocaleDateString("en-IN") : "Not available";
  const role = account?.accountType === "admin" ? "Administrator" : account?.role === "inventory_staff" ? "Inventory Staff" : "Sales Staff";
  const backPath = account?.accountType === "staff" && account.role === "inventory_staff" ? "/inventory" : account?.accountType === "staff" ? "/pos" : "/dashboard";
  const photo = photoPath(account?.photo);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const updated = await updateProfile({ name, photoBase64 });
      const storageKey = account?.accountType === "staff" ? "avinSmartPosStaff" : "admin";
      const next = { ...updated, accountType: account?.accountType };
      if (storageKey === "admin") localStorage.setItem(storageKey, JSON.stringify(next));
      else sessionStorage.setItem(storageKey, JSON.stringify(next));
      setAccount(next);
      setName(next.username || next.name || "");
      setPhotoBase64("");
      setEditing(false);
      setNotice("Profile updated successfully.");
    } catch (saveError) {
      setError(saveError.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="My Profile" subtitle="View your account information">
        <div className="d-flex gap-2"><button type="button" className="btn btn-sm btn-primary" onClick={() => setEditing((value) => !value)}><i className="ti ti-edit me-1"></i>{editing ? "Cancel Edit" : "Edit Profile"}</button><Link to={backPath} className="btn btn-sm btn-outline-secondary"><i className="ti ti-arrow-left me-1"></i>Back</Link></div>
      </PageHeader>
      <div className="card">
        <div className="card-body p-4">
          {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
          {notice ? <div className="alert alert-success" role="alert">{notice}</div> : null}
          {editing ? <form onSubmit={handleSubmit} className="row g-3 mb-4">
            <div className="col-md-6"><label className="form-label" htmlFor="profileName">Name</label><input id="profileName" className="form-control" value={name} onChange={(event) => setName(event.target.value)} required /></div>
            <div className="col-md-6"><label className="form-label" htmlFor="profilePhoto">Profile photo</label><input id="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="form-control" onChange={(event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setPhotoBase64(reader.result); reader.readAsDataURL(file); }} /></div>
            <div className="col-12"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Update Profile"}</button></div>
          </form> : null}
          <div className="text-center mb-4"><img src={photo} alt={displayName} className="avatar avatar-xxl rounded-circle" /></div>
          <div className="row g-4">
            <div className="col-md-6"><small className="text-muted d-block">Name</small><strong>{displayName}</strong></div>
            <div className="col-md-6"><small className="text-muted d-block">Email address</small><strong>{email}</strong></div>
            <div className="col-md-6"><small className="text-muted d-block">Phone number</small><strong>{phone}</strong></div>
            <div className="col-md-6"><small className="text-muted d-block">Role</small><strong>{role}</strong></div>
            <div className="col-md-6"><small className="text-muted d-block">Joined on</small><strong>{joined}</strong></div>
          </div>
          {account?.accountType === "admin" ? <div className="border-top mt-4 pt-3"><Link to="/profile/live-dashboard" className="small text-secondary text-decoration-underline">Open workspace</Link></div> : null}
        </div>
      </div>
    </>
  );
}
