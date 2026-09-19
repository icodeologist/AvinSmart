import { Link, NavLink } from "react-router-dom";

const mainLinks = [
  { to: "/", icon: "ti ti-home", label: "Dashboard", end: true },
  { to: "/inventory", icon: "ti ti-box-seam", label: "Inventory" },
  { to: "/products/create", icon: "ti ti-plus", label: "Add Product" },
  { to: "/categories/add", icon: "ti ti-category-plus", label: "Add Category" },
  { to: "/outlets", icon: "ti ti-building-store", label: "Manage Outlets" },
  { to: "/bills/create", icon: "ti ti-file-invoice", label: "Create Bill" },
  { to: "/pos/login", icon: "ti ti-device-desktop", label: "Staff POS" },
  { to: "/staff", icon: "ti ti-users", label: "Manage Staff" },
  { to: "/reports", icon: "ti ti-receipt", label: "Reports" },
  { to: "/cash-flow", icon: "ti ti-cash", label: "Cash Flow" },
  { to: "/404", icon: "ti ti-alert-circle", label: "404 Error" },
];

const accountLinks = [
  { to: "/profile", icon: "ti ti-user-circle", label: "My Profile" },
  { to: "/login", icon: "ti ti-logout", label: "Log in" },
  { to: "/signup", icon: "ti ti-user-plus", label: "Sign up" },
];

function navLinkClass(isActive) {
  return `nav-link${isActive ? " active" : ""}`;
}

export default function Sidebar({ collapsed, mobileOpen }) {
  const className = `sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-show" : ""}`;

  return (
    <aside id="sidebar" className={className}>
      <div className="logo-area">
        <Link to="/" className="avin-logo" aria-label="AvinSmart"><span className="avin-logo__avin"><span className="avin-logo__a">A</span>vin</span><span className="avin-logo__smart"><span className="avin-logo__s">S</span>mart</span></Link>
      </div>

      <ul className="nav flex-column">
        <li className="px-4 py-2"><small className="nav-text">Main</small></li>
        {mainLinks.map((link) => (
          <li key={link.to}>
            <NavLink end={link.end} className={({ isActive }) => navLinkClass(isActive)} to={link.to}>
              <i className={link.icon}></i><span className="nav-text">{link.label}</span>
            </NavLink>
          </li>
        ))}

        <li className="px-4 pt-4 pb-2"><small className="nav-text">Account</small></li>
        {accountLinks.map((link) => (
          <li key={link.to}>
            <NavLink className={({ isActive }) => navLinkClass(isActive)} to={link.to}>
              <i className={link.icon}></i><span className="nav-text">{link.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}
