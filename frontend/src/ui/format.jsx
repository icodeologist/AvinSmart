const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatCurrency(value) {
  return currency.format(value);
}

export function formatDate(value) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function capitalize(value) {
  if (!value) return "";
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

export function outletStatusBadge(status) {
  if (status === "active") {
    return <span className="badge bg-success-subtle text-success border border-success">Active</span>;
  }
  if (status === "locked") {
    return (
      <span className="badge bg-warning-subtle text-warning border border-warning">
        <i className="ti ti-lock me-1"></i>Locked
      </span>
    );
  }
  return <span className="badge bg-secondary-subtle text-secondary border border-secondary">Inactive</span>;
}

export function staffStatusBadge(status) {
  if (status === "active") {
    return (
      <span className="badge bg-success-subtle text-success border border-success">Active</span>
    );
  }
  if (status === "locked") {
    return (
      <span className="badge bg-warning-subtle text-warning border border-warning">
        <i className="ti ti-lock me-1"></i>Locked
      </span>
    );
  }
  return (
    <span className="badge bg-secondary-subtle text-secondary border border-secondary">Inactive</span>
  );
}

export function salaryStatusBadge(status) {
  if (status === "paid") {
    return (
      <span className="badge bg-success-subtle text-success border border-success-subtle">
        <i className="ti ti-circle-check me-1"></i>Paid
      </span>
    );
  }
  return (
    <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
      <i className="ti ti-clock me-1"></i>Pending
    </span>
  );
}
