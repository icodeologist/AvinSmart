const API_BASE_URL = "http://localhost:8080/api/v1";

const subCategoriesByCategory = {
  electronics: ["Mobile Phones", "Laptops", "Accessories"],
  clothing: ["Men", "Women", "Kids"],
  food: ["Snacks", "Beverages", "Groceries"],
};

function showAlert(element, type, message) {
  element.className = `alert alert-${type}`;
  element.textContent = message;
}

function setLoading(button, isLoading, label) {
  button.disabled = isLoading;
  button.textContent = isLoading ? "Please wait..." : label;
}

function fillSubCategoryOptions(categorySelect, subCategorySelect) {
  const subCategories = subCategoriesByCategory[categorySelect.value] || [];

  subCategorySelect.innerHTML = '<option value="">Select subcategory</option>';
  subCategories.forEach((subCategory) => {
    const option = document.createElement("option");
    option.value = subCategory;
    option.textContent = subCategory;
    subCategorySelect.appendChild(option);
  });
}

async function createProduct(payload) {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Could not create product");
  }

  return data;
}

const productForm = document.getElementById("addProductForm");
if (productForm) {
  const alert = document.getElementById("productAlert");
  const submitButton = document.getElementById("addProductSubmit");
  const categorySelect = document.getElementById("productCategory");
  const subCategorySelect = document.getElementById("productSubCategory");

  fillSubCategoryOptions(categorySelect, subCategorySelect);

  categorySelect.addEventListener("change", () => {
    fillSubCategoryOptions(categorySelect, subCategorySelect);
  });

  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    productForm.classList.add("was-validated");

    if (!productForm.checkValidity()) {
      return;
    }

    const imageInput = document.getElementById("productImage");

    setLoading(submitButton, true, "Add Product");

    try {
      await createProduct({
        title: document.getElementById("productName").value,
        sku_id: document.getElementById("productSKU").value,
        quantity: Number(document.getElementById("productStock").value),
        category_name: categorySelect.options[categorySelect.selectedIndex].text,
        sub_category_name: subCategorySelect.value,
        image: imageInput.files[0]?.name || "",
        description: document.getElementById("productDescription").value,
        unit: document.getElementById("productUnit").value,
        retail_price: Number(document.getElementById("productPrice").value),
        customer_display_price: Number(document.getElementById("productCustomerDisplayPrice").value),
        bought_price: Number(document.getElementById("productBoughtPrice").value),
        whole_sale_price: Number(document.getElementById("productWholeSalePrice").value),
      });

      showAlert(alert, "success", "Product created successfully.");
      productForm.reset();
      productForm.classList.remove("was-validated");
      fillSubCategoryOptions(categorySelect, subCategorySelect);
    } catch (error) {
      showAlert(alert, "danger", error.message);
    } finally {
      setLoading(submitButton, false, "Add Product");
    }
  });
}
