import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createStaff } from "../api/staffApi.js";

export default function StaffRegistrationForm() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    const staff = {
      name: event.currentTarget.staffName.value.trim(),
      email: event.currentTarget.staffEmail.value.trim(),
      phone: event.currentTarget.staffPhone.value.trim(),
      role: event.currentTarget.staffRole.value,
      password: event.currentTarget.staffPassword.value,
    };

    setSubmitting(true);
    setError("");
    try {
      await createStaff(staff);
      navigate("/", { state: { registered: staff.name } });
    } catch (submissionError) {
      setError(submissionError.message || "Could not register staff.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <div className="card-body p-4">
        <h3 className="h5 mb-0">Add New Staff Member</h3>
        <p className="mb-0 small text-muted">Register a new staff member</p>
        {error ? <div className="alert alert-danger py-2 mt-3" role="alert">{error}</div> : null}
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="staffName" className="form-label">Full Name</label>
              <input type="text" className="form-control" id="staffName" placeholder="e.g. John Doe" required />
            </div>
            <div className="col-md-6">
              <label htmlFor="staffEmail" className="form-label">Email</label>
              <input type="email" className="form-control" id="staffEmail" placeholder="e.g. john@avinsmart.com" required />
            </div>
            <div className="col-md-6">
              <label htmlFor="staffPhone" className="form-label">Phone</label>
              <input type="tel" className="form-control" id="staffPhone" placeholder="e.g. +1 (512) 555-0134" required />
            </div>
            <div className="col-md-6">
              <label htmlFor="staffRole" className="form-label">Role</label>
              <select className="form-select" id="staffRole" required>
                <option value="">Select role</option>
                <option value="manager">Manager</option>
                <option value="sales">Sales</option>
                <option value="inventory">Inventory</option>
                <option value="support">Support</option>
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="staffPassword" className="form-label">Temporary password</label>
              <input type="password" className="form-control" id="staffPassword" minLength="8" required />
            </div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <i className="ti ti-plus me-1"></i>
              {submitting ? "Registering..." : "Register Staff"}
            </button>
            <button type="reset" className="btn btn-secondary">Clear</button>
          </div>
        </form>
      </div>
    </div>
  );
}
