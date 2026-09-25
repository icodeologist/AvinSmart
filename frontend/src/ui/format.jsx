export function formatCurrency(value, currencyCode = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `${currencyCode} ${Number(value || 0).toFixed(2)}`;
  }
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
