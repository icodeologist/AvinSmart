import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createStaff } from "../../api/staffApi.js";
import { fetchOutlets } from "../../api/outletsApi.js";

export default function StaffRegistrationForm() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [outlets, setOutlets] = useState([]);
  const [outletError, setOutletError] = useState("");

  function readPhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error("A profile photo is required."));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read the profile photo."));
      reader.readAsDataURL(file);
    });
  }

  useEffect(() => {
    fetchOutlets().then(setOutlets).catch((loadError) => setOutletError(loadError.message));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    const staff = {
      name: form.staffName.value.trim(),
      email: form.staffEmail.value.trim(),
      phone: form.staffPhone.value.trim(),
      role: form.staffRole.value,
      password: form.staffPassword.value,
      outletIds: Array.from(form.staffOutlets.selectedOptions).map((option) => Number(option.value)),
    };

    setSubmitting(true);
    setError("");
    setFieldErrors({});
    try {
      staff.photoBase64 = await readPhoto(form.staffPhoto.files[0]);
      const member = await createStaff(staff);
      navigate("/staff", { state: { staff: member } });
    } catch (submissionError) {
      const fields = submissionError.fields;
      if (fields) {
        setFieldErrors(fields);
      }
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
              {fieldErrors.name ? <div className="invalid-feedback d-block">{fieldErrors.name}</div> : null}
            </div>
            <div className="col-md-6">
              <label htmlFor="staffEmail" className="form-label">Email</label>
              <input type="email" className="form-control" id="staffEmail" placeholder="e.g. john@avinsmart.com" required />
              {fieldErrors.email ? <div className="invalid-feedback d-block">{fieldErrors.email}</div> : null}
            </div>
            <div className="col-md-6">
              <label htmlFor="staffPhone" className="form-label">Phone</label>
              <input type="tel" className="form-control" id="staffPhone" placeholder="e.g. +1 (512) 555-0134" required />
              {fieldErrors.phone ? <div className="invalid-feedback d-block">{fieldErrors.phone}</div> : null}
            </div>
            <div className="col-md-6">
              <label htmlFor="staffPhoto" className="form-label">Profile photo</label>
              <input type="file" className="form-control" id="staffPhoto" accept="image/jpeg,image/png,image/webp,image/gif" required />
              <small className="text-muted">Upload a clear JPG, PNG, WEBP, or GIF image up to 10 MB.</small>
              {fieldErrors.photo ? <div className="invalid-feedback d-block">{fieldErrors.photo}</div> : null}
            </div>
            <div className="col-md-6">
              <label htmlFor="staffRole" className="form-label">Role</label>
              <select className="form-select" id="staffRole" required>
                <option value="">Select role</option>
                <option value="sales">Sales</option>
                <option value="inventory_staff">Inventory Staff</option>
              </select>
              {fieldErrors.role ? <div className="invalid-feedback d-block">{fieldErrors.role}</div> : null}
            </div>
            <div className="col-md-6">
              <label htmlFor="staffPassword" className="form-label">Temporary password</label>
              <input type="password" className="form-control" id="staffPassword" minLength="8" required />
              {fieldErrors.password ? <div className="invalid-feedback d-block">{fieldErrors.password}</div> : null}
            </div>
            <div className="col-md-6">
              <label htmlFor="staffOutlets" className="form-label">Assigned outlets</label>
              <select className="form-select" id="staffOutlets" name="staffOutlets" multiple size="4" required>
                {outlets.map((outlet) => <option value={outlet.id} key={outlet.id}>{outlet.name}</option>)}
              </select>
              <small className="text-muted">Select at least one branch this staff member may operate.</small>
              {outletError ? <div className="invalid-feedback d-block">{outletError}</div> : null}
              {fieldErrors.outlet_ids ? <div className="invalid-feedback d-block">{fieldErrors.outlet_ids}</div> : null}
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
