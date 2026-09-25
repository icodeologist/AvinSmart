import { API_BASE_URL, getAdminToken, unwrap } from "./config.js";

function authHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalize(category) {
  return {
    id: category.id,
    name: category.name || "",
    type: category.type || "product",
    subCategories: (category.sub_categories || []).map((subCategory) => ({
      id: subCategory.id,
      name: subCategory.name || "",
    })),
  };
}

export async function fetchCategories() {
  const response = await fetch(`${API_BASE_URL}/categories`, { headers: authHeaders() });
  const body = await response.json().catch(() => ({}));
  const data = unwrap(body);
  if (!response.ok) throw new Error(data.error || "Could not fetch categories");
  return Array.isArray(data) ? data.map(normalize) : [];
}

export async function createCategory(category) {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      name: String(category.name || "").trim(),
      type: category.type || "product",
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Could not create category");
  return normalize(unwrap(body));
}

export async function createSubCategory(categoryId, name) {
  const response = await fetch(`${API_BASE_URL}/categories/${categoryId}/subcategories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name: String(name || "").trim() }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Could not create subcategory");
  return unwrap(body);
}

export async function updateCategory(id, category) {
  const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      name: String(category.name || "").trim(),
      type: category.type || "product",
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Could not update category");
  return normalize(unwrap(body));
}

export async function deleteCategory(id) {
  const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Could not delete category");
}

export async function deleteSubCategory(categoryId, subcategoryId) {
  const response = await fetch(`${API_BASE_URL}/categories/${categoryId}/subcategories/${subcategoryId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Could not delete subcategory");
}
