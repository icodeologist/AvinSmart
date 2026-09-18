import { useEffect, useRef, useState } from "react";
import PageHeader from "../components/layout/PageHeader.jsx";
import { fetchOutlets, createOutlet } from "../api/outletsApi.js";
import { outletStatusBadge } from "../ui/format.jsx";

function formatOutletDate(value) {
  if (!value) return <span className="text-muted">&mdash;</span>;
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function ManageOutlets() {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formValidated, setFormValidated] = useState(false);
  const [flash, setFlash] = useState(false);
  const addOutletRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchOutlets()
      .then((data) => {
        if (cancelled) return;
        setOutlets(data);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function scrollToForm() {
    addOutletRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function flashSuccess() {
    setFlash(true);
    setTimeout(() => setFlash(false), 3000);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      setFormValidated(true);
      return;
    }
    setFormValidated(false);

    const outlet = {
      name: form.outletName.value.trim(),
      location: form.outletLocation.value.trim(),
      contact_person: form.outletContact.value.trim(),
      phone: form.outletPhone.value.trim(),
      email: form.outletEmail.value.trim(),
      status: form.outletStatus.value,
    };

    try {
      const { created } = await createOutlet(outlet);
      setOutlets((prev) => [created, ...prev]);
      form.reset();
      setError("");
      flashSuccess();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <>
      <PageHeader title="Manage Outlets" subtitle="View and manage your branches and outlets">
        <button className="btn btn-primary" onClick={scrollToForm}>
          <i className="ti ti-plus"></i> Add Outlet
        </button>
      </PageHeader>

      {error ? (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="ti ti-alert-triangle me-2"></i><span>{error}</span>
        </div>
      ) : null}

      <div className="row g-3 mb-3">
        <div className="col-12">
          <div className="card" id="addOutlet" ref={addOutletRef}>
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                <div>
                  <h3 className="h5 mb-0">Add New Outlet</h3>
                  <p className="mb-0 small text-muted">Register a new branch or outlet</p>
                </div>
              </div>
              {flash ? (
                <div id="outletSuccess" className="alert alert-success py-2" role="alert">
                  <i className="ti ti-circle-check me-1"></i> Outlet added successfully!
                </div>
              ) : null}
              <form id="addOutletForm" noValidate className={formValidated ? "was-validated" : ""} onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="outletName" className="form-label">Outlet Name</label>
                    <input type="text" className="form-control" id="outletName" name="outletName" placeholder="e.g. Downtown Branch" required />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="outletLocation" className="form-label">Location</label>
                    <input type="text" className="form-control" id="outletLocation" name="outletLocation" placeholder="Street address, city, state" required />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="outletContact" className="form-label">Contact Person</label>
                    <input type="text" className="form-control" id="outletContact" name="outletContact" placeholder="e.g. Maria Gonzalez" required />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="outletPhone" className="form-label">Phone</label>
                    <input type="tel" className="form-control" id="outletPhone" name="outletPhone" placeholder="e.g. +1 (512) 555-0134" required />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="outletEmail" className="form-label">Email</label>
                    <input type="email" className="form-control" id="outletEmail" name="outletEmail" placeholder="e.g. manager@avinsmart.com" required />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="outletStatus" className="form-label">Status</label>
                    <select className="form-select" id="outletStatus" name="outletStatus" required>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="locked">Locked</option>
                    </select>
                  </div>
                </div>
                <div className="d-flex gap-2 mt-4">
                  <button type="submit" className="btn btn-primary">Add Outlet</button>
                  <button type="reset" className="btn btn-secondary">Clear</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center bg-transparent px-4 py-3">
              <h3 className="h5 mb-0">Registered Outlets</h3>
              <span className="small text-muted">Showing all branches &amp; outlets</span>
            </div>
            <div className="table-responsive">
              <table className="table mb-0 text-nowrap table-hover">
                <thead className="table-light border-light">
                  <tr>
                    <th>Outlet</th>
                    <th>Location</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Added On</th>
                    <th>Locked Since</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="outletsTableBody">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-secondary">Loading outlets...</td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-danger">{error}</td>
                    </tr>
                  ) : !outlets.length ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-secondary">No outlets found.</td>
                    </tr>
                  ) : (
                    outlets.map((outlet) => (
                      <tr className="align-middle" key={`${outlet.name}-${outlet.addedOn}`}>
                        <td>
                          <a href="#" className="d-flex align-items-center gap-2 text-decoration-none text-reset">
                            <span className="icon-shape icon-sm bg-primary bg-opacity-10 text-primary rounded-2">
                              <i className="ti ti-building-store"></i>
                            </span>
                            <span className="fw-semibold">{outlet.name}</span>
                          </a>
                        </td>
                        <td>{outlet.location}</td>
                        <td>
                          <p className="mb-0">{outlet.contact}</p>
                          <small className="text-muted">{outlet.phone} &middot; {outlet.email}</small>
                        </td>
                        <td>{outletStatusBadge(outlet.status)}</td>
                        <td>{formatOutletDate(outlet.addedOn)}</td>
                        <td>{formatOutletDate(outlet.lockedSince)}</td>
                        <td>
                          <a href="#" title="Edit"><i className="ti ti-edit"></i></a>
                          <a href="#" className="link-danger ms-2" title="Delete"><i className="ti ti-trash"></i></a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}