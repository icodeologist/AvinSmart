import { Link } from "react-router-dom";

export default function Welcome() {
  return (
    <main className="container d-flex align-items-center justify-content-center min-vh-100 py-5">
      <div className="w-100" style={{ maxWidth: 760 }}>
        <div className="text-center mb-5">
          <div className="avin-logo d-inline-flex mb-4" aria-label="AvinSmart">
            <span className="avin-logo__avin"><span className="avin-logo__a">A</span>vin</span>
            <span className="avin-logo__smart"><span className="avin-logo__s">S</span>mart</span>
          </div>
          <h1 className="display-5 fw-bold mb-2">Welcome to AvinSmart</h1>
          <p className="lead text-muted mb-0">Choose how you want to continue.</p>
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body p-4 p-lg-5 d-flex flex-column">
                <span className="icon-shape icon-lg bg-primary bg-opacity-10 text-primary rounded-3 mb-4">
                  <i className="ti ti-device-desktop" />
                </span>
                <h2 className="h4">Staff POS</h2>
                <p className="text-muted flex-grow-1">Open the counter and start serving customers.</p>
                <Link to="/pos/login" className="btn btn-primary w-100">Login as Staff</Link>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body p-4 p-lg-5 d-flex flex-column">
                <span className="icon-shape icon-lg bg-success bg-opacity-10 text-success rounded-3 mb-4">
                  <i className="ti ti-layout-dashboard" />
                </span>
                <h2 className="h4">Admin Dashboard</h2>
                <p className="text-muted flex-grow-1">Manage outlets, products, staff, and business settings.</p>
                <Link to="/login" className="btn btn-outline-success w-100">Login as Admin</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
