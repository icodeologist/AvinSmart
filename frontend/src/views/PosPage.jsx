import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { fetchProducts, productImagePath } from "../api/productsApi.js";
import { createOrder, recordPayment } from "../api/ordersApi.js";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const selectedPrice = (product, tier) => tier === "wholesale" ? product.wholesalePrice : tier === "retail" ? product.retailPrice : product.customerPrice;

function normalizeProduct(product) {
  return {
    id: product.id,
    name: product.title,
    category: product.category?.name || "Other",
    customerPrice: Number(product.customer_display_price || 0),
    retailPrice: Number(product.retail_price || 0),
    wholesalePrice: Number(product.whole_sale_price || 0),
    quantityInStock: Number(product.quantity || 0),
    image: productImagePath(product),
  };
}

export default function PosPage() {
  const navigate = useNavigate();
  const staff = JSON.parse(sessionStorage.getItem("avinSmartPosStaff") || "null");
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [priceTier, setPriceTier] = useState("original");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetchProducts()
      .then((data) => { if (active) setProducts(data.map(normalizeProduct)); })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => ["All", ...new Set(products.map((product) => product.category))], [products]);
  const visibleProducts = products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()) && (category === "All" || product.category === category));
  const customerTotal = cart.reduce((sum, item) => sum + item.customerPrice * item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + selectedPrice(item, priceTier) * item.quantity, 0);
  const discount = Math.max(0, customerTotal - subtotal);
  const total = subtotal;

  function addToCart(product) {
    setError("");
    setCart((current) => current.some((item) => item.id === product.id)
      ? current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(product.quantityInStock, item.quantity + 1) } : item)
      : [...current, { ...product, quantity: 1 }]);
  }

  function changeQuantity(id, amount) {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== id) return [item];
      const quantity = item.quantity + amount;
      return quantity <= 0 ? [] : [{ ...item, quantity: Math.min(item.quantityInStock, quantity) }];
    }));
  }

  async function payNow() {
    if (!cart.length || submitting) return;
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      let orderId = pendingOrderId;
      if (!orderId) {
        const backendTier = priceTier === "original" ? "customer_display" : priceTier;
        const order = await createOrder({
          items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
          priceTier: backendTier,
          cashier: staff.name || staff.email,
        });
        orderId = order.id;
        setPendingOrderId(orderId);
      }
      await recordPayment(orderId, { amount: total, method: paymentMethod });
      setNotice(`Payment recorded for ${money(total)}.`);
      setCart([]);
      setPendingOrderId(null);
      setPriceTier("original");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("avinSmartPosStaff");
    localStorage.removeItem("token");
    navigate("/pos/login");
  }

  if (!staff) return <Navigate to="/pos/login" replace />;

  return <main className="pos-shell"><header className="pos-topbar"><div className="avin-logo" aria-label="AvinSmart"><span className="avin-logo__avin"><span className="avin-logo__a">A</span>vin</span><span className="avin-logo__smart"><span className="avin-logo__s">S</span>mart</span><span className="pos-label">POS</span></div><div className="pos-staff"><span><strong>{staff.name}</strong><small>{staff.role || "Staff"} counter</small></span><button type="button" className="btn btn-sm btn-outline-secondary" onClick={logout}>Logout</button></div></header><div className="pos-workspace"><section className="pos-catalog"><div className="pos-search-row"><div className="input-group input-group-lg"><span className="input-group-text"><i className="ti ti-search"></i></span><input className="form-control" placeholder="Search product or scan barcode" value={search} onChange={(event) => setSearch(event.target.value)} /></div><button type="button" className="btn btn-outline-secondary btn-lg" disabled><i className="ti ti-barcode me-1"></i>Scan</button></div><div className="pos-categories">{categories.map((item) => <button type="button" key={item} className={`btn ${category === item ? "btn-primary" : "btn-light"}`} onClick={() => setCategory(item)}>{item}</button>)}</div>{loading && <div className="alert alert-info">Loading products...</div>}{error && <div className="alert alert-danger">{error}</div>}<div className="pos-product-grid">{visibleProducts.map((product) => <button type="button" className="pos-product-card" key={product.id} onClick={() => addToCart(product)} disabled={!product.quantityInStock}><img src={product.image} alt="" /><span className="pos-product-name">{product.name}</span><strong>{money(product.customerPrice)}</strong><small className="text-muted">{product.quantityInStock ? `${product.quantityInStock} in stock` : "Out of stock"}</small></button>)}</div></section><aside className="pos-cart"><div className="pos-cart-header"><div><h1>Current order</h1><small>{cart.length} product{cart.length === 1 ? "" : "s"}</small></div><button type="button" className="btn btn-sm btn-light" onClick={() => { setCart([]); setPendingOrderId(null); }}>Clear</button></div><div className="pos-cart-items">{cart.length ? cart.map((item) => <div className="pos-cart-item" key={item.id}><div><strong>{item.name}</strong><small>{money(selectedPrice(item, priceTier))} each</small></div><div className="pos-quantity"><button type="button" onClick={() => changeQuantity(item.id, -1)}>−</button><span>{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)}>+</button></div><strong>{money(selectedPrice(item, priceTier) * item.quantity)}</strong></div>) : <div className="pos-empty-cart"><i className="ti ti-shopping-cart"></i><p>Add products to start an order.</p></div>}</div><div className="pos-summary"><div><label htmlFor="posPriceTier">Price tier</label><select id="posPriceTier" className="form-select form-select-sm" value={priceTier} onChange={(event) => setPriceTier(event.target.value)}><option value="original">Original price</option><option value="retail">Retail price</option><option value="wholesale">Wholesale price</option></select></div><div><label htmlFor="posPaymentMethod">Payment</label><select id="posPaymentMethod" className="form-select form-select-sm" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option></select></div><div><span>Price</span><strong>{money(customerTotal)}</strong></div><div><span>Discount</span><strong className="text-success">- {money(discount)}</strong></div><div className="pos-total"><span>Total</span><strong>{money(total)}</strong></div><button type="button" className="btn btn-success btn-lg w-100" onClick={payNow} disabled={!cart.length || submitting}>{submitting ? "Processing..." : "Pay Now"} <span>{money(total)}</span></button>{notice && <div className="alert alert-success mt-3 mb-0 py-2">{notice}</div>}{error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}</div></aside></div></main>;
}
