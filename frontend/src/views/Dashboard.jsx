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
  { title: "Total Sales", value: "₹25,000", trend: "+5% since last month", color: "primary", icon: "ti ti-report-analytics" },
  { title: "Total Purchase", value: "₹18,000", trend: "+22% since last month", color: "success", icon: "ti ti-repeat" },
  { title: "Total Expenses", value: "₹9,000", trend: "+10% since last month", color: "info", icon: "ti ti-currency-dollar" },
  { title: "Invoice Due", value: "₹25,000", trend: "+35% since last month", color: "warning", icon: "ti ti-notes" },
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
  month: { invested: 60000, retailSales: 52000, wholesaleSales: 28000, trend: "+35% vs last month", retailUnits: 130, wholesaleUnits: 70 },
  year: { invested: 760000, retailSales: 690000, wholesaleSales: 388450, trend: "+18% vs last year", retailUnits: 1580, wholesaleUnits: 900 },
  all: { invested: 4300000, retailSales: 3900000, wholesaleSales: 2242500, trend: "Since launch", retailUnits: 8840, wholesaleUnits: 5000 },
};

function formatFinanceMoney(value) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function InvestmentSpeedometer({ period }) {
  const data = financeDataByPeriod[period];
  const sales = data.retailSales + data.wholesaleSales;
  const gain = sales - data.invested;
  const recovery = sales / data.invested;
  const score = Math.min(100, Math.max(0, recovery * 50));
  const angle = (180 - (score * 180) / 100) * (Math.PI / 180);
  const needleX = 130 + Math.cos(angle) * 88;
  const needleY = 140 - Math.sin(angle) * 88;
  const retailShare = Math.round((data.retailSales / sales) * 100);
  const gaining = gain >= 0;

  return (
    <article className="speedometer-card">
      <div className="speedometer-card__header">
        <div>
          <p className="speedometer-card__eyebrow">Investment return meter</p>
          <h3>How far has the money come back?</h3>
          <p>Break-even is at the middle. Crossing it means the business is gaining.</p>
        </div>
        <span className={`speedometer-card__status ${gaining ? "is-positive" : "is-negative"}`}>
          <i className={gaining ? "ti ti-trending-up" : "ti ti-trending-down"}></i>
          {gaining ? "Gaining" : "Recovering"}
        </span>
      </div>

      <div className="speedometer-card__body">
        <div className="speedometer-gauge">
          <svg viewBox="0 0 260 175" role="img" aria-label={`Investment return is ${Math.round(score)} percent`}>
            <path className="speedometer-gauge__track" d="M 20 140 A 110 110 0 0 1 240 140" />
            <path className={`speedometer-gauge__value ${gaining ? "is-positive" : "is-negative"}`} d="M 20 140 A 110 110 0 0 1 240 140" pathLength="100" strokeDasharray={`${score} 100`} />
            <line className="speedometer-gauge__break-even" x1="130" y1="28" x2="130" y2="43" />
            <line className={`speedometer-gauge__needle ${gaining ? "is-positive" : "is-negative"}`} x1="130" y1="140" x2={needleX} y2={needleY} />
            <circle className="speedometer-gauge__hub" cx="130" cy="140" r="8" />
            <text x="16" y="163">0%</text><text x="112" y="25">50%</text><text x="220" y="163">100%</text>
          </svg>
          <strong className="speedometer-gauge__score">{Math.round(score)}%</strong>
          <span className="speedometer-gauge__caption">money recovered</span>
        </div>

        <div className="speedometer-summary">
          <div className="speedometer-summary__item"><span>Bought price</span><strong>{formatFinanceMoney(data.invested)}</strong><small>{(data.retailUnits + data.wholesaleUnits).toLocaleString("en-IN")} products invested</small></div>
          <div className="speedometer-summary__item"><span>Total sales</span><strong>{formatFinanceMoney(sales)}</strong><small>{formatFinanceMoney(data.retailSales)} retail · {formatFinanceMoney(data.wholesaleSales)} wholesale</small></div>
          <div className={`speedometer-summary__gain ${gaining ? "is-positive" : "is-negative"}`}><span>{gaining ? "Gross gain" : "Amount to break even"}</span><strong>{formatFinanceMoney(Math.abs(gain))}</strong><small>{gaining ? "above bought price" : "still to recover"}</small></div>
          <div className="speedometer-mix"><div className="speedometer-mix__bar"><span style={{ width: `${retailShare}%` }}></span><span style={{ width: `${100 - retailShare}%` }}></span></div><div><span><i></i>Retail {retailShare}%</span><span><i></i>Wholesale {100 - retailShare}%</span></div></div>
        </div>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const { day, dateTime } = useDashboardDateTime();
  const salesChartRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [financePeriod, setFinancePeriod] = useState("month");
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
        <div className="finance-overview-heading__control">
          <label htmlFor="financePeriod">View period</label>
          <select id="financePeriod" className="form-select form-select-sm" value={financePeriod} onChange={(event) => setFinancePeriod(event.target.value)}>
            <option value="month">This month</option>
            <option value="year">This year</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      <div className="row g-3 mb-3"><div className="col-12"><InvestmentSpeedometer period={financePeriod} /></div></div>

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
