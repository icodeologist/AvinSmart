export default function LoadingState({ text = "Loading..." }) {
  return (
    <div className="text-center py-5 text-secondary d-flex flex-column align-items-center gap-2">
      <div className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></div>
      <p className="mb-0">{text}</p>
    </div>
  );
}