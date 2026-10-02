import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import { fetchOutlets } from "../api/outletsApi.js";
import { outletStatusBadge } from "../ui/format.jsx";

function formatOutletDate(value) {
  if (!value) return <span className="text-muted">&mdash;</span>;
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function ManageOutlets() {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <>
      <PageHeader title="Manage Outlets" subtitle="View and manage your branches and outlets">
        <Link to="/outlets/categories/add" className="btn btn-outline-primary">
          <i className="ti ti-category-plus"></i> Add Category
        </Link>
        <Link to="/outlets/add" className="btn btn-primary">
          <i className="ti ti-plus"></i> Add Outlet
        </Link>
      </PageHeader>

      {error ? (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="ti ti-alert-triangle me-2"></i><span>{error}</span>
        </div>
      ) : null}

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
                          <Link to={`/outlets/${outlet.id}`} className="d-flex align-items-center gap-2 text-decoration-none text-reset">
                            <span className="icon-shape icon-sm bg-primary bg-opacity-10 text-primary rounded-2">
                              <i className="ti ti-building-store"></i>
                            </span>
                            <span className="fw-semibold">{outlet.name}</span>
                          </Link>
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
                          <Link to={`/outlets/${outlet.id}`} className="btn btn-sm btn-outline-primary">Select Outlet</Link>
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
