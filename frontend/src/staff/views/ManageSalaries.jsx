import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import SalarySummary from "../components/SalarySummary.jsx";
import SalaryTable from "../components/SalaryTable.jsx";
import { fetchSalaryRecords, getSalarySummary, markSalaryPaid } from "../api/salaryApi.js";

export default function ManageSalaries() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let cancelled = false;
    fetchSalaryRecords().then((data) => {
      if (cancelled) return;
      setRecords(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => getSalarySummary(records), [records]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = `${record.name} ${record.email} ${record.role}`.toLowerCase().includes(query);
      const matchesStatus = status === "all" || record.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [records, search, status]);

  async function handleMarkPaid(record) {
    const updated = await markSalaryPaid(record);
    setRecords((prev) => prev.map((item) => (item.id === record.id ? updated : item)));
  }

  return (
    <>
      <PageHeader title="Manage Salaries" subtitle="Review monthly pay and payment status for your staff">
        <Link to="/" className="btn btn-secondary">
          <i className="ti ti-arrow-left me-1"></i>Back to Staff
        </Link>
      </PageHeader>

      <SalarySummary summary={summary} />

      <section className="card">
        <div className="card-header bg-transparent px-4 py-3">
          <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
            <div>
              <h2 className="h5 mb-1">Staff salary records</h2>
              <p className="small text-muted mb-0">Current monthly salary cycle</p>
            </div>
            <div className="d-flex flex-column flex-sm-row gap-2 salary-filters">
              <label className="visually-hidden" htmlFor="salarySearch">Search staff</label>
              <div className="input-group">
                <span className="input-group-text"><i className="ti ti-search"></i></span>
                <input
                  id="salarySearch"
                  type="search"
                  className="form-control"
                  placeholder="Search staff"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <label className="visually-hidden" htmlFor="salaryStatus">Filter by status</label>
              <select
                id="salaryStatus"
                className="form-select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
        {loading ? <div className="text-center py-5 text-secondary">Loading salary records...</div> : <SalaryTable records={filtered} onMarkPaid={handleMarkPaid} />}
      </section>
    </>
  );
}
