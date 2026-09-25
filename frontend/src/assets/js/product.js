const API_BASE_URL = window.__AVINSMART_API_BASE_URL__ || "/api/v1";

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

async function createProduct(formData) {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: "POST",
    body: formData,
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
      const formData = new FormData();
      formData.append("title", document.getElementById("productName").value);
      formData.append("sku_id", document.getElementById("productSKU").value);
      formData.append("quantity", document.getElementById("productStock").value);
      formData.append("category_name", categorySelect.options[categorySelect.selectedIndex].text);
      formData.append("sub_category_name", subCategorySelect.value);
      formData.append("description", document.getElementById("productDescription").value);
      formData.append("unit", document.getElementById("productUnit").value);
      formData.append("retail_price", document.getElementById("productPrice").value);
      formData.append("customer_display_price", document.getElementById("productCustomerDisplayPrice").value);
      formData.append("bought_price", document.getElementById("productBoughtPrice").value);
      formData.append("whole_sale_price", document.getElementById("productWholeSalePrice").value);
      if (imageInput.files[0]) {
        formData.append("image", imageInput.files[0]);
      }

      await createProduct(formData);

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
