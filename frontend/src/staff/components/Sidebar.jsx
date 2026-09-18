import { Link } from "react-router-dom";

export default function Sidebar({ collapsed, mobileOpen }) {
  const className = `sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-show" : ""}`;

  return (
    <aside id="sidebar" className={className}>
      <div className="logo-area">
        <a href="/index.html" className="d-inline-flex"><img src="/assets/images/logo-icon.svg" alt="" width="24" />
          <span className="logo-text ms-2"><img src="/assets/images/logo.svg" alt="" /></span>
        </a>
      </div>

      <ul className="nav flex-column">
        <li className="px-4 py-2"><small className="nav-text">Main</small></li>
        <li><a className="nav-link" href="/index.html"><i className="ti ti-home"></i><span className="nav-text">Dashboard</span></a></li>
        <li><a className="nav-link" href="/inventory.html"><i className="ti ti-box-seam"></i><span className="nav-text">Inventory</span></a></li>
        <li><a className="nav-link" href="/create-product.html"><i className="ti ti-plus"></i><span className="nav-text">Add Product</span></a></li>
        <li><a className="nav-link" href="/add-category.html"><i className="ti ti-category-plus"></i><span className="nav-text">Add Category</span></a></li>
        <li><a className="nav-link" href="/manage-outlets.html"><i className="ti ti-building-store"></i><span className="nav-text">Manage Outlets</span></a></li>
        <li>
          <Link className="nav-link active" to="/"><i className="ti ti-users"></i><span className="nav-text">Manage Staff</span></Link>
        </li>
        <li><a className="nav-link" href="/reports.html"><i className="ti ti-receipt"></i><span className="nav-text">Reports</span></a></li>
        <li><a className="nav-link" href="/404-error.html"><i className="ti ti-alert-circle"></i><span className="nav-text">404 Error</span></a></li>
        <li><a className="nav-link" href="/docs.html"><i className="ti ti-file-text"></i><span className="nav-text">Docs</span></a></li>

        <li className="px-4 pt-4 pb-2"><small className="nav-text">Account</small></li>
        <li><a className="nav-link" href="/signin.html"><i className="ti ti-logout"></i><span className="nav-text">Log in</span></a></li>
        <li><a className="nav-link" href="/signup.html"><i className="ti ti-user-plus"></i><span className="nav-text">Sign up</span></a></li>
      </ul>
    </aside>
  );
}