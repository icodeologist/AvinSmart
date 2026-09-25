import { API_BASE_URL, getAdminToken, getPosToken, unwrap } from "./config.js";

export const subCategoriesByCategory = {
  electronics: ["Mobile Phones", "Laptops", "Accessories"],
  clothing: ["Men", "Women", "Kids"],
  food: ["Snacks", "Beverages", "Groceries"],
};

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
