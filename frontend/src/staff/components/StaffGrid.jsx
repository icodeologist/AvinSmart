import StaffCard from "./StaffCard.jsx";
import EmptyState from "./EmptyState.jsx";
import LoadingState from "./LoadingState.jsx";

export default function StaffGrid({ staff, loading }) {
  if (loading) {
    return <LoadingState text="Loading staff..." />;
  }

  if (!staff.length) {
    return <EmptyState text="No staff found." />;
  }

  return (
    <div className="staff-grid">
      {staff.map((member, index) => (
        <StaffCard key={member.id || `${member.name}-${index}`} member={member} />
      ))}
    </div>
  );
}