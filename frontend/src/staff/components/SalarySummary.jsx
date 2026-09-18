import { formatCurrency } from "../ui/format.jsx";

export default function SalarySummary({ summary }) {
  return (
    <section className="salary-summary mb-4" aria-label="Payroll summary">
      <article className="salary-summary__card">
        <span className="salary-summary__icon text-primary bg-primary-subtle"><i className="ti ti-cash"></i></span>
        <div>
          <p>Total monthly payroll</p>
          <strong>{formatCurrency(summary.total)}</strong>
        </div>
      </article>
      <article className="salary-summary__card">
        <span className="salary-summary__icon text-success bg-success-subtle"><i className="ti ti-circle-check"></i></span>
        <div>
          <p>Paid this month</p>
          <strong>{formatCurrency(summary.paid)}</strong>
        </div>
      </article>
      <article className="salary-summary__card">
        <span className="salary-summary__icon text-warning bg-warning-subtle"><i className="ti ti-clock"></i></span>
        <div>
          <p>Pending payments</p>
          <strong>{formatCurrency(summary.pending)}</strong>
        </div>
      </article>
      <article className="salary-summary__card">
        <span className="salary-summary__icon text-info bg-info-subtle"><i className="ti ti-calendar-event"></i></span>
        <div>
          <p>Next payroll date</p>
          <strong>{summary.nextPayrollDate}</strong>
        </div>
      </article>
    </section>
  );
}