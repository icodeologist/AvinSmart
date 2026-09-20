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

const financeDataByPeriod = {
  month: { invested: 59142, retailSales: 84600, wholesaleSales: 74250, trend: "+35% vs last month", units: 200 },
  year: { invested: 760000, retailSales: 1078450, wholesaleSales: 952000, trend: "+18% vs last year", units: 2480 },
  all: { invested: 4300000, retailSales: 6142500, wholesaleSales: 5525000, trend: "Since launch", units: 13840 },
};

function formatFinanceMoney(value) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function financeCards(period, priceMode) {
  const data = financeDataByPeriod[period];
  const sales = priceMode === "retail" ? data.retailSales : data.wholesaleSales;
  const profit = sales - data.invested;
  const margin = Math.round((profit / sales) * 100);
  const priceLabel = priceMode === "retail" ? "Retail price" : "Wholesale price";
  return [
    { title: "Invested Capital", value: formatFinanceMoney(data.invested), eyebrow: "Bought price", detail: `${data.units.toLocaleString("en-IN")} products · actual stock cost`, trend: data.trend, trendClass: "finance-card__trend--warning", icon: "ti ti-package-import", accent: "expenses", progress: 100 },
    { title: "Sales Revenue", value: formatFinanceMoney(sales), eyebrow: `Sold at ${priceLabel.toLowerCase()}`, detail: `${priceLabel} revenue before returns`, trend: data.trend, trendClass: "finance-card__trend--positive", icon: "ti ti-cash-register", accent: "revenue", progress: Math.min(100, Math.round((sales / data.retailSales) * 100)) },
    { title: "Gross Profit", value: formatFinanceMoney(profit), eyebrow: `${priceLabel} − bought price`, detail: `${margin}% margin · ${formatFinanceMoney(profit)} earned`, trend: data.trend, trendClass: "finance-card__trend--positive", icon: "ti ti-chart-donut-4", accent: "profit", progress: margin },
  ];
}

export default function Dashboard() {
  const { day, dateTime } = useDashboardDateTime();
  const salesChartRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [financePeriod, setFinancePeriod] = useState("month");
  const [priceMode, setPriceMode] = useState("retail");
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

      <div className="finance-overview-heading">
        <div>
          <p className="finance-overview-heading__eyebrow">Business pulse</p>
          <h2>Investment to profit</h2>
          <p>Compare bought cost against your selected selling price.</p>
        </div>
        <div className="finance-overview-heading__controls">
          <div className="finance-overview-heading__control">
            <label htmlFor="financePeriod">View period</label>
            <select id="financePeriod" className="form-select form-select-sm" value={financePeriod} onChange={(event) => setFinancePeriod(event.target.value)}>
              <option value="month">This month</option>
              <option value="year">This year</option>
              <option value="all">All time</option>
            </select>
          </div>
          <div className="finance-price-tabs" role="tablist" aria-label="Selling price comparison">
            <button type="button" className={priceMode === "retail" ? "active" : ""} onClick={() => setPriceMode("retail")}>Retail</button>
            <button type="button" className={priceMode === "wholesale" ? "active" : ""} onClick={() => setPriceMode("wholesale")}>Wholesale</button>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {financeCards(financePeriod, priceMode).map((card) => (
          <div className="col-lg-4 col-12" key={card.title}>
            <article className={`finance-card finance-card--${card.accent}`}>
              <div className="finance-card__glow"></div>
              <div className="finance-card__topline">
                <span className="finance-card__icon"><i className={card.icon}></i></span>
                <span className="finance-card__period">{financePeriod === "all" ? "All time" : financePeriod === "year" ? "This year" : "This month"}</span>
              </div>
              <p className="finance-card__eyebrow">{card.eyebrow}</p>
              <div className="d-flex align-items-end justify-content-between gap-2">
                <div>
                  <h3 className="finance-card__value">{card.value}</h3>
                  <p className="finance-card__title">{card.title}</p>
                </div>
                <span className={`finance-card__trend ${card.trendClass}`}>{card.trend}</span>
              </div>
              <div className="finance-card__progress" aria-label={`${card.title} progress`}>
                <span style={{ width: `${card.progress}%` }}></span>
              </div>
              <div className="finance-card__footer">
                <span>{card.detail}</span>
                <i className="ti ti-arrow-up-right"></i>
              </div>
            </article>
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
