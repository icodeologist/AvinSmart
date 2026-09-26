import { useEffect, useMemo, useRef, useState } from "react";
import ApexCharts from "apexcharts";
import PageHeader from "../components/layout/PageHeader.jsx";
import { fetchProducts } from "../api/productsApi.js";
import { salesPurchaseOptions } from "../charts/charts.js";
import { fetchDashboardSummary } from "../api/dashboardApi.js";

const LOW_STOCK_THRESHOLD = 10;
const DAIRY_STOCK_PRODUCTS = [
  { id: "dairy-buttermilk", title: "Nandini Buttermilk", sku_id: "NAN-BM-200", sub_category: { name: "Buttermilk" }, quantity: 4, unit: "packs" },
  { id: "dairy-curd", title: "Nandini Curd", sku_id: "NAN-CURD-400", sub_category: { name: "Curd" }, quantity: 8, unit: "cups" },
  { id: "dairy-paneer", title: "Amul Fresh Paneer", sku_id: "AMU-PAN-200", sub_category: { name: "Paneer" }, quantity: 13, unit: "packs" },
  { id: "dairy-butter", title: "Amul Butter", sku_id: "AMU-BUT-100", sub_category: { name: "Butter" }, quantity: 21, unit: "packs" },
  { id: "dairy-milk", title: "Nandini Toned Milk", sku_id: "NAN-MILK-500", sub_category: { name: "Milk" }, quantity: 40, unit: "packets" },
];
const FAKE_INVENTORY_PRODUCTS = [
  { id: "demo-chips", title: "Classic Potato Chips", sku_id: "DEMO-SNK-001", quantity: 0, category: { name: "Snacks" } },
  { id: "demo-biscuits", title: "Butter Biscuits", sku_id: "DEMO-SNK-002", quantity: 3, category: { name: "Snacks" } },
  { id: "demo-shampoo", title: "Daily Care Shampoo", sku_id: "DEMO-CARE-001", quantity: 6, category: { name: "Personal Care" } },
  { id: "demo-juice", title: "Orange Juice", sku_id: "DEMO-DRK-001", quantity: 8, category: { name: "Beverages" } },
  { id: "demo-bread", title: "Whole Wheat Bread", sku_id: "DEMO-BKY-001", quantity: 10, category: { name: "Bakery" } },
];
const FAKE_STATS = { products: 148, units: 2430, lowStock: 8, outOfStock: 2 };
const FAKE_RETAIL_METRICS = [
  { title: "Today's Sales", value: "₹18,450", detail: "Completed sales today", color: "primary", icon: "ti ti-currency-rupee" },
  { title: "Gross Profit", value: "₹3,820", detail: "Profit from today's sales", color: "success", icon: "ti ti-trending-up" },
  { title: "Bills Today", value: "46", detail: "Completed customer bills", color: "info", icon: "ti ti-receipt" },
  { title: "Pending Collection", value: "₹1,260", detail: "Open order balance", color: "warning", icon: "ti ti-clock-dollar" },
];

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function useDashboardDateTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const day = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);
  const date = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" }).format(now);
  const time = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);
  return { day, dateTime: `${date} ${time}` };
}

function useChart(targetRef, options) {
  useEffect(() => {
    if (!targetRef.current) return undefined;
    const chart = new ApexCharts(targetRef.current, options);
    chart.render();
    return () => chart.destroy();
  }, [targetRef, options]);
}

function StatCard({ title, value, detail, color, icon }) {
  return (
    <div className="col-lg-3 col-12">
      <div className={`card p-4 bg-${color} bg-opacity-10 border border-${color} border-opacity-25 rounded-2 h-100`}>
        <div className="d-flex gap-3">
          <div className={`icon-shape icon-md bg-${color} text-white rounded-2`}><i className={`${icon} fs-4`}></i></div>
          <div>
            <h2 className="mb-2 fs-6">{title}</h2>
            <h3 className="fw-bold mb-0">{value}</h3>
            <p className="text-muted mb-0 small">{detail}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DairyStockMonitor({ products }) {
  const dairyProducts = useMemo(() => [...products]
    .sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0)), [products]);
  const maxQuantity = Math.max(...dairyProducts.map((product) => Number(product.quantity) || 0), 1);
  const totalUnits = dairyProducts.reduce((sum, product) => sum + Math.max(0, Number(product.quantity) || 0), 0);

  function stockStatus(quantity) {
    const percentage = Math.round((quantity / maxQuantity) * 100);
    if (quantity <= LOW_STOCK_THRESHOLD) return { key: "low", label: "Restock", color: "danger" };
    if (percentage >= 75) return { key: "full", label: "Full stock", color: "success" };
    return { key: "okay", label: "Good stock", color: "primary" };
  }

  const statusCounts = dairyProducts.reduce((counts, product) => {
    counts[stockStatus(Math.max(0, Number(product.quantity) || 0)).key] += 1;
    return counts;
  }, { low: 0, okay: 0, full: 0 });

  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center px-4 py-3"><div><h4 className="h6 mb-0">Dairy inventory</h4><small className="text-muted">Lowest stock first</small></div><div className="text-end"><strong className="h6 mb-0">{totalUnits}</strong><small className="text-muted d-block">units</small></div></div>
      <div className="card-body p-4">
        <div className="row g-2 mb-3">
          <div className="col-4"><div className="rounded-3 p-2 border text-center"><strong className="text-danger">{statusCounts.low}</strong><small className="d-block text-muted" style={{ fontSize: "0.68rem" }}>Restock</small></div></div>
          <div className="col-4"><div className="rounded-3 p-2 border text-center"><strong className="text-primary">{statusCounts.okay}</strong><small className="d-block text-muted" style={{ fontSize: "0.68rem" }}>Good</small></div></div>
          <div className="col-4"><div className="rounded-3 p-2 border text-center"><strong className="text-success">{statusCounts.full}</strong><small className="d-block text-muted" style={{ fontSize: "0.68rem" }}>Full</small></div></div>
        </div>
        {!dairyProducts.length ? <div className="text-center py-4"><i className="ti ti-milk fs-1 text-muted"></i><p className="text-muted mb-0 mt-2">No Dairy products to show.</p></div>
          : <div className="vstack gap-2">
                {dairyProducts.map((product) => {
                  const quantity = Math.max(0, Number(product.quantity) || 0);
                  const percentage = Math.round((quantity / maxQuantity) * 100);
                  const status = stockStatus(quantity);
                  return <div className="rounded-3 p-3 border" key={product.id || product.sku_id}>
                    <div className="d-flex justify-content-between align-items-center gap-3">
                      <div className="d-flex align-items-center gap-2 min-w-0"><span className={`rounded-circle bg-${status.color}`} style={{ width: 8, height: 8 }}></span><div className="min-w-0"><div className="fw-semibold text-truncate" title={product.title}>{product.title}</div><small className="text-muted">{product.sub_category?.name || "None"} · {status.label}</small></div></div>
                      <div className="text-end text-nowrap"><span className={`fw-bold text-${status.color}`}>{quantity}</span><small className="text-muted ms-1">{product.unit || "units"}</small><small className="text-muted d-block">{percentage}% level</small></div>
                    </div>
                    <div className="progress mt-2 rounded-pill" style={{ height: 7 }} role="progressbar" aria-label={`${product.title} stock level`} aria-valuenow={percentage} aria-valuemin="0" aria-valuemax="100"><div className={`progress-bar bg-${status.color} rounded-pill`} style={{ width: `${percentage}%` }}></div></div>
                  </div>;
                })}
              </div>}
      </div>
    </div>
  );
}

function LowStockMonitor({ products, loading, error }) {
  const counts = useMemo(() => products.reduce((total, product) => {
    const quantity = Math.max(0, Number(product.quantity) || 0);
    if (quantity === 0) total.out += 1;
    else if (quantity <= 5) total.critical += 1;
    else total.low += 1;
    return total;
  }, { out: 0, critical: 0, low: 0 }), [products]);

  function stockStatus(quantity) {
    if (quantity <= 0) return { label: "Out", color: "danger" };
    if (quantity <= 5) return { label: "Critical", color: "warning" };
    return { label: "Low", color: "primary" };
  }

  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center px-4 py-3"><div><h4 className="h6 mb-0">Low stock products</h4><small className="text-muted">At or below {LOW_STOCK_THRESHOLD} units</small></div><strong className="h6 mb-0 text-danger">{products.length} items</strong></div>
      <div className="card-body p-4">
        <div className="row g-2 mb-3">
          <div className="col-4"><div className="rounded-3 p-2 border text-center"><strong className="text-danger">{counts.out}</strong><small className="d-block text-muted" style={{ fontSize: "0.68rem" }}>Out</small></div></div>
          <div className="col-4"><div className="rounded-3 p-2 border text-center"><strong className="text-warning">{counts.critical}</strong><small className="d-block text-muted" style={{ fontSize: "0.68rem" }}>Critical</small></div></div>
          <div className="col-4"><div className="rounded-3 p-2 border text-center"><strong className="text-primary">{counts.low}</strong><small className="d-block text-muted" style={{ fontSize: "0.68rem" }}>Low</small></div></div>
        </div>
        {loading ? <p className="text-center py-5 text-secondary mb-0">Loading products...</p>
          : error ? <p className="text-center py-5 text-danger mb-0">{error}</p>
            : !products.length ? <div className="text-center py-4"><p className="text-muted mb-0">All products are well stocked.</p></div>
              : <div className="vstack gap-2">
                {products.map((product) => {
                  const quantity = Math.max(0, Number(product.quantity) || 0);
                  const percentage = Math.min(100, Math.round((quantity / LOW_STOCK_THRESHOLD) * 100));
                  const status = stockStatus(quantity);
                  return <div className="rounded-3 p-3 border" key={product.id || product.sku_id}>
                    <div className="d-flex justify-content-between align-items-center gap-3">
                      <div className="d-flex align-items-center gap-2 min-w-0"><span className={`rounded-circle bg-${status.color}`} style={{ width: 8, height: 8 }}></span><div className="min-w-0"><div className="fw-semibold text-truncate" title={product.title}>{product.title}</div><small className="text-muted">{product.sku_id} · {status.label}</small></div></div>
                      <div className="text-end text-nowrap"><span className={`fw-bold text-${status.color}`}>{quantity}</span><small className="text-muted ms-1">in stock</small><small className="text-muted d-block">{percentage}% level</small></div>
                    </div>
                    <div className="progress mt-2 rounded-pill" style={{ height: 7 }} role="progressbar" aria-label={`${product.title} stock level`} aria-valuenow={percentage} aria-valuemin="0" aria-valuemax="100"><div className={`progress-bar bg-${status.color} rounded-pill`} style={{ width: `${percentage}%` }}></div></div>
                  </div>;
                })}
              </div>}
      </div>
    </div>
  );
}

export function DashboardWorkspace({ live = false, fullScreen = false, onShowDemo }) {
  const { day, dateTime } = useDashboardDateTime();
  const salesChartRef = useRef(null);
  const [liveProducts, setLiveProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!live) return undefined;
    let cancelled = false;
    const loadProducts = () => {
      Promise.all([fetchProducts(), fetchDashboardSummary()])
        .then(([productData, summaryData]) => {
          if (cancelled) return;
          setLiveProducts(productData);
          setSummary(summaryData);
        })
        .catch((loadError) => { if (!cancelled) setError(loadError.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    };
    loadProducts();
    const refreshTimer = window.setInterval(loadProducts, 30000);
    return () => { cancelled = true; window.clearInterval(refreshTimer); };
  }, [live]);

  const products = live ? liveProducts : FAKE_INVENTORY_PRODUCTS;

  const lowStock = useMemo(
    () => products
      .filter((product) => Number(product.quantity) <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => Number(a.quantity) - Number(b.quantity))
      .slice(0, 5),
    [products]
  );

  const liveStats = useMemo(() => ({
    products: products.length,
    units: products.reduce((total, product) => total + Math.max(0, Number(product.quantity) || 0), 0),
    lowStock: products.filter((product) => Number(product.quantity) > 0 && Number(product.quantity) <= LOW_STOCK_THRESHOLD).length,
    outOfStock: products.filter((product) => Number(product.quantity) <= 0).length,
  }), [products]);
  const stats = live ? liveStats : FAKE_STATS;
  const dairyProducts = live
    ? products.filter((product) => String(product.category?.name || "").trim().toLowerCase() === "dairy")
    : DAIRY_STOCK_PRODUCTS;
  const retailMetrics = live
    ? summary ? [
      { title: "Today's Sales", value: formatMoney(summary.today_sales), detail: "Completed sales today", color: "primary", icon: "ti ti-currency-rupee" },
      { title: "Gross Profit", value: formatMoney(summary.gross_profit), detail: "Profit from today's sales", color: "success", icon: "ti ti-trending-up" },
      { title: "Bills Today", value: summary.bills_today, detail: "Completed customer bills", color: "info", icon: "ti ti-receipt" },
      { title: "Pending Collection", value: formatMoney(summary.pending_collection), detail: "Open order balance", color: "warning", icon: "ti ti-clock-dollar" },
    ] : [
      { title: "Today's Sales", value: "—", detail: "Loading live sales", color: "primary", icon: "ti ti-currency-rupee" },
      { title: "Gross Profit", value: "—", detail: "Loading live profit", color: "success", icon: "ti ti-trending-up" },
      { title: "Bills Today", value: "—", detail: "Loading live bills", color: "info", icon: "ti ti-receipt" },
      { title: "Pending Collection", value: "—", detail: "Loading open orders", color: "warning", icon: "ti ti-clock-dollar" },
    ]
    : FAKE_RETAIL_METRICS;

  const chartOptions = useMemo(() => salesPurchaseOptions(), []);
  useChart(salesChartRef, chartOptions);

  const content = <>
      {fullScreen ? <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"><div><p className="text-primary text-uppercase small fw-semibold mb-1">Live workspace</p><h1 className="h3 mb-1">Operations dashboard</h1><p className="text-muted mb-0">Inventory data refreshes automatically.</p></div><button type="button" className="btn btn-outline-secondary" onClick={onShowDemo}>View demo dashboard</button></div> : <PageHeader title="Dashboard" subtitle="Demo workspace">
        <div className="date-time-box border rounded-3 bg-white px-4 py-3 text-md-end shadow-sm"><p className="mb-0 fw-semibold text-dark fs-5">{day}</p><p className="mb-0 text-secondary small fw-bold">{dateTime}</p></div>
      </PageHeader>}

      <div className="row g-3 mb-3">
        <StatCard title="Products" value={stats.products} detail="From your inventory" color="primary" icon="ti ti-box-seam" />
        <StatCard title="Units in stock" value={stats.units} detail="Across all products" color="success" icon="ti ti-packages" />
        <StatCard title="Low stock" value={stats.lowStock} detail={`At or below ${LOW_STOCK_THRESHOLD} units`} color="warning" icon="ti ti-alert-triangle" />
        <StatCard title="Out of stock" value={stats.outOfStock} detail="Products needing stock" color="danger" icon="ti ti-package-off" />
      </div>

      <div className="row g-3 mb-3">
        {retailMetrics.map((metric) => <StatCard key={metric.title} {...metric} />)}
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6">{live ? <div className="card h-100 border-0 shadow-sm"><div className="card-header bg-white px-4 py-3"><h3 className="h5 mb-0">Sales activity</h3></div><div className="card-body d-flex align-items-center justify-content-center text-center py-5"><div><p className="text-muted mb-0">Live sales data will appear after transactions are recorded.</p></div></div></div> : <div className="card h-100 border-0 shadow-sm"><div className="card-header d-flex justify-content-between align-items-center bg-white px-4 py-3"><h3 className="h5 mb-0">Sales vs Purchase</h3><span className="badge text-bg-light border">This year</span></div><div className="card-body p-4"><div ref={salesChartRef}></div></div></div>}</div>
        <div className="col-lg-6"><div className="card h-100 border-0 shadow-sm"><div className="card-header bg-white d-flex justify-content-between align-items-center px-4 py-3"><h3 className="h5 mb-0">Top Selling Products</h3><button type="button" className="btn btn-sm btn-outline-secondary"><i className="ti ti-calendar me-1"></i>Today</button></div><div className="card-body d-flex align-items-center justify-content-center text-center py-5"><div><i className="ti ti-shopping-bag fs-1 text-muted"></i><p className="text-muted mb-0 mt-2">No sales data yet.</p></div></div></div></div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6"><DairyStockMonitor products={dairyProducts} /></div>
        <div className="col-lg-6"><LowStockMonitor products={lowStock} loading={loading} error={error} /></div>
      </div>

      <div className="card border-0 shadow-sm"><div className="card-header bg-white d-flex justify-content-between align-items-center px-4 py-3"><h3 className="h5 mb-0">Recent Sales</h3><button type="button" className="btn btn-sm btn-outline-secondary"><i className="ti ti-calendar-event me-1"></i>Weekly</button></div><div className="card-body d-flex align-items-center justify-content-center text-center py-5"><div><i className="ti ti-receipt-2 fs-1 text-muted"></i><p className="text-muted mb-0 mt-2">No sales data yet.</p></div></div></div>
    </>;

  return fullScreen ? <main className="min-vh-100 bg-light p-3 p-lg-4">{content}</main> : content;
}

export default function Dashboard() {
  return <DashboardWorkspace />;
}
