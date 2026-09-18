export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
      <div>
        <h1 className="fs-3 mb-1">{title}</h1>
        {subtitle ? <p className="mb-0">{subtitle}</p> : null}
      </div>
      {children ? <div className="d-flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}