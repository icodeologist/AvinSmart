import { API_BASE_URL, unwrap } from "./config.js";

export const subCategoriesByCategory = {
  electronics: ["Mobile Phones", "Laptops", "Accessories"],
  clothing: ["Men", "Women", "Kids"],
  food: ["Snacks", "Beverages", "Groceries"],
};

export function formatPrice(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function productImagePath(product) {
  if (!product.image) {
    return "/assets/images/product-1.png";
  }

  if (product.image.startsWith("http")) {
    return product.image;
  }

  if (product.image.startsWith("/static/")) {
    return new URL(API_BASE_URL).origin + product.image;
  }

  if (product.image.startsWith("./")) {
    return product.image;
  }

  return `/assets/images/${product.image}`;
}

export async function fetchProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
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
      body: formData,
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