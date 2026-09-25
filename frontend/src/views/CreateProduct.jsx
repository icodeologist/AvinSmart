import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import { createProduct } from "../api/productsApi.js";
import { fetchCategories } from "../api/categoriesApi.js";
import { fetchOutlets } from "../api/outletsApi.js";

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
  const { outletId } = useParams();
  const numericOutletId = Number(outletId);
  const formRef = useRef(null);
  const [validated, setValidated] = useState(false);
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [subCategory, setSubCategory] = useState("");
  const [alert, setAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [outlet, setOutlet] = useState(null);
  const [outletLoading, setOutletLoading] = useState(true);
  const [outletError, setOutletError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((data) => { if (!cancelled) setCategories(data); })
      .catch((error) => { if (!cancelled) setAlert({ type: "danger", message: error.message }); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!Number.isInteger(numericOutletId) || numericOutletId <= 0) {
      setOutletError("Select an outlet from Manage Outlets before adding a product.");
      setOutletLoading(false);
      return () => { cancelled = true; };
    }

    fetchOutlets()
      .then((outlets) => {
        if (cancelled) return;
        const selectedOutlet = outlets.find((item) => item.id === numericOutletId);
        if (!selectedOutlet) {
          setOutletError("This outlet is not available to your account.");
          return;
        }
        setOutlet(selectedOutlet);
      })
      .catch((error) => {
        if (!cancelled) setOutletError(error.message);
      })
      .finally(() => {
        if (!cancelled) setOutletLoading(false);
      });

    return () => { cancelled = true; };
  }, [numericOutletId]);

  function handleCategoryChange(event) {
    const value = event.target.value;
    setCategory(value);
    const selectedCategory = categories.find((item) => item.name === value);
    setSubCategories(selectedCategory ? selectedCategory.subCategories : []);
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

    if (!outlet || outlet.status !== "active") {
      setAlert({ type: "danger", message: "Select an active outlet before adding a product." });
      return;
    }

    setSubmitting(true);
    setAlert(null);

    try {
      await createProduct({
        outlet_id: outlet.id,
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

  if (outletLoading) {
    return <div className="alert alert-info">Loading outlet...</div>;
  }

  if (!outlet) {
    return (
      <>
        <PageHeader title="Add Product" subtitle="Products must be added from an outlet">
          <Link to="/outlets" className="btn btn-sm btn-outline-secondary">Back to Outlets</Link>
        </PageHeader>
        <div className="alert alert-danger" role="alert">{outletError}</div>
      </>
    );
  }

  if (outlet.status !== "active") {
    return (
      <>
        <PageHeader title={`Add Product to ${outlet.name}`} subtitle="Products can only be added to active outlets">
          <Link to={`/outlets/${outlet.id}`} className="btn btn-sm btn-outline-secondary">Back to Outlet</Link>
        </PageHeader>
        <div className="alert alert-warning" role="alert">This outlet is {outlet.status}. Activate it before adding products.</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={`Add Product to ${outlet.name}`} subtitle="This product will belong to the selected outlet">
        <Link to={`/outlets/${outlet.id}`} className="btn btn-sm btn-outline-secondary">
          <i className="ti ti-arrow-left"></i> Back to Outlet
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
                  {!categories.length ? (
                    <div className="form-text text-warning">
                      No categories are available yet. <Link to="/outlets/categories/add">Create a category in Manage Outlets</Link>, then return here.
                    </div>
                  ) : null}
                </div>
                <div className="mb-3">
                  <label htmlFor="productSubCategory" className="form-label">Subcategory</label>
                  <select className="form-select" id="productSubCategory" name="productSubCategory" required value={subCategory} onChange={(event) => setSubCategory(event.target.value)}>
                    <option value="">Select subcategory</option>
                    {subCategories.map((sub) => (
                      <option value={sub.name} key={sub.id || sub.name}>{sub.name}</option>
                    ))}
                  </select>
                  {!category ? <div className="form-text">Select a category to load its subcategories.</div> : null}
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
