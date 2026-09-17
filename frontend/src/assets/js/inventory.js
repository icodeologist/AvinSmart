const API_BASE_URL = "http://localhost:8080/api/v1";

function formatPrice(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function productImagePath(product) {
  if (!product.image) {
    return "./assets/images/product-1.png";
  }

  if (product.image.startsWith("http") || product.image.startsWith("./")) {
    return product.image;
  }

  return `./assets/images/${product.image}`;
}

function renderProducts(products) {
  const tableBody = document.getElementById("inventoryTableBody");

  if (!products.length) {
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-secondary">No products found.</td></tr>';
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
          <td>${formatPrice(product.retail_price)}</td>
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

    renderProducts(data);
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">${error.message}</td></tr>`;
  }
}

if (document.getElementById("inventoryTableBody")) {
  loadProducts();
}
