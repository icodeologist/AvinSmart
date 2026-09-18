import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import StaffGrid from "../components/StaffGrid.jsx";
import { fetchStaff } from "../api/staffApi.js";

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [registeredName, setRegisteredName] = useState(location.state?.registered || "");

  useEffect(() => {
    let cancelled = false;
    fetchStaff().then((data) => {
      if (cancelled) return;
      setStaff(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeader title="Manage Staff" subtitle="View your staff members">
        <Link to="/salaries" className="btn btn-primary">
          <i className="ti ti-wallet me-1"></i>View Staff Salaries
        </Link>
        <Link to="/register" className="btn btn-outline-primary">
          <i className="ti ti-user-plus me-1"></i>Register New Staff
        </Link>
      </PageHeader>

      {registeredName ? (
        <div className="alert alert-success d-flex justify-content-between align-items-center mb-4" role="alert">
          <span><i className="ti ti-circle-check me-2"></i><strong>{registeredName}</strong> was registered successfully.</span>
          <button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setRegisteredName("")}></button>
        </div>
      ) : null}

      <div className="row g-4">
        <div className="col-12">
          <StaffGrid staff={staff} loading={loading} />
        </div>
      </div>
    </>
  );
}