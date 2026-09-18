import { useEffect, useState } from "react";
import { getDairyProducts, sellDairyProduct, subscribeDairyInStock } from "../../api/dairyInventory.js";

function statusFor(quantity, lowThreshold) {
  if (quantity <= 0) {
    return { label: "Out of Stock", badge: "bg-danger-subtle text-danger border-danger", bar: "bg-danger", icon: "ti-droplet-off" };
  }
  if (quantity <= lowThreshold) {
    return { label: "Running Low", badge: "bg-warning-subtle text-warning border-warning", bar: "bg-warning", icon: "ti-alert-triangle" };
  }
  return { label: "In Stock", badge: "bg-success-subtle text-success border-success", bar: "bg-success", icon: "ti-circle-check" };
}

function daysLeftText(quantity, soldToday) {
  if (soldToday <= 0) return "days left: —";
  const days = quantity / soldToday;
  if (days < 1) return "left: <1 day";
  return `left: ${Math.ceil(days)} days`;
}

function useDairyInventory() {
  const [items, setItems] = useState(() => getDairyProducts());

  useEffect(() => subscribeDairyInStock(() => setItems(getDairyProducts())), []);

  return items
    .map((product) => ({
      ...product,
      status: statusFor(product.quantity, product.lowThreshold),
      daysLeft: daysLeftText(product.quantity, product.soldToday),
      estDays: product.quantity / Math.max(product.soldToday, 1),
    }))
    .sort((a, b) => a.estDays - b.estDays);
}

export default function DairyInventory() {
  const items = useDairyInventory();
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const needRestock = items.filter((item) => item.quantity <= item.lowThreshold).length;
  const fastest = items[0];

  return (
    <div className="card h-100">
      <div className="card-header d-flex justify-content-between align-items-center bg-white px-4 py-3">
        <h3 className="h5 mb-0">Dairy Inventory</h3>
        <span className="badge bg-success-subtle text-success d-inline-flex align-items-center gap-1">
          <span
            className="spinner-grow spinner-grow-sm"
            style={{ width: "0.5rem", height: "0.5rem" }}
            role="status"
            aria-hidden="true"
          ></span>
          Live
        </span>
      </div>

      <div className="card-body p-4">
        {fastest && fastest.estDays < 3 ? (
          <div className="alert alert-warning py-2 d-flex align-items-center mb-3">
            <i className="ti ti-alert-triangle me-2"></i>
            <div>
              <strong>{fastest.name}</strong> is running out fast — {fastest.quantity} {fastest.unit} left ({fastest.daysLeft})
            </div>
          </div>
        ) : null}

        <ul className="list-group list-group-flush">
          {items.map((item) => {
            const pct = Math.max(0, Math.min(100, (item.quantity / item.capacity) * 100));
            return (
              <li className="list-group-item px-0" key={item.sku}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span
                    className={`icon-shape icon-sm rounded-2 ${
                      item.status.bar === "bg-danger"
                        ? "bg-danger-subtle text-danger"
                        : item.status.bar === "bg-warning"
                          ? "bg-warning-subtle text-warning"
                          : "bg-primary-subtle text-primary"
                    }`}
                  >
                    <i className="ti ti-milk"></i>
                  </span>
                  <div className="flex-grow-1">
                    <p className="mb-0 fw-semibold small">{item.name}</p>
                    <small className="text-muted">{item.sku} · {item.daysLeft}</small>
                  </div>
                  <div className="text-end">
                    <span className="fw-bold">{item.quantity}</span>
                    <small className="text-muted d-block">{item.unit}</small>
                  </div>
                  <span className={`badge ${item.status.badge} border`}>{item.status.label}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                    onClick={() => sellDairyProduct(item.sku)}
                    disabled={item.quantity <= 0}
                  >
                    <i className="ti ti-shopping-cart-plus"></i> Sell
                  </button>
                </div>
                <div className="progress" role="progressbar" style={{ height: 6 }}>
                  <div className={`progress-bar ${item.status.bar}`} style={{ width: `${pct}%` }}></div>
                </div>
                <div className="d-flex justify-content-between small text-muted mt-1">
                  <span>Stock level ({pct.toFixed(0)}%)</span>
                  <span>Sold today: {item.soldToday}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card-footer bg-white d-flex justify-content-between align-items-center px-4 py-3 border-top">
        <div>
          <small className="text-secondary d-block">Total units left</small>
          <span className="fw-bold">{totalUnits}</span>
        </div>
        <div className="text-end">
          <small className="text-secondary d-block">Need restock</small>
          <span className={`fw-bold ${needRestock ? "text-warning" : "text-success"}`}>{needRestock}</span>
        </div>
      </div>
    </div>
  );
}