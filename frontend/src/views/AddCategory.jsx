import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";

export default function AddCategory() {
  const formRef = useRef(null);
  const [validated, setValidated] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    const form = formRef.current;
    if (!form.checkValidity()) {
      setValidated(true);
      return;
    }
    setValidated(false);
    setSuccess(true);
    form.reset();
    setTimeout(() => setSuccess(false), 3000);
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
              {success ? (
                <div className="alert alert-success py-2" role="alert">
                  <i className="ti ti-circle-check me-1"></i> Category added successfully!
                </div>
              ) : null}
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
                  <button type="submit" className="btn btn-primary">Add Category</button>
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