import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100">
      <div style={{ maxWidth: 500, width: "100%" }}>
        <div className="text-center">
          <div className="mb-4">
            <Link to="/" className="d-inline-block mb-4">
              <img src="/assets/images/logo-icon.svg" alt="" width="36" />
              <span className="ms-2"><img src="/assets/images/logo.svg" alt="" /></span>
            </Link>
          </div>

          <h1 className="display-1 fw-bold text-primary mb-2">404</h1>
          <h2 className="card-title h4 mb-3">Page Not Found</h2>
          <p className="text-muted mb-4">Sorry, the page you're looking for doesn't exist or has been moved.</p>

          <Link to="/" className="btn btn-primary">Go to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}