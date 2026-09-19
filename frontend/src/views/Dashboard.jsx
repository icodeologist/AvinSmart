import { useEffect, useMemo, useRef, useState } from "react";
import ApexCharts from "apexcharts";
import PageHeader from "../components/layout/PageHeader.jsx";
import DairyInventory from "../components/dairy/DairyInventory.jsx";
import { salesPurchaseOptions } from "../charts/charts.js";
import { fetchProducts, productImagePath } from "../api/productsApi.js";

const LOW_STOCK_THRESHOLD = 10;

function useDashboardDateTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const day = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);
  const date = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  return { day, dateTime: `${date} ${time}` };
}

function useChart(targetRef, options) {
  useEffect(() => {
    if (!targetRef.current) return;
    const chart = new ApexCharts(targetRef.current, options);
    chart.render();
    return () => chart.destroy();
  }, [targetRef, options]);
}

const statCards = [
  { title: "Total Sales", value: "$25,000", trend: "+5% since last month", color: "primary", icon: "ti ti-report-analytics" },
  { title: "Total Purchase", value: "$18,000", trend: "+22% since last month", color: "success", icon: "ti ti-repeat" },
  { title: "Total Expenses", value: "$9,000", trend: "+10% since last month", color: "info", icon: "ti ti-currency-dollar" },
  { title: "Invoice Due", value: "$25,000", trend: "+35% since last month", color: "warning", icon: "ti ti-notes" },
];

function StatCard({ card }) {
  return (
    <div className="col-lg-3 col-12">
      <div className={`card p-4 bg-${card.color} bg-opacity-10 border border-${card.color} border-opacity-25 rounded-2`}>
        <div className="d-flex gap-3">
          <div className={`icon-shape icon-md bg-${card.color} text-white rounded-2`}>
            <i className={`${card.icon} fs-4`}></i>
          </div>
          <div>
            <h2 className="mb-3 fs-6">{card.title}</h2>
            <h3 className="fw-bold mb-0">{card.value}</h3>
            <p className={`text-${card.color} mb-0 small`}>{card.trend}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const profitCards = [
  { title: "Total Profit", value: "$25,458", trend: "+35% vs Last Month", trendClass: "text-success", icon: "ti ti-layers-subtract", iconClass: "text-primary" },
  { title: "Total Payment Returns", value: "$45,458", trend: "-20% vs Last Month", trendClass: "text-danger", icon: "ti ti-credit-card", iconClass: "text-danger" },
  { title: "Total Expenses", value: "$34,458", trend: "-20% vs Last Month", trendClass: "text-warning", icon: "ti ti-cash-banknote", iconClass: "text-warning" },
];

export default function Dashboard() {
  const { day, dateTime } = useDashboardDateTime();
  const salesChartRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((data) => {
        if (cancelled) return;
        setProducts(data);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const lowStock = useMemo(
    () =>
      products
        .filter((product) => Number(product.quantity) <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => Number(a.quantity) - Number(b.quantity))
        .slice(0, 5),
    [products]
  );

  useChart(salesChartRef, salesPurchaseOptions());

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your main content goes here…">
        <div className="date-time-box border rounded-2 bg-white px-4 py-3 text-md-end shadow-sm">
          <p id="dashboardDay" className="mb-0 fw-semibold text-dark fs-5">{day}</p>
          <p id="dashboardDateTime" className="mb-0 text-secondary small fw-bold">{dateTime}</p>
        </div>
      </PageHeader>

      <div className="row g-3 mb-3">
        {statCards.map((card) => <StatCard key={card.title} card={card} />)}
      </div>

      <div className="row g-3 mb-3">
        {statCards.map((card) => <StatCard key={`duplicate-${card.title}`} card={card} />)}
      </div>

      <div className="row g-3 mb-3">
        {profitCards.map((card) => (
          <div className="col-lg-4 col-12" key={card.title}>
            <div className="card">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between border-bottom pb-5 mb-3">
                  <div>
                    <h3 className="fw-bold h4">{card.value}</h3>
                    <span>{card.title}</span>
                  </div>
                  <div>
                    <i className={`${card.icon} fs-1 ${card.iconClass}`}></i>
                  </div>
                </div>
                <div className="d-flex justify-content-between align-items-center small">
                  <div className="text-muted"><span className={card.trendClass}>{card.trend}</span> vs Last Month</div>
                  <div><a href="#" className="link-primary text-decoration-underline">View</a></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center bg-transparent px-4 py-3">
              <h3 className="h5 mb-0">Sales vs Purchase</h3>
              <div>
                <select className="form-select form-select-sm">
                  <option selected>This Year</option>
                  <option>This Month</option>
                  <option>This Week</option>
                </select>
              </div>
            </div>
            <div className="card-body p-4">
              <div id="salesPurchaseChart" ref={salesChartRef}></div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <DairyInventory />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center px-4 py-3">
              <h4 className="mb-0 h5">Top Selling Products</h4>
              <button className="btn btn-sm btn-outline-secondary">
                <i className="ti ti-calendar"></i> Today
              </button>
            </div>
            <ul className="list-group list-group-flush">
              <li className="list-group-item"><p className="text-center py-4 text-secondary mb-0">No sales data yet.</p></li>
            </ul>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center px-4 py-3">
              <div className="d-flex align-items-center">
                <h4 className="mb-0 h5">Low Stock Products</h4>
              </div>
              <a href="#" className="small text-primary text-decoration-underline">View All</a>
            </div>
            <ul className="list-group list-group-flush">
              {loading ? (
                <li className="list-group-item"><p className="text-center py-4 text-secondary mb-0">Loading products...</p></li>
              ) : error ? (
                <li className="list-group-item"><p className="text-center py-4 text-danger mb-0">{error}</p></li>
              ) : lowStock.length ? lowStock.map((product) => (
                <li className="list-group-item d-flex align-items-center gap-3" key={product.id || product.sku_id}>
                  <img src={productImagePath(product)} className="rounded" width="48" height="48" style={{ objectFit: "cover" }} alt="" onError={(event) => { event.currentTarget.src = "/assets/images/product-1.png"; }} />
                  <div className="flex-grow-1">
                    <p className="mb-1">{product.title}</p>
                    <small>ID: {product.sku_id}</small>
                  </div>
                  <div className="d-flex flex-column gap-0 align-items-center">
                    <span className="fw-semibold text-primary">{String(product.quantity).padStart(2, "0")}</span>
                    <small className="text-muted">In Stock</small>
                  </div>
                </li>
              )) : (
                <li className="list-group-item"><p className="text-center py-4 text-secondary mb-0">No low stock products.</p></li>
              )}
            </ul>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center px-4 py-3">
              <h4 className="mb-0 h5">Recent Sales</h4>
              <button className="btn btn-sm btn-outline-secondary">
                <i className="ti ti-calendar-event"></i> Weekly
              </button>
            </div>
            <ul className="list-group list-group-flush">
              <li className="list-group-item"><p className="text-center py-4 text-secondary mb-0">No sales data yet.</p></li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}