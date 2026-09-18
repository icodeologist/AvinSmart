export default function EmptyState({ text = "No records found." }) {
  return <p className="text-center py-4 text-secondary mb-0">{text}</p>;
}