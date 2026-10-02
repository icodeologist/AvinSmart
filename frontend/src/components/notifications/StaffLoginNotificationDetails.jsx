function roleLabel(role) {
  return role === "inventory_staff" ? "Inventory Staff" : role === "sales" ? "Sales Staff" : role;
}

export default function StaffLoginNotificationDetails({ notification, compact = false }) {
  if (notification.type !== "staff_login") return null;

  const details = notification.metadata || {};
  const values = [
    details.staff_email,
    roleLabel(details.staff_role),
    details.outlet_name,
  ].filter(Boolean);

  if (!values.length) return null;

  return compact ? (
    <small className="text-muted d-block mt-1">{values.join(" · ")}</small>
  ) : (
    <div className="small mt-2">
      {details.staff_email ? <span className="me-3"><strong>Email:</strong> {details.staff_email}</span> : null}
      {details.staff_role ? <span className="me-3"><strong>Role:</strong> {roleLabel(details.staff_role)}</span> : null}
      {details.outlet_name ? <span><strong>Outlet:</strong> {details.outlet_name}</span> : null}
    </div>
  );
}
