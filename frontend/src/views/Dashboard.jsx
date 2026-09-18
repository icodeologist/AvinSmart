import { useEffect, useRef, useState } from "react";
import ApexCharts from "apexcharts";
import PageHeader from "../components/layout/PageHeader.jsx";
import DairyInventory from "../components/dairy/DairyInventory.jsx";
import { salesPurchaseOptions } from "../charts/charts.js";

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

const topSelling = [
  { image: "./assets/images/product-2.png", name: "Wireless Earphones", price: "$89", units: "1,250 Units", badge: "18%", badgeClass: "bg-danger-subtle text-danger border-danger" },
  { image: "./assets/images/product-1.png", name: "Gaming Joy Stick", price: "$49", units: "5,420 Units", badge: "32%", badgeClass: "bg-primary-subtle text-primary border-primary" },
  { image: "./assets/images/product-3.png", name: "Smart Watch Pro", price: "$98", units: "862 Units", badge: "22%", badgeClass: "bg-info-subtle text-info border-info" },
  { image: "./assets/images/product-4.png", name: "USB-C Fast Charger", price: "$35", units: "3,200 Units", badge: "28%", badgeClass: "bg-success-subtle text-success border-success" },
  { image: "./assets/images/product-5.png", name: "Portable Bluetooth Speaker", price: "$65", units: "2,890 Units", badge: "25%", badgeClass: "bg-warning-subtle text-warning border-warning" },
];

const lowStock = [
  { image: "./assets/images/product-8.png", name: "Wireless Headphones", id: "#554433", count: "06" },
  { image: "./assets/images/product-4.png", name: "USB-C Cable Pack", id: "#887766", count: "09" },
  { image: "./assets/images/product-10.png", name: "Phone Screen Protector", id: "#332211", count: "03" },
  { image: "./assets/images/product-4.png", name: "Portable Charger 20000mAh", id: "#998877", count: "07" },
  { image: "./assets/images/product-6.png", name: "Mechanical Keyboard RGB", id: "#665544", count: "02" },
];

const recentSales = [
  { image: "./assets/images/product-7.png", name: "MacBook Pro 16\"", meta: "Computers • 2,$2,499", badge: "Completed", badgeClass: "bg-success-subtle text-success" },
  { image: "./assets/images/product-9.png", name: "AirPods Pro Max", meta: "Audio • $549", badge: "Processing", badgeClass: "bg-primary-subtle text-primary" },
  { image: "./assets/images/product-8.png", name: "iPad Air 11\"", meta: "Tablets • $799", badge: "Completed", badgeClass: "bg-success-subtle text-success" },
  { image: "./assets/images/product-3.png", name: "Apple Watch Ultra", meta: "Wearables • $799", badge: "Pending", badgeClass: "bg-warning-subtle text-warning" },
  { image: "./assets/images/product-6.png", name: "Magic Keyboard", meta: "Accessories • $299", badge: "Cancelled", badgeClass: "bg-danger-subtle text-danger" },
];

export default function Dashboard() {
  const { day, dateTime } = useDashboardDateTime();
  const salesChartRef = useRef(null);

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
              {topSelling.map((item) => (
                <li className="list-group-item d-flex align-items-center gap-3" key={item.name}>
                  <img src={item.image} className="rounded" width="48" alt="" />
                  <div className="flex-grow-1">
                    <p className="mb-1">{item.name}</p>
                    <div className="d-flex align-items-center gap-2 text-muted">
                      <small className="fw-semibold">{item.price}</small>
                      <small>•</small>
                      <small>{item.units}</small>
                    </div>
                  </div>
                  <span className={`badge ${item.badgeClass} border`}>{item.badge}</span>
                </li>
              ))}
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
              {lowStock.map((item) => (
                <li className="list-group-item d-flex align-items-center gap-3" key={item.name}>
                  <img src={item.image} className="rounded" width="48" alt="" />
                  <div className="flex-grow-1">
                    <p className="mb-1">{item.name}</p>
                    <small>ID: {item.id}</small>
                  </div>
                  <div className="d-flex flex-column gap-0 align-items-center">
                    <span className="fw-semibold text-primary">{item.count}</span>
                    <small className="text-muted">In Stock</small>
                  </div>
                </li>
              ))}
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
              {recentSales.map((item) => (
                <li className="list-group-item d-flex align-items-center gap-3" key={item.name}>
                  <img src={item.image} className="rounded" width="48" alt="" />
                  <div className="flex-grow-1">
                    <p className="mb-1">{item.name}</p>
                    <div className="d-flex align-items-center gap-2 text-muted">
                      <small className="fw-semibold">{item.meta}</small>
                    </div>
                  </div>
                  <span className={`badge ${item.badgeClass}`}>{item.badge}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}