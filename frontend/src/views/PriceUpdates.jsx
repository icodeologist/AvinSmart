import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/layout/PageHeader.jsx";
import { fetchProducts, fetchRecentPriceHistory, formatPrice, updateProductPrices } from "../api/productsApi.js";

const emptyPrices = {
  quantity: "0",
  bought_price: "0.00",
  whole_sale_price: "0.00",
  retail_price: "0.00",
  customer_display_price: "0.00",
};

function priceForm(product) {
  return {
    quantity: String(product?.quantity ?? 0),
    bought_price: product?.bought_price || "0.00",
    whole_sale_price: product?.whole_sale_price || "0.00",
    retail_price: product?.retail_price || "0.00",
    customer_display_price: product?.customer_display_price || "0.00",
  };
}

function valuesEqual(oldValue, newValue) {
  return Number(oldValue) === Number(newValue);
}

function ComparisonRow({ label, oldValue, newValue, quantity = false }) {
  const changed = !valuesEqual(oldValue, newValue);
  return (
    <tr>
      <th scope="row" className="fw-normal text-muted">{label}</th>
      <td className="text-end">{quantity ? oldValue : formatPrice(oldValue)}</td>
      <td className={changed ? "text-end fw-semibold text-primary" : "text-end"}>{quantity ? newValue : formatPrice(newValue)}</td>
      <td className="text-end"><span className={`badge ${changed ? "text-bg-primary" : "text-bg-light border text-muted"}`}>{changed ? "Changed" : "Unchanged"}</span></td>
    </tr>
  );
}

function ComparisonTable({ change }) {
  return (
    <div className="table-responsive">
      <table className="table align-middle mb-0">
        <thead>
          <tr className="small text-muted">
            <th scope="col">Value</th>
            <th scope="col" className="text-end">Old</th>
            <th scope="col" className="text-end">New</th>
            <th scope="col" className="text-end">Status</th>
          </tr>
        </thead>
        <tbody>
          <ComparisonRow label="Bought Price" oldValue={change.old_bought_price} newValue={change.new_bought_price} />
          <ComparisonRow label="Wholesale Price" oldValue={change.old_wholesale_price} newValue={change.new_wholesale_price} />
          <ComparisonRow label="Retail Price" oldValue={change.old_retail_price} newValue={change.new_retail_price} />
          <ComparisonRow label="Customer Display Price" oldValue={change.old_customer_price} newValue={change.new_customer_price} />
          <ComparisonRow label="Inventory" oldValue={change.old_quantity} newValue={change.new_quantity} quantity />
        </tbody>
      </table>
    </div>
  );
}

function HistoryOverlay({ entry, onClose }) {
  if (!entry) return null;
  const change = entry.history;
  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={{ zIndex: 1080, background: "rgba(15, 23, 42, .45)" }} role="presentation" onMouseDown={onClose}>
      <div className="card shadow-lg w-100" style={{ maxWidth: 620 }} role="dialog" aria-modal="true" aria-labelledby="priceHistoryTitle" onMouseDown={(event) => event.stopPropagation()}>
        <div className="card-header bg-transparent d-flex justify-content-between align-items-start px-4 py-3">
          <div><h2 id="priceHistoryTitle" className="h5 mb-1">{entry.product.title}</h2><small className="text-muted">{entry.product.sku_id} · {entry.product.outlet?.name || "Outlet"}</small></div>
          <button type="button" className="btn-close" aria-label="Close price comparison" onClick={onClose} />
        </div>
        <div className="card-body p-4">
          <p className="small text-muted mb-3">Updated {new Date(change.changed_at).toLocaleString("en-IN")} by Admin #{change.actor_id}</p>
          <ComparisonTable change={change} />
        </div>
      </div>
    </div>
  );
}

export default function PriceUpdates() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [prices, setPrices] = useState(emptyPrices);
  const [recentHistory, setRecentHistory] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [historyFocus, setHistoryFocus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allOutlets, setAllOutlets] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refreshRecentHistory() {
    setRecentLoading(true);
    try {
      setRecentHistory(await fetchRecentPriceHistory());
    } catch (recentError) {
      setError(recentError.message);
    } finally {
      setRecentLoading(false);
    }
  }

  useEffect(() => { refreshRecentHistory(); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchProducts(search, "", "admin")
      .then((data) => { if (!cancelled) setProducts(data); })
      .catch((loadError) => { if (!cancelled) setError(loadError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search]);

  async function selectProduct(product) {
    setSelected(product);
    setPrices(priceForm(product));
    setNotice("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateProductPrices(selected.id, { ...prices, all_outlets: allOutlets });
      setSelected(updated);
      setPrices(priceForm(updated));
      setProducts((current) => current.map((product) => (product.id === updated.id ? updated : product)));
      await refreshRecentHistory();
      setNotice(`${allOutlets ? "Matching SKU prices across outlets" : "Product price"} updated. Future POS transactions will use the new prices; previous transactions remain unchanged.`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  const resultsLabel = useMemo(() => (search.trim() ? `Search results for “${search.trim()}”` : "Recent products"), [search]);

  return (
    <>
      <PageHeader title="Update Product" subtitle="Admin-only product price management and history" />
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {notice ? <div className="alert alert-success" role="alert">{notice}</div> : null}

      <div className="row g-4">
        <div className="col-xl-5">
          <div className="card h-100">
            <div className="card-header bg-transparent px-4 py-3"><h2 className="h5 mb-0">Find Product</h2></div>
            <div className="card-body p-4">
              <input type="search" className="form-control mb-3" placeholder="Search by product or SKU" value={search} onChange={(event) => setSearch(event.target.value)} autoFocus />
              <p className="small text-muted mb-2">{resultsLabel}</p>
              <div className="list-group">
                {loading ? <div className="text-muted small py-3">Loading products...</div> : !products.length ? <div className="text-muted small py-3">No products found.</div> : products.map((product) => (
                  <button type="button" className={`list-group-item list-group-item-action text-start ${selected?.id === product.id ? "border-primary shadow-sm" : ""}`} key={product.id} onClick={() => selectProduct(product)}>
                    <span className="d-flex justify-content-between gap-3"><strong>{product.title}</strong><span>{formatPrice(product.retail_price)}</span></span>
                    <small className={selected?.id === product.id ? "text-white-50" : "text-muted"}>{product.sku_id} · {product.outlet?.name || "Outlet"} · {product.quantity} in stock</small>
                  </button>
                ))}
              </div>
              <div className="border-top mt-4 pt-4">
                <div className="d-flex justify-content-between align-items-center mb-2"><h3 className="h6 mb-0">Price History</h3><span className="badge text-bg-light border">Top 5</span></div>
                <p className="small text-muted">Select an update to compare the previous and updated values.</p>
                {recentLoading ? <div className="small text-muted py-2">Loading history...</div> : !recentHistory.length ? <div className="small text-muted py-2">No price updates yet.</div> : (
                  <div className="list-group">
                    {recentHistory.map((entry) => (
                      <button type="button" className="list-group-item list-group-item-action text-start" key={entry.history.id} onClick={() => setHistoryFocus(entry)}>
                        <div className="d-flex justify-content-between gap-2"><strong>{entry.product.title}</strong><small className="text-muted">{new Date(entry.history.changed_at).toLocaleDateString("en-IN")}</small></div>
                        <small className="text-muted">{entry.product.sku_id} · {entry.product.outlet?.name || "Outlet"}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-7">
          <div className="card">
            <div className="card-header bg-transparent px-4 py-3"><h2 className="h5 mb-0">Update Prices</h2></div>
            <div className="card-body p-4">
              {!selected ? <p className="text-muted mb-0">Select a product to view and update its prices.</p> : (
                <>
                  <div className="mb-4"><h3 className="h4 mb-1">{selected.title}</h3><p className="small text-muted mb-0">{selected.sku_id} · {selected.outlet?.name || "Outlet"}</p></div>
                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      {[["bought_price", "Bought Price"], ["whole_sale_price", "Wholesale Price"], ["retail_price", "Retail Price"], ["customer_display_price", "Customer Display Price"]].map(([field, label]) => (
                        <div className="col-md-6" key={field}>
                          <label className="form-label" htmlFor={`price-${field}`}>{label}</label>
                          <div className="input-group"><span className="input-group-text">₹</span><input id={`price-${field}`} type="number" min="0" step="0.01" className="form-control" value={prices[field]} onChange={(event) => setPrices({ ...prices, [field]: event.target.value })} required /></div>
                        </div>
                      ))}
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="price-quantity">Inventory Quantity</label>
                        <input id="price-quantity" type="number" min="0" step="1" className="form-control" value={prices.quantity} onChange={(event) => setPrices({ ...prices, quantity: event.target.value })} required />
                      </div>
                    </div>
                    <div className="form-check mt-4">
                      <input id="priceUpdateAllOutlets" type="checkbox" className="form-check-input" checked={allOutlets} onChange={(event) => setAllOutlets(event.target.checked)} disabled={saving} />
                      <label className="form-check-label" htmlFor="priceUpdateAllOutlets">Update this SKU and stock across all outlets</label>
                      <small className="form-text text-muted d-block">Every matching SKU will receive these prices, stock quantity, and its own history entry.</small>
                    </div>
                    <button type="submit" className="btn btn-primary mt-4" disabled={saving}>{saving ? "Updating..." : "Update Prices"}</button>
                  </form>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
      <HistoryOverlay entry={historyFocus} onClose={() => setHistoryFocus(null)} />
    </>
  );
}
