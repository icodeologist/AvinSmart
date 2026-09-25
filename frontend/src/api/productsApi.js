import { API_BASE_URL, getAdminToken, getPosToken, unwrap } from "./config.js";

export function formatPrice(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

export function productImagePath(product) {
  if (!product.image) {
    return "/assets/images/product-1.png";
  }

  if (product.image.startsWith("http")) {
    return product.image;
  }

  if (product.image.startsWith("/static/")) {
    return new URL(API_BASE_URL, window.location.origin).origin + product.image;
  }

  if (product.image.startsWith("./")) {
    return product.image;
  }

  return `/assets/images/${product.image}`;
}

function authHeaders(session) {
  const token = session === "pos" ? getPosToken() : getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchProducts(search = "", outletId = "", session = "admin") {
  try {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (outletId) params.set("outlet_id", String(outletId));
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(`${API_BASE_URL}/products${query}`, { headers: authHeaders(session) });
    const data = unwrap(await response.json().catch(() => []));

    if (!response.ok) {
      throw new Error(data.error || "Could not fetch products");
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error(`Could not fetch products: ${error.message}`);
    }
    throw error;
  }
}

export async function createProduct(formData) {
  try {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders("admin") },
      body: JSON.stringify(formData),
    });

    const data = unwrap(await response.json().catch(() => ({})));

    if (!response.ok) {
      throw new Error(data.error || "Could not create product");
    }

    return data;
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error(`Could not create product: ${error.message}`);
    }
    throw error;
  }
}

export async function updateProductPrices(productId, prices) {
  const response = await fetch(`${API_BASE_URL}/products/${productId}/prices`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders("admin") },
    body: JSON.stringify({
      quantity: Number(prices.quantity || 0),
      retail_price: String(prices.retail_price || "0.00"),
      customer_display_price: String(prices.customer_display_price || "0.00"),
      bought_price: String(prices.bought_price || "0.00"),
      whole_sale_price: String(prices.whole_sale_price || "0.00"),
      all_outlets: Boolean(prices.all_outlets),
    }),
  });
  const body = await response.json().catch(() => ({}));
  const data = unwrap(body);
  if (!response.ok) throw new Error(data.error || "Could not update product prices");
  return data;
}

export async function fetchProductPriceHistory(productId) {
  const response = await fetch(`${API_BASE_URL}/products/${productId}/price-history`, { headers: authHeaders("admin") });
  const body = await response.json().catch(() => ({}));
  const data = unwrap(body);
  if (!response.ok) throw new Error(data.error || "Could not fetch price history");
  return Array.isArray(data) ? data : [];
}

export async function fetchRecentPriceHistory() {
  const response = await fetch(`${API_BASE_URL}/products/price-history/recent`, { headers: authHeaders("admin") });
  const body = await response.json().catch(() => ({}));
  const data = unwrap(body);
  if (!response.ok) throw new Error(data.error || "Could not fetch recent price history");
  return Array.isArray(data) ? data : [];
}
