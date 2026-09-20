import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import { createCategory } from "../api/categoriesApi.js";

export default function AddCategory() {
  const formRef = useRef(null);
  const [validated, setValidated] = useState(false);
  const [alert, setAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = formRef.current;
    if (!form.checkValidity()) {
      setValidated(true);
      return;
    }
    setValidated(false);
    setSubmitting(true);
    setAlert(null);
    try {
      await createCategory({ name: form.categoryName.value, type: form.categoryType.value });
      setAlert({ type: "success", message: "Category added successfully!" });
      form.reset();
    } catch (error) {
      setAlert({ type: "danger", message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Add Category" subtitle="Create product categories for your inventory">
        <Link to="/inventory" className="btn btn-primary">
          Go to Inventory List
        </Link>
      </PageHeader>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body p-4">
              {alert ? <div className={`alert alert-${alert.type} py-2`} role="alert">{alert.message}</div> : null}
              <form id="addCategoryForm" ref={formRef} noValidate className={validated ? "was-validated" : ""} onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="categoryName" className="form-label">Name</label>
                    <input type="text" className="form-control" id="categoryName" name="categoryName" placeholder="Enter category name" required />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="categoryType" className="form-label">Category Type</label>
                    <select className="form-select" id="categoryType" name="categoryType" required>
                      <option value="">Select category type</option>
                      <option value="product">Product</option>
                      <option value="service">Service</option>
                      <option value="material">Material</option>
                    </select>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Saving..." : "Add Category"}</button>
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
