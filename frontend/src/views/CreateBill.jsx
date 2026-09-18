import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import { formatPrice } from "../api/productsApi.js";

const paymentMethods = ["Cash", "Card", "UPI", "Credit"];
const priceTiers = [{ value: "retail", label: "Retail price" }, { value: "wholesale", label: "Wholesale price" }];
const dummyProducts = [
  { id: 1, title: "Milk 1L", sku_id: "DUMMY-001", quantity: 40, unit: "pcs", retail_price: 60, customer_display_price: 70, bought_price: 48, whole_sale_price: 55 },
  { id: 2, title: "Milk 1L", sku_id: "DUMMY-002", quantity: 25, unit: "pcs", retail_price: 58, customer_display_price: 68, bought_price: 46, whole_sale_price: 53 },
  { id: 3, title: "Milk 1L", sku_id: "DUMMY-003", quantity: 18, unit: "pcs", retail_price: 55, customer_display_price: 65, bought_price: 44, whole_sale_price: 50 },
  { id: 4, title: "Bread 400g", sku_id: "DUMMY-004", quantity: 30, unit: "pack", retail_price: 35, customer_display_price: 42, bought_price: 27, whole_sale_price: 32 },
  { id: 5, title: "Rice 5kg", sku_id: "DUMMY-005", quantity: 12, unit: "bag", retail_price: 480, customer_display_price: 550, bought_price: 420, whole_sale_price: 460 },
];
const todayISO = () => new Date().toISOString().slice(0, 10);
const nextBillNumber = () => `BIL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
const money = (value) => formatPrice(value);
const price = (item, tier) => ({ retail: item.retailPrice, wholesale: item.wholeSalePrice, bought: item.boughtPrice, customer_display: item.customerDisplayPrice }[tier] || 0);

export default function CreateBill() {
  const formRef = useRef(null);
  const [validated, setValidated] = useState(false), [submitting, setSubmitting] = useState(false), [alert, setAlert] = useState(null);
  const [search, setSearch] = useState(""), [searching, setSearching] = useState(false), [products, setProducts] = useState([]), [searchError, setSearchError] = useState(""), [hasSearched, setHasSearched] = useState(false);
  const [billNumber, setBillNumber] = useState(nextBillNumber), [billDate, setBillDate] = useState(todayISO), [customerName, setCustomerName] = useState(""), [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]), [cashier, setCashier] = useState(""), [notes, setNotes] = useState(""), [priceTier, setPriceTier] = useState("retail"), [applyDiscount, setApplyDiscount] = useState(false), [taxRate, setTaxRate] = useState(0), [items, setItems] = useState([]);
  const [generatedBill, setGeneratedBill] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!search.trim()) { setProducts([]); setHasSearched(false); return; }
      setSearching(true); setSearchError("");
      const query = search.trim().toLowerCase();
      setProducts(dummyProducts.filter((product) => `${product.title} ${product.sku_id}`.toLowerCase().includes(query)).slice(0, 3));
      setHasSearched(true); setSearching(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [search]);

  const totals = items.reduce((result, item) => {
    const quantity = Number(item.quantity) || 0;
    result.retail += quantity * (Number(item.retailPrice) || 0); result.wholesale += quantity * (Number(item.wholeSalePrice) || 0);
    result.customerDisplay += quantity * (Number(item.customerDisplayPrice) || 0); return result;
  }, { retail: 0, wholesale: 0, customerDisplay: 0 });
  const selectedSubtotal = applyDiscount ? totals[priceTier] : totals.customerDisplay;
  const discount = applyDiscount ? Math.max(0, totals.customerDisplay - selectedSubtotal) : 0;
  const effectivePriceTier = applyDiscount ? priceTier : "customer_display";
  const tax = selectedSubtotal * (Number(taxRate) || 0) / 100;
  const total = Math.max(0, selectedSubtotal + tax);

  function addProduct(product) {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) return current.map((item) => item.productId === product.id ? { ...item, quantity: Number(item.quantity) + 1 } : item);
      return [...current, { id: `${product.id}-${Date.now()}`, productId: product.id, name: product.title, skuId: product.sku_id, quantity: 1, unit: product.unit || "pcs", retailPrice: product.retail_price, customerDisplayPrice: product.customer_display_price, boughtPrice: product.bought_price, wholeSalePrice: product.whole_sale_price }];
    });
    setSearch(""); setProducts([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!formRef.current.checkValidity()) { setValidated(true); return; }
    if (!items.length) { setAlert({ type: "danger", message: "Search and add at least one product." }); return; }
    setSubmitting(true); setAlert(null);
    try {
      // Prototype flow: keep this bill in the browser until the real API is connected.
      setGeneratedBill({ billNumber, billDate, customerName, customerPhone, items, customerDisplayTotal: totals.customerDisplay, selectedSubtotal, discount, tax, total, priceTier: effectivePriceTier });
    } catch (error) { setAlert({ type: "danger", message: error.message }); } finally { setSubmitting(false); }
  }

  if (generatedBill) {
    return <>
      <PageHeader title="Bill Generated" subtitle="Show this simple bill to your customer"><Link to="/" className="btn btn-sm btn-outline-secondary"><i className="ti ti-arrow-left"></i> Back to Dashboard</Link></PageHeader>
      <div className="card create-bill-page"><div className="card-header bg-white d-flex justify-content-between align-items-center px-4 py-3"><div><h3 className="h5 mb-1">Bill {generatedBill.billNumber}</h3><small className="text-muted">{generatedBill.billDate} · {generatedBill.customerName}</small></div><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setGeneratedBill(null)}><i className="ti ti-plus me-1"></i> Create another bill</button></div>
        <div className="table-responsive"><table className="table align-middle mb-0"><thead className="table-light"><tr><th>Purchased item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>{generatedBill.items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small className="d-block text-muted">{item.skuId}</small></td><td>{item.quantity}</td><td>{money(item.customerDisplayPrice)}</td><td>{money((Number(item.quantity) || 0) * price(item, generatedBill.priceTier))}</td></tr>)}</tbody></table></div>
        <div className="card-body"><div className="row justify-content-end"><div className="col-md-5"><div className="list-group"><div className="list-group-item d-flex justify-content-between"><span>Total</span><strong>{money(generatedBill.customerDisplayTotal)}</strong></div><div className="list-group-item d-flex justify-content-between"><span>Tax</span><span>{money(generatedBill.tax)}</span></div><div className="list-group-item d-flex justify-content-between"><strong>Total to pay</strong><strong className="text-primary fs-5">{money(generatedBill.total)}</strong></div></div><button type="button" className="btn btn-primary w-100 mt-3" onClick={() => window.print()}><i className="ti ti-printer me-1"></i> Print Bill</button></div></div></div>
      </div>
    </>;
  }

  return <>
    <PageHeader title="Create Bill" subtitle="Simple counter billing from your inventory"><Link to="/" className="btn btn-sm btn-outline-secondary"><i className="ti ti-arrow-left"></i> Back to Dashboard</Link></PageHeader>
    <form ref={formRef} noValidate className={`create-bill-page ${validated ? "was-validated" : ""}`} onSubmit={handleSubmit}>
      {alert && <div className={`alert alert-${alert.type}`} role="alert">{alert.message}</div>}
      <div className="card mb-3"><div className="card-header bg-white px-4 py-3"><h3 className="h5 mb-0"><i className="ti ti-user me-2"></i>Bill & Customer Information</h3></div><div className="card-body p-4"><div className="row g-3">
        <div className="col-md-4"><label className="form-label">Bill Number</label><input className="form-control" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} required /></div><div className="col-md-4"><label className="form-label">Bill Date</label><input type="date" className="form-control" value={billDate} onChange={(e) => setBillDate(e.target.value)} required /></div><div className="col-md-4"><label className="form-label">Payment Method</label><select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></div>
        <div className="col-md-6"><label className="form-label">Customer Name <span className="text-muted">(optional)</span></label><input className="form-control" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div><div className="col-md-6"><label className="form-label">Customer Phone</label><input className="form-control" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
      </div></div></div>
      <div className="card mb-3"><div className="card-header bg-white px-4 py-3"><h3 className="h5 mb-0"><i className="ti ti-search me-2"></i>Search Inventory</h3></div><div className="card-body p-4"><input className="form-control" placeholder="Search by product name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} />{searchError && <div className="text-danger small mt-2">{searchError}</div>}{searching && <div className="text-muted small mt-2">Searching...</div>}{!searching && hasSearched && !searchError && !products.length && <div className="text-muted small mt-2">No matching items found.</div>}{products.length > 0 && <div className="list-group mt-2">{products.slice(0, 3).map((product) => <button type="button" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center" key={product.id} onClick={() => addProduct(product)}><span><strong>{product.title}</strong><small className="d-block text-muted">SKU: {product.sku_id || "-"} · Stock: {product.quantity}</small></span><span className="text-end"><strong>{money(product.customer_display_price)}</strong><small className="d-block text-muted">Customer price</small></span></button>)}</div>}</div></div>
      <div className="card mb-3"><div className="card-header bg-white px-4 py-3"><h3 className="h5 mb-0"><i className="ti ti-shopping-cart me-2"></i>Bill Items</h3></div><div className="table-responsive"><table className="table mb-0 align-middle"><thead className="table-light"><tr><th>Product</th><th style={{ width: 90 }}>Qty</th><th>Price</th><th>Retail</th><th>Wholesale</th><th>Bought</th><th>Amount</th><th></th></tr></thead><tbody>{!items.length && <tr><td colSpan="8" className="text-center text-muted py-4">Search above to add products.</td></tr>}{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small className="d-block text-muted">{item.skuId}</small></td><td><input type="number" min="1" className="form-control form-control-sm" value={item.quantity} onChange={(e) => setItems(items.map((line) => line.id === item.id ? { ...line, quantity: e.target.value } : line))} required /></td><td>{money(item.customerDisplayPrice)} <small className="text-muted">/ {item.unit}</small></td><td>{money(item.retailPrice)}</td><td>{money(item.wholeSalePrice)}</td><td>{money(item.boughtPrice)}</td><td className="fw-semibold">{money((Number(item.quantity) || 0) * price(item, effectivePriceTier))}</td><td><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setItems(items.filter((line) => line.id !== item.id))}><i className="ti ti-trash"></i></button></td></tr>)}</tbody></table></div></div>
      <div className="row g-3"><div className="col-lg-5"><div className="card"><div className="card-body"><label className="form-label">Cashier</label><input className="form-control mb-3" value={cashier} onChange={(e) => setCashier(e.target.value)} /><label className="form-label">Notes</label><input className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} /></div></div></div><div className="col-lg-7"><div className="card"><div className="card-header bg-white px-4 py-3"><h3 className="h5 mb-0"><i className="ti ti-receipt-2 me-2"></i>Summary</h3></div><ul className="list-group list-group-flush">
        <li className="list-group-item d-flex justify-content-between"><span>Total</span><strong>{money(totals.customerDisplay)}</strong></li><li className="list-group-item d-flex justify-content-between align-items-center"><label htmlFor="applyDiscount">Apply discount</label><input id="applyDiscount" type="checkbox" className="form-check-input" checked={applyDiscount} onChange={(e) => setApplyDiscount(e.target.checked)} /></li><li className="list-group-item d-flex justify-content-between align-items-center"><label htmlFor="priceTier">Price basis</label><select id="priceTier" className="form-select form-select-sm w-auto" value={priceTier} onChange={(e) => setPriceTier(e.target.value)} disabled={!applyDiscount}>{priceTiers.map((tier) => <option key={tier.value} value={tier.value}>{tier.label}</option>)}</select></li><li className="list-group-item d-flex justify-content-between align-items-center"><label>Tax (%)</label><input type="number" min="0" step="0.01" className="form-control form-control-sm w-25 text-end" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></li><li className="list-group-item d-flex justify-content-between"><span>Tax amount</span><span>{money(tax)}</span></li><li className="list-group-item d-flex justify-content-between"><strong>Total</strong><strong className="text-primary fs-5">{money(total)}</strong></li>
      </ul><div className="card-footer bg-white"><button type="submit" className="btn btn-primary w-100" disabled={submitting}>{submitting ? "Saving..." : "Generate Bill"}</button></div></div></div></div>
    </form>
  </>;
}
