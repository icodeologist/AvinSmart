import { staffStatusBadge, formatDate } from "../../ui/format.jsx";

export default function StaffCard({ member, onView, onEdit, onResetPassword }) {
  return (
    <article className="staff-card">
      <div className="staff-card__header">
        <span className="staff-card__avatar" aria-hidden="true">
          <i className="ti ti-user"></i>
        </span>
        <div className="staff-card__identity">
          <h2 className="staff-card__name">{member.name}</h2>
          <p className="staff-card__email">{member.email}</p>
        </div>
        {staffStatusBadge(member.status)}
      </div>
      <dl className="staff-card__details">
        <div>
          <dt>Role</dt>
          <dd>{member.role}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{member.phone || "Not available"}</dd>
        </div>
        <div>
          <dt>Joined</dt>
          <dd>{formatDate(member.joinedOn)}</dd>
        </div>
      </dl>
      <div className="d-flex gap-2 mt-3 pt-3 border-top">
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onView(member)}><i className="ti ti-eye me-1"></i>View</button>
        <button type="button" className="btn btn-sm btn-primary flex-grow-1" onClick={() => onEdit(member)}><i className="ti ti-edit me-1"></i>Edit</button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onResetPassword(member)} title="Edit password"><i className="ti ti-key"></i></button>
      </div>
    </article>
  );
}
