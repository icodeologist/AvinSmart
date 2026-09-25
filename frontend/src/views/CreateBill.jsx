import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import { fetchProducts } from "../api/productsApi.js";
import { createBill, quoteBill } from "../api/billsApi.js";

const paymentMethods = ["Cash", "Card", "UPI", "Credit"];
const priceTiers = [{ value: "retail", label: "Retail price" }, { value: "wholesale", label: "Wholesale price" }, { value: "customer_display", label: "Customer display price" }];
const todayISO = () => new Date().toISOString().slice(0, 10);
const nextBillNumber = () => `BIL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
const money = (value) => `₹${value ?? "0.00"}`;

export default function CreateBill() {
  const formRef = useRef(null);
  const [validated, setValidated] = useState(false), [submitting, setSubmitting] = useState(false), [alert, setAlert] = useState(null);
  const [search, setSearch] = useState(""), [searching, setSearching] = useState(false), [products, setProducts] = useState([]), [searchError, setSearchError] = useState(""), [hasSearched, setHasSearched] = useState(false);
  const [billNumber, setBillNumber] = useState(nextBillNumber), [billDate, setBillDate] = useState(todayISO), [customerName, setCustomerName] = useState(""), [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]), [cashier, setCashier] = useState(""), [notes, setNotes] = useState(""), [priceTier, setPriceTier] = useState("retail"), [applyDiscount, setApplyDiscount] = useState(false), [discount, setDiscount] = useState("0.00"), [taxRate, setTaxRate] = useState("0"), [items, setItems] = useState([]);
  const [quote, setQuote] = useState(null), [quoteLoading, setQuoteLoading] = useState(false), [generatedBill, setGeneratedBill] = useState(null);

  useEffect(() => {
    if (!search.trim()) { setProducts([]); setHasSearched(false); return undefined; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true); setSearchError("");
      try {
        const results = await fetchProducts(search);
        if (!cancelled) { setProducts(results.slice(0, 3)); setHasSearched(true); }
      } catch (error) {
        if (!cancelled) { setProducts([]); setSearchError(error.message); setHasSearched(true); }
      } finally { if (!cancelled) setSearching(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search]);

  useEffect(() => {
    if (!items.length) { setQuote(null); return undefined; }
    let active = true;
    setQuoteLoading(true);
    quoteBill({ priceTier, taxRate, discount: applyDiscount ? discount : "0.00", items })
      .then((data) => { if (active) { setQuote(data); setAlert(null); } })
      .catch((error) => { if (active) setAlert({ type: "danger", message: error.message }); })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [items, priceTier, taxRate, discount, applyDiscount]);

  function addProduct(product) {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) return current.map((item) => item.productId === product.id ? { ...item, quantity: Number(item.quantity) + 1 } : item);
      return [...current, { id: `${product.id}-${Date.now()}`, productId: product.id, name: product.title, skuId: product.sku_id, quantity: 1, unit: product.unit || "pcs" }];
    });
    setSearch(""); setProducts([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!formRef.current.checkValidity()) { setValidated(true); return; }
    if (!items.length) { setAlert({ type: "danger", message: "Search and add at least one product." }); return; }
    setSubmitting(true); setAlert(null);
    try {
      const savedBill = await createBill({ billNumber, billDate, customerName, customerPhone, paymentMethod: paymentMethod.toLowerCase(), cashier, priceTier, items, taxRate, discount: applyDiscount ? discount : "0.00", notes });
      setGeneratedBill({ ...savedBill, billNumber, billDate, customerName, customerPhone });
    } catch (error) { setAlert({ type: "danger", message: error.message }); }
    finally { setSubmitting(false); }
  }

  if (generatedBill) {
    return <>
      <PageHeader title="Bill Generated" subtitle="Show this simple bill to your customer"><Link to="/" className="btn btn-sm btn-outline-secondary"><i className="ti ti-arrow-left"></i> Back to Dashboard</Link></PageHeader>
      <div className="card create-bill-page"><div className="card-header bg-white d-flex justify-content-between align-items-center px-4 py-3"><div><h3 className="h5 mb-1">Bill {generatedBill.bill_number}</h3><small className="text-muted">{generatedBill.bill_date} · {generatedBill.customer_name}</small></div><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setGeneratedBill(null)}><i className="ti ti-plus me-1"></i> Create another bill</button></div>
        <div className="table-responsive"><table className="table align-middle mb-0"><thead className="table-light"><tr><th>Purchased item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>{(generatedBill.items || []).map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small className="d-block text-muted">{item.sku_id}</small></td><td>{item.quantity}</td><td>{money(item.unit_price)}</td><td>{money(item.amount)}</td></tr>)}</tbody></table></div>
        <div className="card-body"><div className="row justify-content-end"><div className="col-md-5"><div className="list-group"><div className="list-group-item d-flex justify-content-between"><span>Subtotal</span><strong>{money(generatedBill.subtotal)}</strong></div><div className="list-group-item d-flex justify-content-between"><span>Tax</span><span>{money(generatedBill.tax_amount)}</span></div><div className="list-group-item d-flex justify-content-between"><span>Discount</span><span>{money(generatedBill.discount)}</span></div><div className="list-group-item d-flex justify-content-between"><strong>Total to pay</strong><strong className="text-primary fs-5">{money(generatedBill.total)}</strong></div></div><button type="button" className="btn btn-primary w-100 mt-3" onClick={() => window.print()}><i className="ti ti-printer me-1"></i> Print Bill</button></div></div></div>
      </div>
    </>;
  }

  const lines = Object.fromEntries((quote?.lines || []).map((line) => [line.product_id, line]));
  return <>
    <PageHeader title="Create Bill" subtitle="Simple counter billing from your inventory"><Link to="/" className="btn btn-sm btn-outline-secondary"><i className="ti ti-arrow-left"></i> Back to Dashboard</Link></PageHeader>
    <form ref={formRef} noValidate className={`create-bill-page ${validated ? "was-validated" : ""}`} onSubmit={handleSubmit}>
      <div className="alert alert-warning" role="status">This is the legacy invoice flow. Use the staff POS for new operational sales; existing invoice integrations remain supported while they migrate to the orders API.</div>
      {alert && <div className={`alert alert-${alert.type}`} role="alert">{alert.message}</div>}
      <div className="card mb-3"><div className="card-header bg-white px-4 py-3"><h3 className="h5 mb-0"><i className="ti ti-user me-2"></i>Bill & Customer Information</h3></div><div className="card-body p-4"><div className="row g-3"><div className="col-md-4"><label className="form-label">Bill Number</label><input className="form-control" value={billNumber} onChange={(event) => setBillNumber(event.target.value)} required /></div><div className="col-md-4"><label className="form-label">Bill Date</label><input type="date" className="form-control" value={billDate} onChange={(event) => setBillDate(event.target.value)} required /></div><div className="col-md-4"><label className="form-label">Payment Method</label><select className="form-select" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></div><div className="col-md-6"><label className="form-label">Customer Name <span className="text-muted">(optional)</span></label><input className="form-control" value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></div><div className="col-md-6"><label className="form-label">Customer Phone</label><input className="form-control" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></div></div></div></div>
      <div className="card mb-3"><div className="card-header bg-white px-4 py-3"><h3 className="h5 mb-0"><i className="ti ti-search me-2"></i>Search Inventory</h3></div><div className="card-body p-4"><input className="form-control" placeholder="Search by product name or SKU" value={search} onChange={(event) => setSearch(event.target.value)} />{searchError && <div className="text-danger small mt-2">{searchError}</div>}{searching && <div className="text-muted small mt-2">Searching...</div>}{!searching && hasSearched && !searchError && !products.length && <div className="text-muted small mt-2">No matching items found.</div>}{products.length > 0 && <div className="list-group mt-2">{products.map((product) => <button type="button" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center" key={product.id} onClick={() => addProduct(product)}><span><strong>{product.title}</strong><small className="d-block text-muted">SKU: {product.sku_id || "-"} · Stock: {product.quantity}</small></span></button>)}</div>}</div></div>
      <div className="card mb-3"><div className="card-header bg-white px-4 py-3"><h3 className="h5 mb-0"><i className="ti ti-shopping-cart me-2"></i>Bill Items</h3></div><div className="table-responsive"><table className="table mb-0 align-middle"><thead className="table-light"><tr><th>Product</th><th style={{ width: 90 }}>Qty</th><th>Price</th><th>Amount</th><th></th></tr></thead><tbody>{!items.length && <tr><td colSpan="5" className="text-center text-muted py-4">Search above to add products.</td></tr>}{items.map((item) => { const line = lines[item.productId]; return <tr key={item.id}><td><strong>{item.name}</strong><small className="d-block text-muted">{item.skuId}</small></td><td><input type="number" min="1" className="form-control form-control-sm" value={item.quantity} onChange={(event) => setItems(items.map((current) => current.id === item.id ? { ...current, quantity: event.target.value } : current))} required /></td><td>{line ? money(line.unit_price) : "Calculating..."}</td><td className="fw-semibold">{line ? money(line.amount) : "—"}</td><td><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setItems(items.filter((current) => current.id !== item.id))}><i className="ti ti-trash"></i></button></td></tr>; })}</tbody></table></div></div>
      <div className="row g-3"><div className="col-lg-5"><div className="card"><div className="card-body"><label className="form-label">Cashier</label><input className="form-control mb-3" value={cashier} onChange={(event) => setCashier(event.target.value)} /><label className="form-label">Notes</label><input className="form-control" value={notes} onChange={(event) => setNotes(event.target.value)} /></div></div></div><div className="col-lg-7"><div className="card"><div className="card-header bg-white px-4 py-3"><h3 className="h5 mb-0"><i className="ti ti-receipt-2 me-2"></i>Summary</h3></div><ul className="list-group list-group-flush"><li className="list-group-item d-flex justify-content-between align-items-center"><label htmlFor="priceTier">Price basis</label><select id="priceTier" className="form-select form-select-sm w-auto" value={priceTier} onChange={(event) => setPriceTier(event.target.value)}>{priceTiers.map((tier) => <option key={tier.value} value={tier.value}>{tier.label}</option>)}</select></li><li className="list-group-item d-flex justify-content-between align-items-center"><label htmlFor="applyDiscount">Apply discount</label><input id="applyDiscount" type="checkbox" className="form-check-input" checked={applyDiscount} onChange={(event) => setApplyDiscount(event.target.checked)} /></li>{applyDiscount && <li className="list-group-item d-flex justify-content-between align-items-center"><label htmlFor="discount">Discount (₹)</label><input id="discount" type="number" min="0" step="0.01" className="form-control form-control-sm w-25 text-end" value={discount} onChange={(event) => setDiscount(event.target.value)} /></li>}<li className="list-group-item d-flex justify-content-between align-items-center"><label htmlFor="taxRate">Tax (%)</label><input id="taxRate" type="number" min="0" step="0.01" className="form-control form-control-sm w-25 text-end" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} /></li><li className="list-group-item d-flex justify-content-between"><span>Subtotal</span><strong>{quoteLoading ? "Calculating..." : money(quote?.subtotal)}</strong></li><li className="list-group-item d-flex justify-content-between"><span>Tax amount</span><span>{money(quote?.tax_amount)}</span></li><li className="list-group-item d-flex justify-content-between"><strong>Total</strong><strong className="text-primary fs-5">{money(quote?.total)}</strong></li></ul><div className="card-footer bg-white"><button type="submit" className="btn btn-primary w-100" disabled={submitting || quoteLoading || !quote}>{submitting ? "Saving..." : "Generate Bill"}</button></div></div></div></div>
    </form>
  </>;
}
