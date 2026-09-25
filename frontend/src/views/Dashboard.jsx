import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/layout/PageHeader.jsx";
import { fetchProducts, productImagePath } from "../api/productsApi.js";

const LOW_STOCK_THRESHOLD = 10;

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

        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header bg-white px-4 py-3"><h4 className="mb-0 h5">Sales Activity</h4></div>
            <div className="card-body d-flex align-items-center justify-content-center text-center py-5">
              <div><i className="ti ti-chart-line fs-1 text-muted"></i><p className="text-muted mb-0 mt-2">No sales data available yet.</p></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
