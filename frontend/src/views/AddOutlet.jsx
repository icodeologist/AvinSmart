import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import { createOutlet } from "../api/outletsApi.js";

export default function AddOutlet() {
  const navigate = useNavigate();
  const redirectTimer = useRef(null);
  const [validated, setValidated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      setValidated(true);
      return;
    }

    setValidated(false);
    setSubmitting(true);
    setError("");
    try {
      await createOutlet({
        name: form.outletName.value.trim(),
        location: form.outletLocation.value.trim(),
        contact_person: form.outletContact.value.trim(),
        phone: form.outletPhone.value.trim(),
        email: form.outletEmail.value.trim(),
        status: form.outletStatus.value,
      });
      setSuccess(true);
      form.reset();
      redirectTimer.current = setTimeout(() => navigate("/outlets"), 800);
    } catch (submitError) {
      setError(submitError.message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Add Outlet" subtitle="Register a new branch or outlet">
        <Link to="/outlets" className="btn btn-outline-secondary"><i className="ti ti-arrow-left"></i> Back to Outlets</Link>
      </PageHeader>

      {error ? <div className="alert alert-danger" role="alert"><i className="ti ti-alert-triangle me-2"></i>{error}</div> : null}
      {success ? <div className="alert alert-success" role="alert"><i className="ti ti-circle-check me-2"></i>Outlet added successfully. Returning to Manage Outlets...</div> : null}

      <div className="card">
        <div className="card-body p-4">
          <form id="addOutletForm" noValidate className={validated ? "was-validated" : ""} onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6"><label htmlFor="outletName" className="form-label">Outlet Name</label><input type="text" className="form-control" id="outletName" name="outletName" placeholder="e.g. Downtown Branch" required /></div>
              <div className="col-md-6"><label htmlFor="outletLocation" className="form-label">Location</label><input type="text" className="form-control" id="outletLocation" name="outletLocation" placeholder="Street address, city, state" required /></div>
              <div className="col-md-6"><label htmlFor="outletContact" className="form-label">Contact Person</label><input type="text" className="form-control" id="outletContact" name="outletContact" placeholder="e.g. Maria Gonzalez" required /></div>
              <div className="col-md-6"><label htmlFor="outletPhone" className="form-label">Phone</label><input type="tel" className="form-control" id="outletPhone" name="outletPhone" placeholder="e.g. +1 (512) 555-0134" required /></div>
              <div className="col-md-6"><label htmlFor="outletEmail" className="form-label">Email</label><input type="email" className="form-control" id="outletEmail" name="outletEmail" placeholder="e.g. manager@avinsmart.com" required /></div>
              <div className="col-md-6"><label htmlFor="outletStatus" className="form-label">Status</label><select className="form-select" id="outletStatus" name="outletStatus" defaultValue="active" required><option value="active">Active</option><option value="inactive">Inactive</option><option value="locked">Locked</option></select></div>
            </div>
            <div className="d-flex gap-2 mt-4">
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Adding Outlet..." : "Add Outlet"}</button>
              <button type="reset" className="btn btn-secondary" disabled={submitting}>Clear</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
