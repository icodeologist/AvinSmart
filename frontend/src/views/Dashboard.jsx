import { useEffect, useMemo, useRef, useState } from "react";
import ApexCharts from "apexcharts";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import { fetchProducts } from "../api/productsApi.js";
import { salesPurchaseOptions } from "../charts/charts.js";
import { fetchDashboardSummary, fetchTotalInvested } from "../api/dashboardApi.js";

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
const FAKE_RETAIL_INSIGHTS = [
  { title: "Capital in Stock", value: "₹1,24,800", detail: "What is invested in current stock", color: "primary", icon: "ti ti-wallet" },
  { title: "Shelf Retail Value", value: "₹1,67,500", detail: "Revenue if current stock sells", color: "info", icon: "ti ti-building-store" },
  { title: "Potential Stock Margin", value: "₹42,700", detail: "Expected margin from current stock", color: "success", icon: "ti ti-chart-line" },
  { title: "Average Bill Today", value: "₹401", detail: "Average value per completed bill", color: "warning", icon: "ti ti-shopping-cart" },
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

function SectionLabel({ eyebrow, title, detail }) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-1 px-1" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div>
        <p className="text-muted mb-0" style={{ fontSize: "0.67rem", fontWeight: 600 }}>{eyebrow}</p>
        <h2 className="mb-0" style={{ color: "#1d1d1f", fontSize: "0.95rem", fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</h2>
      </div>
      <small style={{ color: "#86868b", fontSize: "0.7rem" }}>{detail}</small>
    </div>
  );
}

const IOS_TONES = {
  primary: { background: "#0a84ff", shadow: "rgba(10, 132, 255, 0.22)" },
  success: { background: "#30b65a", shadow: "rgba(48, 182, 90, 0.22)" },
  warning: { background: "#ff9f0a", shadow: "rgba(255, 159, 10, 0.22)" },
  danger: { background: "#ff453a", shadow: "rgba(255, 69, 58, 0.22)" },
  info: { background: "#5e5ce6", shadow: "rgba(94, 92, 230, 0.22)" },
};

function IOSIcon({ color, icon }) {
  const tone = IOS_TONES[color] || IOS_TONES.primary;
  return <span className="d-inline-flex align-items-center justify-content-center rounded-3 text-white flex-shrink-0" style={{ width: 34, height: 34, background: tone.background, boxShadow: `0 4px 10px ${tone.shadow}` }}><i className={icon} style={{ fontSize: "1.05rem", lineHeight: 1 }}></i></span>;
}

function SnapshotCard({ title, value, detail, color, icon }) {
  return (
    <div className="col-md-6 col-xl-3">
      <article className="card h-100 border rounded-4" style={{ borderColor: "#e5e5ea", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.035)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-center gap-2 mb-2"><p className="mb-0" style={{ color: "#6e6e73", fontSize: "0.74rem", fontWeight: 600 }}>{title}</p><IOSIcon color={color} icon={icon} /></div>
          <h3 className="mb-1" style={{ color: "#1d1d1f", fontSize: "1.45rem", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.05 }}>{value}</h3>
          <p className="mb-0" style={{ color: "#86868b", fontSize: "0.67rem" }}>{detail}</p>
        </div>
      </article>
    </div>
  );
}

function TradeCard({ title, value, detail, color, icon, live }) {
  return (
    <div className="col-md-6 col-xl-3">
      <article className="card h-100 border rounded-4" style={{ borderColor: "#e5e5ea", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.035)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-center gap-2 mb-2"><span className="rounded-pill px-2 py-1" style={{ background: "#f2f2f7", color: "#6e6e73", fontSize: "0.57rem", fontWeight: 700, letterSpacing: "0.04em" }}><span className="d-inline-block rounded-circle me-1" style={{ width: 5, height: 5, background: IOS_TONES[color]?.background, verticalAlign: "1px" }}></span>{live ? "LIVE TODAY" : "DEMO TODAY"}</span><IOSIcon color={color} icon={icon} /></div>
          <p className="mb-1" style={{ color: "#6e6e73", fontSize: "0.74rem", fontWeight: 600 }}>{title}</p>
          <h3 className="mb-1" style={{ color: "#1d1d1f", fontSize: "1.38rem", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.05 }}>{value}</h3>
          <p className="mb-0" style={{ color: "#86868b", fontSize: "0.67rem" }}>{detail}</p>
        </div>
      </article>
    </div>
  );
}

function InsightCard({ title, value, detail, color, icon }) {
  return (
    <div className="col-md-6 col-xl-3">
      <article className="card h-100 border rounded-4" style={{ borderColor: "#e5e5ea", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.035)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-center gap-2 mb-2"><p className="mb-0" style={{ color: "#6e6e73", fontSize: "0.74rem", fontWeight: 600 }}>{title}</p><IOSIcon color={color} icon={icon} /></div>
          <h3 className="mb-1" style={{ color: "#1d1d1f", fontSize: "1.38rem", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.05 }}>{value}</h3>
          <p className="mb-0" style={{ color: "#86868b", fontSize: "0.67rem" }}>{detail}</p>
        </div>
      </article>
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

const DEMO_KPIS = [
  { label: "Net revenue", value: "₹2,84,600", change: "+18.6%", note: "vs last month", icon: "ti ti-chart-line", tone: "#8b5cf6" },
  { label: "Orders placed", value: "1,284", change: "+12.4%", note: "this month", icon: "ti ti-shopping-bag", tone: "#0ea5e9" },
  { label: "Average basket", value: "₹421", change: "+8.2%", note: "per customer", icon: "ti ti-basket", tone: "#14b8a6" },
  { label: "Repeat customers", value: "68.4%", change: "+4.9%", note: "returning buyers", icon: "ti ti-users", tone: "#f59e0b" },
];

function DemoKpi({ label, value, change, note, icon, tone }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <article className="h-100 rounded-4 p-3" style={{ background: "rgba(255,255,255,0.96)", border: "1px solid #e7e8f0", boxShadow: "0 8px 24px rgba(31, 35, 61, 0.06)" }}>
        <div className="d-flex justify-content-between align-items-start mb-4"><span className="d-inline-flex align-items-center justify-content-center rounded-3 text-white" style={{ width: 38, height: 38, background: tone, boxShadow: `0 7px 14px ${tone}44` }}><i className={icon}></i></span><span className="rounded-pill px-2 py-1" style={{ color: "#159570", background: "#e9faf3", fontSize: "0.68rem", fontWeight: 700 }}>{change}</span></div>
        <p className="mb-1" style={{ color: "#777b91", fontSize: "0.76rem", fontWeight: 600 }}>{label}</p>
        <h2 className="mb-1" style={{ color: "#202238", fontSize: "1.55rem", fontWeight: 750, letterSpacing: "-0.04em" }}>{value}</h2>
        <small style={{ color: "#a0a3b3" }}>{note}</small>
      </article>
    </div>
  );
}

function DemoDashboard() {
  const navigate = useNavigate();
  const revenueRef = useRef(null);
  const categoryRef = useRef(null);
  const trafficRef = useRef(null);
  const { dateTime } = useDashboardDateTime();
  const revenueOptions = useMemo(() => ({
    chart: { type: "area", height: 280, toolbar: { show: false }, fontFamily: "inherit" },
    colors: ["#8b5cf6", "#c4b5fd"],
    series: [{ name: "Revenue", data: [18, 24, 21, 31, 28, 39, 35, 44, 41, 50, 47, 58] }, { name: "Orders", data: [12, 17, 15, 22, 20, 27, 24, 31, 29, 36, 33, 42] }],
    xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], labels: { style: { colors: "#9699aa" } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#9699aa" }, formatter: (value) => `₹${value}k` } },
    dataLabels: { enabled: false }, stroke: { curve: "smooth", width: 3 }, fill: { type: "gradient", gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
    grid: { borderColor: "#f0f0f5", strokeDashArray: 4 }, legend: { position: "top", horizontalAlign: "right", markers: { radius: 8 } }, tooltip: { theme: "light" },
  }), []);
  const categoryOptions = useMemo(() => ({
    chart: { type: "donut", height: 280, fontFamily: "inherit" },
    labels: ["Dairy", "Snacks", "Beverages", "Personal care"], colors: ["#8b5cf6", "#0ea5e9", "#14b8a6", "#f59e0b"],
    series: [38, 27, 20, 15], dataLabels: { enabled: false }, stroke: { width: 0 },
    legend: { position: "bottom", fontSize: "12px", markers: { radius: 8 } }, plotOptions: { pie: { donut: { size: "72%", labels: { show: true, total: { show: true, label: "Sales mix", color: "#777b91", formatter: () => "100%" } } } } },
  }), []);
  const trafficOptions = useMemo(() => ({
    chart: { type: "bar", height: 250, toolbar: { show: false }, fontFamily: "inherit" },
    colors: ["#0ea5e9"], series: [{ name: "Visitors", data: [310, 420, 390, 510, 470, 620, 584] }],
    xaxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], labels: { style: { colors: "#9699aa" } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#9699aa" } } }, dataLabels: { enabled: false }, plotOptions: { bar: { borderRadius: 6, columnWidth: "48%" } }, grid: { borderColor: "#f0f0f5", strokeDashArray: 4 }, tooltip: { theme: "light" },
  }), []);
  useChart(revenueRef, revenueOptions);
  useChart(categoryRef, categoryOptions);
  useChart(trafficRef, trafficOptions);

  return (
    <main className="p-3 p-lg-4" style={{ background: "#f7f7fb", minHeight: "100%", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <section className="rounded-4 p-4 p-lg-5 mb-4 text-white overflow-hidden position-relative" style={{ background: "linear-gradient(120deg, #202238 0%, #39345f 58%, #6651a9 100%)" }}>
        <div className="position-relative" style={{ zIndex: 1 }}><h1 className="mb-2" style={{ fontSize: "clamp(1.6rem, 3vw, 2.35rem)", fontWeight: 750, letterSpacing: "-0.04em" }}>A clear view of your store.</h1><p className="mb-0" style={{ color: "#d8d4ef", maxWidth: 560 }}>A sample retail performance snapshot for presentations and planning. Figures shown here are illustrative.</p></div><i className="ti ti-chart-dots-3 position-absolute" style={{ right: "5%", bottom: "-18px", color: "rgba(255,255,255,0.1)", fontSize: "12rem" }}></i><button type="button" aria-label="Open main dashboard" title="Open main dashboard" className="position-absolute end-0 bottom-0 p-4 border-0" onClick={() => navigate("/profile/live-dashboard")} style={{ color: "#c8c3e7", background: "transparent", font: "inherit", fontSize: "0.78rem", cursor: "pointer" }}>{dateTime}</button>
      </section>

      <div className="row g-3 mb-4">{DEMO_KPIS.map((kpi) => <DemoKpi key={kpi.label} {...kpi} />)}</div>

      <div className="row g-3 mb-4">
        <div className="col-xl-8"><div className="rounded-4 p-3 p-lg-4 h-100" style={{ background: "#fff", border: "1px solid #e7e8f0", boxShadow: "0 8px 24px rgba(31, 35, 61, 0.04)" }}><div className="d-flex justify-content-between align-items-start"><div><h2 className="h6 mb-1" style={{ color: "#202238" }}>Revenue rhythm</h2><p className="small mb-0" style={{ color: "#9699aa" }}>A fictional twelve-month performance curve</p></div><span className="badge text-bg-light border">2026</span></div><div ref={revenueRef}></div></div></div>
        <div className="col-xl-4"><div className="rounded-4 p-3 p-lg-4 h-100" style={{ background: "#fff", border: "1px solid #e7e8f0", boxShadow: "0 8px 24px rgba(31, 35, 61, 0.04)" }}><h2 className="h6 mb-1" style={{ color: "#202238" }}>Where customers shop</h2><p className="small mb-0" style={{ color: "#9699aa" }}>Illustrative category split</p><div ref={categoryRef}></div></div></div>
      </div>

      <div className="row g-3"><div className="col-xl-7"><div className="rounded-4 p-3 p-lg-4" style={{ background: "#fff", border: "1px solid #e7e8f0", boxShadow: "0 8px 24px rgba(31, 35, 61, 0.04)" }}><h2 className="h6 mb-1" style={{ color: "#202238" }}>Weekly footfall</h2><p className="small mb-0" style={{ color: "#9699aa" }}>A sample view of store visits</p><div ref={trafficRef}></div></div></div><div className="col-xl-5"><div className="rounded-4 p-3 p-lg-4 h-100" style={{ background: "#202238", color: "#fff" }}><span className="badge rounded-pill mb-4" style={{ background: "#39345f", color: "#d8d4ef" }}>DEMO NOTE</span><h2 className="h5 mb-3">Made for showcasing.</h2><p className="small mb-4" style={{ color: "#c8c3e7" }}>This dashboard intentionally uses fixed sample figures. The protected workspace contains the live inventory and POS data.</p><div className="d-flex justify-content-between border-top pt-3" style={{ borderColor: "#4b4770 !important" }}><span className="small" style={{ color: "#a9a4cb" }}>Data mode</span><strong className="small">Static demo</strong></div></div></div></div>
    </main>
  );
}

export function DashboardWorkspace({ live = false, fullScreen = false, onShowDemo }) {
  const navigate = useNavigate();
  const { day, dateTime } = useDashboardDateTime();
  const salesChartRef = useRef(null);
  const [liveProducts, setLiveProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [invested, setInvested] = useState(null);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!live) return undefined;
    let cancelled = false;
    const loadProducts = () => {
      Promise.all([fetchProducts(), fetchDashboardSummary(), fetchTotalInvested()])
        .then(([productData, summaryData, investedData]) => {
          if (cancelled) return;
          setLiveProducts(productData);
          setSummary(summaryData);
          setInvested(investedData);
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
  const totalInvested = live ? invested ? formatMoney(invested.total_invested) : "—" : "₹1,24,800";
  const totalInvestedDetail = live && !invested ? "Loading current stock cost" : "Cost of current stock";
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
  const retailInsights = live
    ? summary ? [
      { title: "Capital in Stock", value: formatMoney(summary.inventory_cost), detail: "What is invested in current stock", color: "primary", icon: "ti ti-wallet" },
      { title: "Shelf Retail Value", value: formatMoney(summary.shelf_retail_value), detail: "Revenue if current stock sells", color: "info", icon: "ti ti-building-store" },
      { title: "Potential Stock Margin", value: formatMoney(summary.expected_margin), detail: "Expected margin from current stock", color: "success", icon: "ti ti-chart-line" },
      { title: "Average Bill Today", value: formatMoney(summary.average_bill), detail: "Average value per completed bill", color: "warning", icon: "ti ti-shopping-cart" },
    ] : FAKE_RETAIL_INSIGHTS.map((insight) => ({ ...insight, value: "—", detail: "Loading live retail insight" }))
    : FAKE_RETAIL_INSIGHTS;

  const chartOptions = useMemo(() => salesPurchaseOptions(), []);
  useChart(salesChartRef, chartOptions);
  const openDemoDashboard = onShowDemo || (() => navigate("/dashboard"));

  const content = <>
      {fullScreen ? <section className="rounded-4 p-4 p-lg-5 mb-4 text-white overflow-hidden position-relative" style={{ background: "linear-gradient(120deg, #123b52 0%, #166b75 58%, #20a39e 100%)" }}><div className="position-relative" style={{ zIndex: 1 }}><span className="badge rounded-pill px-3 py-2 mb-3" style={{ background: "rgba(255,255,255,0.16)", fontSize: "0.7rem", letterSpacing: "0.08em" }}>LIVE WORKSPACE</span><h1 className="mb-2" style={{ fontSize: "clamp(1.6rem, 3vw, 2.35rem)", fontWeight: 750, letterSpacing: "-0.04em" }}>Your store, live.</h1><p className="mb-0" style={{ color: "#c6f0ed", maxWidth: 560 }}>Current inventory and POS performance, refreshed automatically.</p></div><i className="ti ti-activity-heartbeat position-absolute" style={{ right: "5%", bottom: "-18px", color: "rgba(255,255,255,0.12)", fontSize: "12rem" }}></i><div className="position-absolute end-0 bottom-0 p-4 text-end"><button type="button" aria-label="Open showcase dashboard" title="Open showcase dashboard" className="border-0 p-0 d-block ms-auto" onClick={openDemoDashboard} style={{ color: "#b9e7e3", background: "transparent", font: "inherit", fontSize: "0.78rem", cursor: "pointer" }}>{dateTime}</button></div></section> : <PageHeader title="Dashboard" subtitle="Demo workspace">
        <div className="date-time-box border rounded-3 bg-white px-4 py-3 text-md-end shadow-sm"><p className="mb-0 fw-semibold text-dark fs-5">{day}</p><p className="mb-0 text-secondary small fw-bold">{dateTime}</p></div>
      </PageHeader>}

      <div className="row g-3 mb-3">
        <div className="col-12"><SectionLabel eyebrow="Store snapshot" title="Inventory at a glance" detail={live ? "Refreshing every 30 seconds" : "Static demo figures"} /></div>
        <SnapshotCard title="Total invested" value={totalInvested} detail={totalInvestedDetail} color="primary" icon="ti ti-wallet" />
        <SnapshotCard title="Units in stock" value={stats.units} detail="Across all products" color="success" icon="ti ti-packages" />
        <SnapshotCard title="Low stock" value={stats.lowStock} detail={`At or below ${LOW_STOCK_THRESHOLD} units`} color="warning" icon="ti ti-alert-triangle" />
        <SnapshotCard title="Out of stock" value={stats.outOfStock} detail="Products needing stock" color="danger" icon="ti ti-package-off" />
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12"><SectionLabel eyebrow="Today's trade" title="Sales and collection" detail={live ? "From completed POS orders" : "Demo retail performance"} /></div>
        {retailMetrics.map((metric) => <TradeCard key={metric.title} {...metric} live={live} />)}
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12"><SectionLabel eyebrow="Inventory intelligence" title="Value sitting on your shelves" detail={live ? "Calculated from live stock pricing" : "Demo stock valuation"} /></div>
        {retailInsights.map((insight) => <InsightCard key={insight.title} {...insight} />)}
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6"><DairyStockMonitor products={dairyProducts} /></div>
        <div className="col-lg-6"><LowStockMonitor products={lowStock} loading={loading} error={error} /></div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6">{live ? <div className="card h-100 border-0 shadow-sm"><div className="card-header bg-white px-4 py-3"><h3 className="h5 mb-0">Sales activity</h3></div><div className="card-body d-flex align-items-center justify-content-center text-center py-5"><div><p className="text-muted mb-0">Live sales data will appear after transactions are recorded.</p></div></div></div> : <div className="card h-100 border-0 shadow-sm"><div className="card-header d-flex justify-content-between align-items-center bg-white px-4 py-3"><h3 className="h5 mb-0">Sales vs Purchase</h3><span className="badge text-bg-light border">This year</span></div><div className="card-body p-4"><div ref={salesChartRef}></div></div></div>}</div>
        <div className="col-lg-6"><div className="card h-100 border-0 shadow-sm"><div className="card-header bg-white d-flex justify-content-between align-items-center px-4 py-3"><h3 className="h5 mb-0">Top Selling Products</h3><button type="button" className="btn btn-sm btn-outline-secondary"><i className="ti ti-calendar me-1"></i>Today</button></div><div className="card-body d-flex align-items-center justify-content-center text-center py-5"><div><i className="ti ti-shopping-bag fs-1 text-muted"></i><p className="text-muted mb-0 mt-2">No sales data yet.</p></div></div></div></div>
      </div>

      <div className="card border-0 shadow-sm"><div className="card-header bg-white d-flex justify-content-between align-items-center px-4 py-3"><h3 className="h5 mb-0">Recent Sales</h3><button type="button" className="btn btn-sm btn-outline-secondary"><i className="ti ti-calendar-event me-1"></i>Weekly</button></div><div className="card-body d-flex align-items-center justify-content-center text-center py-5"><div><i className="ti ti-receipt-2 fs-1 text-muted"></i><p className="text-muted mb-0 mt-2">No sales data yet.</p></div></div></div>
    </>;

  return fullScreen ? <main className="min-vh-100 bg-light p-3 p-lg-4">{content}</main> : content;
}

export default function Dashboard() {
  return <DemoDashboard />;
}
