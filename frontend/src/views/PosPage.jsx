import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { fetchProducts, productImagePath } from "../api/productsApi.js";
import { createOrder, quoteOrder, recordPayment } from "../api/ordersApi.js";

const money = (value) => `₹${value ?? "0.00"}`;

function normalizeProduct(product) {
  return {
    id: product.id,
    name: product.title,
    category: product.category?.name || "Other",
    customerPrice: product.customer_display_price || "0.00",
    quantityInStock: Number(product.quantity || 0),
    image: productImagePath(product),
  };
}

function PosHeader({ staff, onLogout }) {
  return (
    <header className="pos-topbar">
      <div className="avin-logo" aria-label="AvinSmart">
        <span className="avin-logo__avin"><span className="avin-logo__a">A</span>vin</span>
        <span className="avin-logo__smart"><span className="avin-logo__s">S</span>mart</span>
        <span className="pos-label">POS</span>
      </div>

      <div className="pos-staff">
        <span>
          <strong>{staff.name}</strong>
          <small>{staff.role || "Staff"} counter</small>
        </span>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

function ProductCatalog({ products, categories, category, search, loading, error, onSearch, onCategory, onAdd }) {
  const visibleProducts = products.filter((product) => (
    product.name.toLowerCase().includes(search.toLowerCase())
    && (category === "All" || product.category === category)
  ));

  return (
    <section className="pos-catalog">
      <div className="pos-search-row">
        <div className="input-group input-group-lg">
          <span className="input-group-text"><i className="ti ti-search" /></span>
          <input
            className="form-control"
            placeholder="Search product or scan barcode"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>
        <button type="button" className="btn btn-outline-secondary btn-lg" disabled>
          <i className="ti ti-barcode me-1" />
          Scan
        </button>
      </div>

      <div className="pos-categories">
        {categories.map((item) => (
          <button
            type="button"
            key={item}
            className={`btn ${category === item ? "btn-primary" : "btn-light"}`}
            onClick={() => onCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {loading && <div className="alert alert-info">Loading products...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="pos-product-grid">
        {visibleProducts.map((product) => (
          <button
            type="button"
            className="pos-product-card"
            key={product.id}
            onClick={() => onAdd(product)}
            disabled={!product.quantityInStock}
          >
            <img src={product.image} alt="" />
            <span className="pos-product-name">{product.name}</span>
            <strong>{money(product.customerPrice)}</strong>
            <small className="text-muted">
              {product.quantityInStock ? `${product.quantityInStock} in stock` : "Out of stock"}
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}

function CartItems({ cart, quote, onChangeQuantity }) {
  if (!cart.length) {
    return (
      <div className="pos-empty-cart">
        <i className="ti ti-shopping-cart" />
        <p>Add products to start an order.</p>
      </div>
    );
  }

  const lines = Object.fromEntries((quote?.lines || []).map((line) => [line.product_id, line]));

  return cart.map((item) => {
    const line = lines[item.id];

    return (
      <div className="pos-cart-item" key={item.id}>
        <div>
          <strong>{item.name}</strong>
          <small>{line ? `${money(line.unit_price)} each` : "Calculating price..."}</small>
        </div>

        <div className="pos-quantity">
          <button type="button" onClick={() => onChangeQuantity(item.id, -1)}>−</button>
          <span>{item.quantity}</span>
          <button type="button" onClick={() => onChangeQuantity(item.id, 1)}>+</button>
        </div>

        <strong>{line ? money(line.amount) : "—"}</strong>
      </div>
    );
  });
}

function PaymentSummary({
  priceTier,
  quote,
  paymentMethod,
  paymentAmount,
  amountDue,
  pendingOrderId,
  submitting,
  notice,
  error,
  onPriceTier,
  onPaymentMethod,
  onPaymentAmount,
  onPay,
}) {
  return (
    <div className="pos-summary">
      <div>
        <label htmlFor="posPriceTier">Price tier</label>
        <select
          id="posPriceTier"
          className="form-select form-select-sm"
          value={priceTier}
          onChange={(event) => onPriceTier(event.target.value)}
          disabled={Boolean(pendingOrderId)}
        >
          <option value="original">Original price</option>
          <option value="retail">Retail price</option>
          <option value="wholesale">Wholesale price</option>
        </select>
      </div>

      <div>
        <label htmlFor="posPaymentMethod">Payment</label>
        <select
          id="posPaymentMethod"
          className="form-select form-select-sm"
          value={paymentMethod}
          onChange={(event) => onPaymentMethod(event.target.value)}
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
        </select>
      </div>

      <div>
        <label htmlFor="posPaymentAmount">Amount to pay</label>
        <input
          id="posPaymentAmount"
          type="number"
          min="0.01"
          max={amountDue || undefined}
          step="0.01"
          className="form-control form-control-sm"
          value={paymentAmount}
          placeholder={money(amountDue)}
          onChange={(event) => onPaymentAmount(event.target.value)}
        />
      </div>

      <div>
        <span>Subtotal</span>
        <strong>{money(quote?.subtotal)}</strong>
      </div>
      <div>
        <span>Discount</span>
        <strong className="text-success">- {money(quote?.discount)}</strong>
      </div>
      <div className="pos-total">
        <span>{pendingOrderId ? "Remaining" : "Total"}</span>
        <strong>{money(amountDue)}</strong>
      </div>

      <button type="button" className="btn btn-success btn-lg w-100" onClick={onPay} disabled={submitting}>
        {submitting ? "Processing..." : "Pay Now"}
        <span>{money(amountDue)}</span>
      </button>

      {notice && <div className="alert alert-success mt-3 mb-0 py-2">{notice}</div>}
      {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
    </div>
  );
}

function CartPanel({
  cart,
  priceTier,
  paymentMethod,
  paymentAmount,
  amountDue,
  quote,
  pendingOrderId,
  submitting,
  notice,
  error,
  onClear,
  onChangeQuantity,
  onPriceTier,
  onPaymentMethod,
  onPaymentAmount,
  onPay,
}) {
  return (
    <aside className="pos-cart">
      <div className="pos-cart-header">
        <div>
          <h1>Current order</h1>
          <small>{cart.length} product{cart.length === 1 ? "" : "s"}</small>
        </div>
        <button type="button" className="btn btn-sm btn-light" onClick={onClear}>Clear</button>
      </div>

      <div className="pos-cart-items">
        <CartItems cart={cart} quote={quote} onChangeQuantity={onChangeQuantity} />
      </div>

      <PaymentSummary
        priceTier={priceTier}
        paymentMethod={paymentMethod}
        paymentAmount={paymentAmount}
        amountDue={amountDue}
        quote={quote}
        pendingOrderId={pendingOrderId}
        submitting={submitting}
        notice={notice}
        error={error}
        onPriceTier={onPriceTier}
        onPaymentMethod={onPaymentMethod}
        onPaymentAmount={onPaymentAmount}
        onPay={onPay}
      />
    </aside>
  );
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
  const [pendingAmountDue, setPendingAmountDue] = useState(0);
  const [quote, setQuote] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    fetchProducts()
      .then((data) => {
        if (active) setProducts(data.map(normalizeProduct));
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(products.map((product) => product.category))],
    [products]
  );
  useEffect(() => {
    if (!cart.length || pendingOrderId) {
      setQuote(null);
      return undefined;
    }
    let active = true;
    const backendTier = priceTier === "original" ? "customer_display" : priceTier;
    quoteOrder({ items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })), priceTier: backendTier })
      .then((data) => { if (active) setQuote(data); })
      .catch((quoteError) => { if (active) setError(quoteError.message); });
    return () => { active = false; };
  }, [cart, priceTier, pendingOrderId]);

  const amountDue = pendingOrderId ? pendingAmountDue : quote?.total;

  function addToCart(product) {
    setError("");
    setCart((current) => current.some((item) => item.id === product.id)
      ? current.map((item) => item.id === product.id
        ? { ...item, quantity: Math.min(product.quantityInStock, item.quantity + 1) }
        : item)
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
      let due = amountDue;

      if (!orderId) {
        const backendTier = priceTier === "original" ? "customer_display" : priceTier;
        const order = await createOrder({
          items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
          priceTier: backendTier,
          cashier: staff.name || staff.email,
        });
        orderId = order.id;
        due = order.amount_due;
        setPendingOrderId(orderId);
        setPendingAmountDue(due);
      }

      const amount = paymentAmount || due;
      const result = await recordPayment(orderId, { amount, method: paymentMethod });
      const remaining = result.order?.amount_due || "0.00";
      setPaymentAmount("");

      if (remaining !== "0.00") {
        setPendingAmountDue(remaining);
        setNotice(`Payment recorded. Remaining balance: ${money(remaining)}.`);
      } else {
        setNotice(`Payment recorded for ${money(amount)}. Order is fully paid.`);
        setCart([]);
        setPendingOrderId(null);
        setPendingAmountDue(0);
        setPriceTier("original");
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function clearOrder() {
    setCart([]);
    setPendingOrderId(null);
    setPendingAmountDue(0);
    setPaymentAmount("");
    setQuote(null);
  }

  function logout() {
    sessionStorage.removeItem("avinSmartPosStaff");
    localStorage.removeItem("token");
    navigate("/pos/login");
  }

  if (!staff) return <Navigate to="/pos/login" replace />;

  return (
    <main className="pos-shell">
      <PosHeader staff={staff} onLogout={logout} />

      <div className="pos-workspace">
        <ProductCatalog
          products={products}
          categories={categories}
          category={category}
          search={search}
          loading={loading}
          error={error}
          onSearch={setSearch}
          onCategory={setCategory}
          onAdd={addToCart}
        />

        <CartPanel
          cart={cart}
          priceTier={priceTier}
          paymentMethod={paymentMethod}
          paymentAmount={paymentAmount}
          amountDue={amountDue}
          quote={quote}
          pendingOrderId={pendingOrderId}
          submitting={submitting}
          notice={notice}
          error={error}
          onClear={clearOrder}
          onChangeQuantity={changeQuantity}
          onPriceTier={setPriceTier}
          onPaymentMethod={setPaymentMethod}
          onPaymentAmount={setPaymentAmount}
          onPay={payNow}
        />
      </div>
    </main>
  );
}
