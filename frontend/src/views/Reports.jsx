import { useEffect, useRef, useState } from "react";
import ApexCharts from "apexcharts";
import PageHeader from "../components/layout/PageHeader.jsx";
import { salesOverviewOptions } from "../charts/charts.js";

const statCards = [
  { title: "Total Revenue", value: "$45,231", trend: "+12% from last month", trendClass: "text-success", icon: "ti ti-arrow-up" },
  { title: "Products Sold", value: "1,234", trend: "8% from last month", trendClass: "text-success", icon: "ti ti-arrow-up" },
  { title: "Low Stock Items", value: "23", trend: "3% from last month", trendClass: "text-danger", icon: "ti ti-arrow-down" },
  { title: "Out of Stock", value: "5", trend: "2% from last month", trendClass: "text-danger", icon: "ti ti-arrow-down" },
];

const topProducts = [
  { image: "./assets/images/product-1.png", name: "Gaming Joy Stick", units: "156 units sold", amount: "$3,120" },
  { image: "./assets/images/product-2.png", name: "Wireless Headphones", units: "134 units sold", amount: "$2,680" },
  { image: "./assets/images/product-3.png", name: "Smartwatch", units: "98 units sold", amount: "$1,960" },
];

export default function Reports() {
  const chartRef = useRef(null);
  const [chart, setChart] = useState(null);
  const { salesThisYear, salesLastYear, options } = salesOverviewOptions();
  const [showingBoth, setShowingBoth] = useState(true);
  const [updateLabel, setUpdateLabel] = useState("Show This Year Only");

  useEffect(() => {
    if (!chartRef.current) return;
    const instance = new ApexCharts(chartRef.current, options);
    instance.render();
    setChart(instance);
    return () => instance.destroy();
  }, []);

  function randomize() {
    if (!chart) return;
    const rand = () => Math.round((Math.random() * 80 + 20) * 1000);
    chart.updateSeries([
      { name: "This Year", data: Array.from({ length: 12 }, rand) },
      { name: "Last Year", data: Array.from({ length: 12 }, rand) },
    ]);
  }

  function toggleYear() {
    if (!chart) return;
    if (showingBoth) {
      chart.updateSeries([{ name: "This Year", data: salesThisYear }]);
      setUpdateLabel("Show Comparison");
    } else {
      chart.updateSeries([
        { name: "This Year", data: salesThisYear },
        { name: "Last Year", data: salesLastYear },
      ]);
      setUpdateLabel("Show This Year Only");
    }
    setShowingBoth(!showingBoth);
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="View your inventory analytics and reports" />

      <div className="row g-3 mb-3">
        {statCards.map((card) => (
          <div className="col-12 col-sm-6 col-md-3" key={card.title}>
            <div className="card h-100">
              <div className="card-body p-4">
                <h6 className="mb-4">{card.title}</h6>
                <h3 className="mb-1 fw-bold">{card.value}</h3>
                <p className={`mb-0 ${card.trendClass} small`}><i className={`ti ${card.icon}`}></i> {card.trend}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row mb-3">
        <div className="col-12">
          <div className="card">
            <div className="card-body p-4">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start mb-3 gap-2">
                <div>
                  <h2 className="mb-0 fs-5">Sales Overview</h2>
                </div>
                <div className="controls">
                  <button id="btn-random" className="btn btn-light btn-sm" onClick={randomize}>Randomize Data</button>
                  <button id="btn-update" className="btn btn-primary btn-sm" onClick={toggleYear}>{updateLabel}</button>
                </div>
              </div>
              <div id="salesChart" ref={chartRef}></div>
              <div className="d-flex justify-content-end">
                <a href="#" className="small">View detailed report</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h2 className="mb-0 fs-5">Top Products</h2>
                </div>
              </div>
              <div className="list-group list-group-flush">
                {topProducts.map((product) => (
                  <div className="list-group-item p-3 d-flex align-items-center" key={product.name}>
                    <div className="me-3">
                      <img src={product.image} alt={product.name} className="rounded" style={{ width: 48, height: 48, objectFit: "cover" }} />
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-0">{product.name}</h6>
                          <small className="text-secondary">{product.units}</small>
                        </div>
                        <div className="text-end">
                          <strong>{product.amount}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}