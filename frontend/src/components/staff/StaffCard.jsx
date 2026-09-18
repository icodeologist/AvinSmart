import { staffStatusBadge, formatDate } from "../../ui/format.jsx";

export default function StaffCard({ member }) {
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
    </article>
  );
}