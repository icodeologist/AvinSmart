const API_BASE_URL = "http://localhost:8080/api/v1";

let allProducts = [];

function formatPrice(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function productImagePath(product) {
  if (!product.image) {
    return "./assets/images/product-1.png";
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

  return `./assets/images/${product.image}`;
}

function populateCategoryFilter() {
  const categoryFilter = document.getElementById("categoryFilter");
  if (!categoryFilter) return;

  const current = categoryFilter.value;
  const categories = [...new Set(allProducts.map((p) => p.category?.name).filter(Boolean))];

  categoryFilter.innerHTML = '<option value="">All Categories</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  if (categories.includes(current)) {
    categoryFilter.value = current;
  }
}

function applyFilters() {
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");

  const query = (searchInput?.value || "").trim().toLowerCase();
  const category = categoryFilter?.value || "";

  const filtered = allProducts.filter((product) => {
    const matchesCategory = !category || product.category?.name === category;

    const matchesSearch =
      !query ||
      [product.title, product.sku_id, product.category?.name, product.sub_category?.name]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query));

    return matchesCategory && matchesSearch;
  });

  renderProducts(filtered);
}

function renderProducts(products) {
  const tableBody = document.getElementById("inventoryTableBody");

  if (!products.length) {
    tableBody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-secondary">No products found.</td></tr>';
    return;
  }

  tableBody.innerHTML = products
    .map((product) => {
      const category = product.category?.name || "-";
      const subCategory = product.sub_category?.name || "-";
      const unit = product.unit || "pcs";

      return `
        <tr class="align-middle">
          <td>
            <a href="#">
              <img src="${productImagePath(product)}" alt="" class="avatar avatar-md rounded" onerror="this.src='./assets/images/product-1.png'" />
              <span class="ms-3">${product.title}</span>
            </a>
          </td>
          <td>${product.sku_id}</td>
          <td>${category}</td>
          <td>${subCategory}</td>
          <td>${formatPrice(product.bought_price)}</td>
          <td>${formatPrice(product.whole_sale_price)}</td>
          <td>${formatPrice(product.retail_price)}</td>
          <td>${formatPrice(product.customer_display_price)}</td>
          <td>${unit}</td>
          <td>${product.quantity}</td>
          <td>
            <a href="#"><i class="ti ti-edit"></i></a>
            <a href="#" class="link-danger"><i class="ti ti-trash ms-2"></i></a>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function loadProducts() {
  const tableBody = document.getElementById("inventoryTableBody");

  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data.error || "Could not fetch products");
    }

    allProducts = data;
    populateCategoryFilter();
    renderProducts(data);
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-danger">${error.message}</td></tr>`;
  }
}

if (document.getElementById("inventoryTableBody")) {
  loadProducts();
}

if (document.getElementById("searchInput")) {
  document.getElementById("searchInput").addEventListener("input", applyFilters);
}

if (document.getElementById("categoryFilter")) {
  document.getElementById("categoryFilter").addEventListener("change", applyFilters);
}
