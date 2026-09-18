import StaffCard from "./StaffCard.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import LoadingState from "../ui/LoadingState.jsx";

export default function StaffGrid({ staff, loading, onView, onEdit, onResetPassword }) {
  if (loading) {
    return <LoadingState text="Loading staff..." />;
  }

  if (!staff.length) {
    return <EmptyState text="No staff found." />;
  }

  return (
    <div className="staff-grid">
      {staff.map((member, index) => (
        <StaffCard key={member.id || `${member.name}-${index}`} member={member} onView={onView} onEdit={onEdit} onResetPassword={onResetPassword} />
      ))}
    </div>
  );
}
