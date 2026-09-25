import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import { fetchOutlets } from "../api/outletsApi.js";
import { fetchProducts, formatPrice, productImagePath } from "../api/productsApi.js";
import { outletStatusBadge } from "../ui/format.jsx";

export default function OutletProducts() {
  const { outletId } = useParams();
  const numericOutletId = Number(outletId);
  const [outlet, setOutlet] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!Number.isInteger(numericOutletId) || numericOutletId <= 0) {
      setError("The selected outlet is invalid.");
      setLoading(false);
      return () => { cancelled = true; };
    }

    Promise.all([fetchOutlets(), fetchProducts("", numericOutletId)])
      .then(([outlets, outletProducts]) => {
        if (cancelled) return;
        const selectedOutlet = outlets.find((item) => item.id === numericOutletId);
        if (!selectedOutlet) {
          setError("This outlet is not available to your account.");
          return;
        }
        setOutlet(selectedOutlet);
        setProducts(outletProducts);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [numericOutletId]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => (
      [product.title, product.sku_id, product.category?.name, product.sub_category?.name]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query))
    ));
  }, [products, search]);

  if (loading) {
    return <div className="alert alert-info">Loading outlet products...</div>;
  }

  if (!outlet) {
    return (
      <>
        <PageHeader title="Outlet Products" subtitle="Choose an outlet before adding products">
          <Link to="/outlets" className="btn btn-sm btn-outline-secondary">Back to Outlets</Link>
        </PageHeader>
        <div className="alert alert-danger" role="alert">{error || "Outlet not found."}</div>
      </>
    );
  }

  const canAddProduct = outlet.status === "active";

  return (
    <>
      <PageHeader title={outlet.name} subtitle={`Products assigned to ${outlet.name}`}>
        <Link to="/outlets" className="btn btn-sm btn-outline-secondary">
          <i className="ti ti-arrow-left"></i> All Outlets
        </Link>
        {canAddProduct ? (
          <Link to={`/outlets/${outlet.id}/products/create`} className="btn btn-sm btn-primary">
            <i className="ti ti-plus"></i> Add Product
          </Link>
        ) : null}
      </PageHeader>

      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      <div className="d-flex align-items-center gap-2 mb-3">
        {outletStatusBadge(outlet.status)}
        <span className="text-muted">{products.length} product{products.length === 1 ? "" : "s"}</span>
      </div>
      {!canAddProduct ? (
        <div className="alert alert-warning" role="alert">
          Products can only be added to active outlets. Update this outlet status before adding inventory.
        </div>
      ) : null}

      <div className="card">
        <div className="card-header bg-transparent px-4 py-3">
          <input
            type="search"
            className="form-control"
            placeholder="Search products in this outlet..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="table-responsive">
          <table className="table mb-0 text-nowrap table-hover">
            <thead className="table-light">
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Retail Price</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {!filteredProducts.length ? (
                <tr><td colSpan={5} className="text-center py-4 text-secondary">No products found for this outlet.</td></tr>
              ) : filteredProducts.map((product) => (
                <tr className="align-middle" key={product.id || product.sku_id}>
                  <td>
                    <img
                      src={productImagePath(product)}
                      alt=""
                      className="avatar avatar-md rounded me-2"
                      onError={(event) => { event.currentTarget.src = "/assets/images/product-1.png"; }}
                    />
                    {product.title}
                  </td>
                  <td>{product.sku_id}</td>
                  <td>{product.category?.name || "-"}</td>
                  <td>{formatPrice(product.retail_price)}</td>
                  <td>{product.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
