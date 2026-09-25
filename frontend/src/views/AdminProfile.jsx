import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";

function storedAdmin() {
  try { return JSON.parse(localStorage.getItem("admin") || "null"); } catch { return null; }
}

export default function AdminProfile() {
  const admin = storedAdmin();
  const name = admin?.username || admin?.name || "Account";
  const email = admin?.email || "Not available";
  const phone = admin?.phone_num || admin?.phone || "Not available";
  const joined = admin?.created_at ? new Date(admin.created_at).toLocaleDateString("en-IN") : "Not available";

  return (
    <>
      <PageHeader title="My Profile" subtitle="View your account information">
        <Link to="/" className="btn btn-sm btn-outline-secondary"><i className="ti ti-arrow-left me-1"></i>Back to Dashboard</Link>
      </PageHeader>
      <div className="card">
        <div className="card-body p-4">
          <div className="row g-4">
            <div className="col-md-6"><small className="text-muted d-block">Username</small><strong>{name}</strong></div>
            <div className="col-md-6"><small className="text-muted d-block">Email address</small><strong>{email}</strong></div>
            <div className="col-md-6"><small className="text-muted d-block">Phone number</small><strong>{phone}</strong></div>
            <div className="col-md-6"><small className="text-muted d-block">Role</small><strong>Administrator</strong></div>
            <div className="col-md-6"><small className="text-muted d-block">Joined on</small><strong>{joined}</strong></div>
          </div>
        </div>
      </div>
    </>
  );
}
