import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import { createProduct, subCategoriesByCategory } from "../api/productsApi.js";
import { fetchCategories } from "../api/categoriesApi.js";

function productImagesByCategory(category) {
  return subCategoriesByCategory[category] || [];
}

function readFileAsDataURI(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read product image"));
    reader.readAsDataURL(file);
  });
}

export default function CreateProduct() {
  const formRef = useRef(null);
  const [validated, setValidated] = useState(false);
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [subCategory, setSubCategory] = useState("");
  const [alert, setAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((data) => { if (!cancelled) setCategories(data); })
      .catch((error) => { if (!cancelled) setAlert({ type: "danger", message: error.message }); });
    return () => { cancelled = true; };
  }, []);

  function handleCategoryChange(event) {
    const value = event.target.value;
    setCategory(value);
    const selectedCategory = categories.find((item) => item.name === value);
    setSubCategories(selectedCategory ? selectedCategory.subCategories : productImagesByCategory(value).map((name) => ({ name })));
    setSubCategory("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = formRef.current;
    if (!form.checkValidity()) {
      setValidated(true);
      return;
    }

    const imageInput = form.productImage;

    setSubmitting(true);
    setAlert(null);

    try {
      await createProduct({
        title: form.productName.value,
        sku_id: form.productSKU.value,
        quantity: Number(form.productStock.value),
        category_name: category,
        sub_category_name: subCategory,
        description: form.productDescription.value,
        unit: form.productUnit.value,
        retail_price: form.productPrice.value,
        customer_display_price: form.productCustomerDisplayPrice.value || "0.00",
        bought_price: form.productBoughtPrice.value || "0.00",
        whole_sale_price: form.productWholeSalePrice.value || "0.00",
        image_base64: await readFileAsDataURI(imageInput.files[0]),
      });

      setAlert({ type: "success", message: "Product created successfully." });
      form.reset();
      setValidated(false);
      setCategory("");
      setSubCategories([]);
      setSubCategory("");
    } catch (error) {
      setAlert({ type: "danger", message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Add Inventory" subtitle="Manage your inventory items">
        <Link to="/inventory" className="btn btn-sm btn-primary">
          <i className="ti ti-box-seam"></i> Go to Inventory List
        </Link>
      </PageHeader>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body p-4">
              <form id="addProductForm" ref={formRef} noValidate className={validated ? "was-validated" : ""} onSubmit={handleSubmit}>
                {alert ? (
                  <div id="productAlert" className={`alert alert-${alert.type}`} role="alert">{alert.message}</div>
                ) : null}
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="productName" className="form-label">Product Name</label>
                    <input type="text" className="form-control" id="productName" name="productName" placeholder="Enter product name" required />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="productSKU" className="form-label">SKU</label>
                    <input type="text" className="form-control" id="productSKU" name="productSKU" placeholder="Enter SKU" required />
                  </div>
                </div>
                <div className="mb-3">
                  <label htmlFor="productUnit" className="form-label">Unit</label>
                  <input type="text" className="form-control" id="productUnit" name="productUnit" placeholder="e.g. pcs, kg, liter" />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="productBoughtPrice" className="form-label">Bought Price</label>
                    <input type="number" className="form-control" id="productBoughtPrice" name="productBoughtPrice" step="0.01" placeholder="0.00" />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="productWholeSalePrice" className="form-label">Whole Sale Price</label>
                    <input type="number" className="form-control" id="productWholeSalePrice" name="productWholeSalePrice" step="0.01" placeholder="0.00" />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="productPrice" className="form-label">Retail Price</label>
                    <input type="number" className="form-control" id="productPrice" name="productPrice" placeholder="0.00" step="0.01" required />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="productCustomerDisplayPrice" className="form-label">Customer Display Price</label>
                    <input type="number" className="form-control" id="productCustomerDisplayPrice" name="productCustomerDisplayPrice" step="0.01" placeholder="0.00" />
                  </div>
                </div>
                <div className="mb-3">
                  <label htmlFor="productStock" className="form-label">Stock Quantity</label>
                  <input type="number" className="form-control" id="productStock" name="productStock" placeholder="0" required />
                </div>
                <div className="mb-3">
                  <label htmlFor="productDescription" className="form-label">Description</label>
                  <textarea className="form-control" id="productDescription" name="productDescription" rows="4" placeholder="Enter product description"></textarea>
                </div>
                <div className="mb-3">
                  <label htmlFor="productCategory" className="form-label">Category</label>
                  <select className="form-select" id="productCategory" name="productCategory" required value={category} onChange={handleCategoryChange}>
                    <option value="">Select category</option>
                    {categories.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="productSubCategory" className="form-label">Subcategory</label>
                  <select className="form-select" id="productSubCategory" name="productSubCategory" required value={subCategory} onChange={(event) => setSubCategory(event.target.value)}>
                    <option value="">Select subcategory</option>
                    {subCategories.map((sub) => (
                      <option value={sub.name} key={sub.id || sub.name}>{sub.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="productImage" className="form-label">Product Image</label>
                  <input type="file" className="form-control" id="productImage" name="productImage" accept="image/*" required />
                </div>
                <div className="d-flex gap-2">
                  <button id="addProductSubmit" type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Please wait..." : "Add Product"}
                  </button>
                  <button type="reset" className="btn btn-secondary">Clear</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
