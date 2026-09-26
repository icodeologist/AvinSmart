import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/layout/PageHeader.jsx";
import { fetchProducts, productImagePath } from "../api/productsApi.js";

const LOW_STOCK_THRESHOLD = 10;
const DAIRY_STOCK_PRODUCTS = [
  { id: "dairy-buttermilk", title: "Nandini Buttermilk", sku_id: "NAN-BM-200", sub_category: { name: "Buttermilk" }, quantity: 4, unit: "packs" },
  { id: "dairy-curd", title: "Nandini Curd", sku_id: "NAN-CURD-400", sub_category: { name: "Curd" }, quantity: 8, unit: "cups" },
  { id: "dairy-paneer", title: "Amul Fresh Paneer", sku_id: "AMU-PAN-200", sub_category: { name: "Paneer" }, quantity: 13, unit: "packs" },
  { id: "dairy-butter", title: "Amul Butter", sku_id: "AMU-BUT-100", sub_category: { name: "Butter" }, quantity: 21, unit: "packs" },
  { id: "dairy-milk", title: "Nandini Toned Milk", sku_id: "NAN-MILK-500", sub_category: { name: "Milk" }, quantity: 40, unit: "packets" },
];

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

  function stockColor(quantity) {
    if (quantity <= 0) return "danger";
    if (quantity <= LOW_STOCK_THRESHOLD) return "warning";
    return "success";
  }

  return (
    <div className="card h-100 border-0 shadow-sm overflow-hidden">
      <div className="card-header bg-white d-flex justify-content-between align-items-center px-4 py-3 border-bottom-0">
        <div className="d-flex align-items-center gap-2"><span className="icon-shape icon-sm rounded-3 bg-info bg-opacity-10 text-info"><i className="ti ti-milk fs-5"></i></span><div><h4 className="mb-0 h6">Dairy essentials</h4><small className="text-muted">Low stock first</small></div></div>
        <span className="badge rounded-pill text-bg-light border">{dairyProducts.length} items</span>
      </div>
      <div className="card-body px-4 pb-4 pt-1">
        {!dairyProducts.length ? <div className="text-center py-4"><i className="ti ti-milk fs-1 text-muted"></i><p className="text-muted mb-0 mt-2">No Dairy products to show.</p></div>
          : <div className="vstack gap-2">
                {dairyProducts.map((product) => {
                  const quantity = Math.max(0, Number(product.quantity) || 0);
                  const percentage = Math.round((quantity / maxQuantity) * 100);
                  const color = stockColor(quantity);
                  return <div className="rounded-3 p-2 px-3 bg-light bg-opacity-50" key={product.id || product.sku_id}>
                    <div className="d-flex justify-content-between align-items-center gap-3">
                      <div className="min-w-0"><div className="fw-semibold small text-truncate" title={product.title}>{product.title}</div><small className="text-muted" style={{ fontSize: "0.72rem" }}>{product.sub_category?.name || "None"}</small></div>
                      <div className="text-end text-nowrap"><span className={`fw-semibold text-${color} small`}>{quantity} {product.unit || "units"}</span><small className="text-muted d-block" style={{ fontSize: "0.68rem" }}>{percentage}%</small></div>
                    </div>
                    <div className="progress mt-1" style={{ height: 4 }} role="progressbar" aria-label={`${product.title} stock level`} aria-valuenow={percentage} aria-valuemin="0" aria-valuemax="100"><div className={`progress-bar bg-${color}`} style={{ width: `${percentage}%` }}></div></div>
                  </div>;
                })}
              </div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((data) => { if (!cancelled) setProducts(data); })
      .catch((loadError) => { if (!cancelled) setError(loadError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const lowStock = useMemo(
    () => products
      .filter((product) => Number(product.quantity) <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => Number(a.quantity) - Number(b.quantity))
      .slice(0, 5),
    [products]
  );

  const stats = useMemo(() => ({
    products: products.length,
    units: products.reduce((total, product) => total + Math.max(0, Number(product.quantity) || 0), 0),
    lowStock: products.filter((product) => Number(product.quantity) > 0 && Number(product.quantity) <= LOW_STOCK_THRESHOLD).length,
    outOfStock: products.filter((product) => Number(product.quantity) <= 0).length,
  }), [products]);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live inventory overview" />

      <div className="row g-3 mb-3">
        <StatCard title="Products" value={stats.products} detail="From your inventory" color="primary" icon="ti ti-box-seam" />
        <StatCard title="Units in stock" value={stats.units} detail="Across all products" color="success" icon="ti ti-packages" />
        <StatCard title="Low stock" value={stats.lowStock} detail={`At or below ${LOW_STOCK_THRESHOLD} units`} color="warning" icon="ti ti-alert-triangle" />
        <StatCard title="Out of stock" value={stats.outOfStock} detail="Products needing stock" color="danger" icon="ti ti-package-off" />
      </div>

      <div className="row g-3">
        <div className="col-lg-6"><DairyStockMonitor products={DAIRY_STOCK_PRODUCTS} /></div>
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center px-4 py-3">
              <h4 className="mb-0 h5">Low Stock Products</h4>
            </div>
            <ul className="list-group list-group-flush">
              {loading ? <li className="list-group-item"><p className="text-center py-4 text-secondary mb-0">Loading products...</p></li>
                : error ? <li className="list-group-item"><p className="text-center py-4 text-danger mb-0">{error}</p></li>
                  : lowStock.length ? lowStock.map((product) => (
                    <li className="list-group-item d-flex align-items-center gap-3" key={product.id || product.sku_id}>
                      <img src={productImagePath(product)} className="rounded" width="48" height="48" style={{ objectFit: "cover" }} alt="" onError={(event) => { event.currentTarget.src = "/assets/images/product-1.png"; }} />
                      <div className="flex-grow-1"><p className="mb-1">{product.title}</p><small className="text-muted">SKU: {product.sku_id}</small></div>
                      <div className="text-end"><span className="fw-semibold text-primary">{product.quantity}</span><small className="text-muted d-block">In stock</small></div>
                    </li>
                  )) : <li className="list-group-item"><p className="text-center py-4 text-secondary mb-0">No low stock products.</p></li>}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
