import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAdminToken } from "../../api/config.js";
import { API_BASE_URL } from "../../api/config.js";
import { fetchNotifications, fetchUnreadCount, markAllNotificationsRead, markNotificationRead } from "../../api/notificationsApi.js";

function currentAccount() {
  try {
    const staff = JSON.parse(sessionStorage.getItem("avinSmartPosStaff") || "null");
    if (staff) return { ...staff, accountType: "staff" };
    const admin = JSON.parse(localStorage.getItem("admin") || "null");
    return admin ? { ...admin, accountType: "admin" } : null;
  } catch {
    return null;
  }
}

function photoPath(photo) {
  if (!photo) return "/assets/images/avatar/avatar-1.jpg";
  if (photo.startsWith("http") || photo.startsWith("data:")) return photo;
  if (photo.startsWith("/static/")) return new URL(API_BASE_URL, window.location.origin).origin + photo;
  return photo;
}

export default function Topbar({ onToggle, onMobileOpen }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const account = currentAccount();
  const accountName = account?.username || account?.name || account?.email || "Account";
  const accountRole = account?.accountType === "admin" ? "Administrator" : account?.role === "inventory_staff" ? "Inventory Staff" : "Sales Staff";
  const accountPhoto = photoPath(account?.photo);

  async function refresh() {
    if (!getAdminToken()) return;
    try { setUnread(await fetchUnreadCount()); if (open) setItems(await fetchNotifications(5)); } catch { /* dashboard remains usable if notifications are unavailable */ }
  }

  useEffect(() => { refresh(); const timer = setInterval(refresh, 60000); return () => clearInterval(timer); }, [open]);

  async function toggleNotifications() {
    const next = !open;
    setOpen(next);
    if (next) { try { setItems(await fetchNotifications(5)); } catch { setItems([]); } }
  }

  async function read(item) {
    if (!item.read_at) { await markNotificationRead(item.id); setUnread((count) => Math.max(0, count - 1)); }
    setOpen(false);
    navigate(item.action_url || "/notifications");
  }

  async function readAll() {
    await markAllNotificationsRead();
    setUnread(0);
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
  }

  return (
    <nav id="topbar" className="navbar bg-white border-bottom fixed-top topbar px-3">
      <button id="toggleBtn" className="d-none d-lg-inline-flex btn btn-light btn-icon btn-sm" aria-label="Toggle sidebar" onClick={onToggle}>
        <i className="ti ti-layout-sidebar-left-expand"></i>
      </button>

      <button id="mobileBtn" className="btn btn-light btn-icon btn-sm d-lg-none me-2" aria-label="Open sidebar" onClick={onMobileOpen}>
        <i className="ti ti-layout-sidebar-left-expand"></i>
      </button>

      <div className="ms-auto d-flex align-items-center gap-3">
        <button className="position-relative btn-icon btn-sm btn-light btn rounded-circle" type="button" aria-label="Notifications" onClick={toggleNotifications}>
          <i className="ti ti-bell"></i>
          {unread > 0 ? <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger mt-2 ms-n2">
            {unread > 99 ? "99+" : unread}
            <span className="visually-hidden">unread messages</span>
          </span> : null}
        </button>
        {open ? <div className="dropdown-menu show p-0 shadow" style={{ right: 0, left: "auto", top: "calc(100% + 8px)", width: "min(360px, 90vw)" }}>
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom"><strong>Notifications</strong><button className="btn btn-link btn-sm p-0" type="button" onClick={readAll} disabled={!unread}>Mark all read</button></div>
          {items.length ? items.map((item) => <button key={item.id} type="button" className={`dropdown-item text-wrap p-3 border-bottom ${item.read_at ? "" : "bg-primary-subtle"}`} onClick={() => read(item)}><strong className="d-block">{item.title}</strong><span className="badge text-bg-light text-capitalize my-1">{item.type || "general"}</span><small className="text-muted d-block">{item.message}</small></button>) : <div className="p-3 text-muted small">No notifications yet.</div>}
          <Link to="/notifications" className="d-block text-center p-2 small" onClick={() => setOpen(false)}>View all notifications</Link>
        </div> : null}
        <Link to="/profile" className="d-flex align-items-center gap-2 text-decoration-none" aria-label="Open profile"><span className="d-none d-md-block text-end"><strong className="d-block small text-dark">{accountName}</strong><small className="text-muted">{accountRole}</small></span><img src={accountPhoto} alt={accountName} className="avatar avatar-sm rounded-circle" /></Link>
      </div>
    </nav>
  );
}
