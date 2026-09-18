import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";

const admin = {
  name: "Avin Gowda",
  email: "avingowda@gmail.com",
  phone: "6363120048",
  role: "Administrator",
  outlet: "Main Branch",
  status: "Active",
  joined: "18 September 2025",
  lastLogin: "Today, 10:24 AM",
};

export default function AdminProfile() {
  return <>
    <PageHeader title="My Profile" subtitle="View your admin account information">
      <Link to="/" className="btn btn-sm btn-outline-secondary"><i className="ti ti-arrow-left me-1"></i>Back to Dashboard</Link>
    </PageHeader>
    <div className="row g-3">
      <div className="col-lg-4"><div className="card h-100"><div className="card-body text-center p-4"><img src="/assets/images/avatar/avatar-1.jpg" alt={admin.name} className="avatar avatar-xl rounded-circle mb-3" /><h2 className="h4 mb-1">{admin.name}</h2><p className="text-muted mb-3">{admin.role}</p><span className="badge text-bg-success px-3 py-2"><i className="ti ti-circle-check me-1"></i>{admin.status}</span><hr /><p className="small text-muted mb-0">Last login</p><strong>{admin.lastLogin}</strong></div></div></div>
      <div className="col-lg-8"><div className="card h-100"><div className="card-header bg-white px-4 py-3"><h2 className="h5 mb-0">Account information</h2></div><div className="card-body p-4"><div className="row g-4"><div className="col-md-6"><small className="text-muted d-block">Full name</small><strong>{admin.name}</strong></div><div className="col-md-6"><small className="text-muted d-block">Email address</small><strong>{admin.email}</strong></div><div className="col-md-6"><small className="text-muted d-block">Phone number</small><strong>{admin.phone}</strong></div><div className="col-md-6"><small className="text-muted d-block">Role</small><strong>{admin.role}</strong></div><div className="col-md-6"><small className="text-muted d-block">Assigned outlet</small><strong>{admin.outlet}</strong></div><div className="col-md-6"><small className="text-muted d-block">Joined on</small><strong>{admin.joined}</strong></div></div></div></div></div>
    </div>
  </>;
}
