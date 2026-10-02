function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)
    : value || "—";
}

export default function SaleNotificationDetails({ notification, compact = false }) {
  if (notification.type !== "sale_completed") return null;

  const details = notification.metadata || {};
  const staff = details.staff_name || details.staff_email || "Unknown staff member";
  const customer = details.customer_name || "Not captured";

  if (compact) {
    return (
      <small className="d-block mt-2">
        <span className="d-block"><strong>Staff:</strong> {staff}</span>
        <span className="d-block"><strong>Customer:</strong> {customer}</span>
      </small>
    );
  }

  return (
    <div className="row g-2 small mt-2">
      <div className="col-md-4"><span className="text-muted d-block">Staff</span><strong>{staff}</strong>{details.staff_email && details.staff_email !== staff ? <span className="d-block text-muted">{details.staff_email}</span> : null}</div>
      <div className="col-md-4"><span className="text-muted d-block">Customer</span><strong>{customer}</strong></div>
      <div className="col-md-4"><span className="text-muted d-block">Order</span><strong>{details.order_number || `#${details.order_id || "—"}`}</strong></div>
      <div className="col-md-4"><span className="text-muted d-block">Outlet</span><strong>{details.outlet_name || "—"}</strong></div>
      <div className="col-md-4"><span className="text-muted d-block">Total</span><strong>{money(details.total)}</strong></div>
      <div className="col-md-4"><span className="text-muted d-block">Payment</span><strong className="text-capitalize">{details.payment_method || "—"}</strong></div>
    </div>
  );
}
