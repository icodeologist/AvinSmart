import PageHeader from "../components/layout/PageHeader.jsx";

export default function Reports() {
  return (
    <>
      <PageHeader title="Reports" subtitle="View sales and inventory analytics" />
      <div className="card">
        <div className="card-body text-center py-5">
          <i className="ti ti-chart-line fs-1 text-muted"></i>
          <h2 className="h5 mt-3">No report data available</h2>
          <p className="text-muted mb-0">Reports will appear here after sales and inventory activity is recorded.</p>
        </div>
      </div>
    </>
  );
}
