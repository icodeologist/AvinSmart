import EmptyState from "./EmptyState.jsx";
import { formatCurrency, formatDate, salaryStatusBadge } from "../ui/format.jsx";

export default function SalaryTable({ records, onMarkPaid }) {
  if (!records.length) {
    return <EmptyState text="No salary records match your filters." />;
  }

  return (
    <div className="table-responsive">
      <table className="table align-middle mb-0 salary-table">
        <thead className="table-light">
          <tr>
            <th>Staff member</th>
            <th>Role</th>
            <th>Monthly salary</th>
            <th>Last paid</th>
            <th>Status</th>
            <th><span className="visually-hidden">Action</span></th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>
                <div className="d-flex align-items-center gap-2">
                  <span className="icon-shape icon-sm bg-primary bg-opacity-10 text-primary rounded-2"><i className="ti ti-user"></i></span>
                  <div>
                    <div className="fw-semibold">{record.name}</div>
                    <small className="text-muted">{record.email}</small>
                  </div>
                </div>
              </td>
              <td>{record.role}</td>
              <td className="fw-semibold">{formatCurrency(record.salary)}</td>
              <td>{formatDate(record.lastPaid)}</td>
              <td>{salaryStatusBadge(record.status)}</td>
              <td className="text-end">
                {record.status === "pending" ? (
                  <button type="button" className="btn btn-sm btn-outline-success mark-paid" onClick={() => onMarkPaid(record)}>
                    <i className="ti ti-check me-1"></i>Mark paid
                  </button>
                ) : (
                  <span className="text-muted small">Up to date</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}