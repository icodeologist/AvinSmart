import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

const products = [
  { id: 1, name: "Milk 1L", category: "Dairy", customerPrice: 70, retailPrice: 60, wholesalePrice: 55, image: "/assets/images/product-1.png" },
  { id: 2, name: "Bread 400g", category: "Bakery", customerPrice: 42, retailPrice: 35, wholesalePrice: 32, image: "/assets/images/product-2.png" },
  { id: 3, name: "Rice 5kg", category: "Grocery", customerPrice: 550, retailPrice: 480, wholesalePrice: 460, image: "/assets/images/product-3.png" },
  { id: 4, name: "Simple Tea", category: "Beverages", customerPrice: 25, retailPrice: 20, wholesalePrice: 18, image: "/assets/images/product-4.png" },
  { id: 5, name: "Cooking Oil 1L", category: "Grocery", customerPrice: 145, retailPrice: 130, wholesalePrice: 120, image: "/assets/images/product-5.png" },
  { id: 6, name: "Biscuits", category: "Snacks", customerPrice: 35, retailPrice: 30, wholesalePrice: 27, image: "/assets/images/product-6.png" },
  { id: 7, name: "Curd 500g", category: "Dairy", customerPrice: 38, retailPrice: 32, wholesalePrice: 29, image: "/assets/images/product-7.png" },
  { id: 8, name: "Juice 1L", category: "Beverages", customerPrice: 110, retailPrice: 95, wholesalePrice: 88, image: "/assets/images/product-8.png" },
];
const categories = ["All", "Dairy", "Bakery", "Grocery", "Beverages", "Snacks"];
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const selectedPrice = (product, tier) => tier === "wholesale" ? product.wholesalePrice : tier === "retail" ? product.retailPrice : product.customerPrice;

export default function PosPage() {
  const navigate = useNavigate();
  const staff = JSON.parse(sessionStorage.getItem("avinSmartPosStaff") || "null");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [priceTier, setPriceTier] = useState("original");
  const [notice, setNotice] = useState("");

  const visibleProducts = products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()) && (category === "All" || product.category === category));
  const customerTotal = cart.reduce((sum, item) => sum + item.customerPrice * item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + selectedPrice(item, priceTier) * item.quantity, 0);
  const discount = Math.max(0, customerTotal - subtotal);
  const total = subtotal;

  function addToCart(product) {
    setCart((current) => current.some((item) => item.id === product.id) ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }]);
  }
  function changeQuantity(id, amount) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item));
  }
  function payNow() {
    if (!cart.length) return;
    setNotice(`Payment recorded for ${money(total)} (demo only).`);
    setCart([]); setPriceTier("original");
  }
  function logout() { sessionStorage.removeItem("avinSmartPosStaff"); navigate("/pos/login"); }

  if (!staff) return <Navigate to="/pos/login" replace />;

  return <main className="pos-shell"><header className="pos-topbar"><div className="avin-logo" aria-label="AvinSmart"><span className="avin-logo__avin"><span className="avin-logo__a">A</span>vin</span><span className="avin-logo__smart"><span className="avin-logo__s">S</span>mart</span><span className="pos-label">POS</span></div><div className="pos-staff"><span><strong>{staff.name}</strong><small>Staff counter</small></span><button type="button" className="btn btn-sm btn-outline-secondary" onClick={logout}>Logout</button></div></header><div className="pos-workspace"><section className="pos-catalog"><div className="pos-search-row"><div className="input-group input-group-lg"><span className="input-group-text"><i className="ti ti-search"></i></span><input className="form-control" placeholder="Search product or scan barcode" value={search} onChange={(event) => setSearch(event.target.value)} /></div><button type="button" className="btn btn-outline-secondary btn-lg"><i className="ti ti-barcode me-1"></i>Scan</button></div><div className="pos-categories">{categories.map((item) => <button type="button" key={item} className={`btn ${category === item ? "btn-primary" : "btn-light"}`} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="pos-product-grid">{visibleProducts.map((product) => <button type="button" className="pos-product-card" key={product.id} onClick={() => addToCart(product)}><img src={product.image} alt="" /><span className="pos-product-name">{product.name}</span><strong>{money(product.customerPrice)}</strong><small className="text-muted">Price</small></button>)}</div></section><aside className="pos-cart"><div className="pos-cart-header"><div><h1>Current order</h1><small>{cart.length} product{cart.length === 1 ? "" : "s"}</small></div><button type="button" className="btn btn-sm btn-light" onClick={() => setCart([])}>Clear</button></div><div className="pos-cart-items">{cart.length ? cart.map((item) => <div className="pos-cart-item" key={item.id}><div><strong>{item.name}</strong><small>{money(item.customerPrice)} each</small></div><div className="pos-quantity"><button type="button" onClick={() => changeQuantity(item.id, -1)}>−</button><span>{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)}>+</button></div><strong>{money(item.customerPrice * item.quantity)}</strong></div>) : <div className="pos-empty-cart"><i className="ti ti-shopping-cart"></i><p>Add products to start an order.</p></div>}</div><div className="pos-summary"><div><label htmlFor="posPriceTier">Discount price</label><select id="posPriceTier" className="form-select form-select-sm" value={priceTier} onChange={(event) => setPriceTier(event.target.value)}><option value="original">Original price</option><option value="retail">Retail price</option><option value="wholesale">Wholesale price</option></select></div><div><span>Price</span><strong>{money(customerTotal)}</strong></div><div><span>Discount</span><strong className="text-success">- {money(discount)}</strong></div><div className="pos-total"><span>Total</span><strong>{money(total)}</strong></div><button type="button" className="btn btn-success btn-lg w-100" onClick={payNow} disabled={!cart.length}>Pay Now <span>{money(total)}</span></button>{notice && <div className="alert alert-success mt-3 mb-0 py-2">{notice}</div>}</div></aside></div></main>;
}
