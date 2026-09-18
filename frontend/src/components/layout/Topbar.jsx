import { Link } from "react-router-dom";

export default function Topbar({ onToggle, onMobileOpen }) {
  return (
    <nav id="topbar" className="navbar bg-white border-bottom fixed-top topbar px-3">
      <button id="toggleBtn" className="d-none d-lg-inline-flex btn btn-light btn-icon btn-sm" aria-label="Toggle sidebar" onClick={onToggle}>
        <i className="ti ti-layout-sidebar-left-expand"></i>
      </button>

      <button id="mobileBtn" className="btn btn-light btn-icon btn-sm d-lg-none me-2" aria-label="Open sidebar" onClick={onMobileOpen}>
        <i className="ti ti-layout-sidebar-left-expand"></i>
      </button>

      <div className="ms-auto d-flex align-items-center gap-3">
        <a className="position-relative btn-icon btn-sm btn-light btn rounded-circle" href="#" role="button" aria-label="Notifications">
          <i className="ti ti-bell"></i>
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger mt-2 ms-n2">
            2
            <span className="visually-hidden">unread messages</span>
          </span>
        </a>
        <Link to="/profile" className="d-flex align-items-center gap-2 text-decoration-none" aria-label="Open admin profile"><span className="d-none d-md-block text-end"><strong className="d-block small text-dark">Avin Gowda</strong><small className="text-muted">Administrator</small></span><img src="/assets/images/avatar/avatar-1.jpg" alt="Avin Gowda" className="avatar avatar-sm rounded-circle" /></Link>
      </div>
    </nav>
  );
}
