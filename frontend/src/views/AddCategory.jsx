import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import {
  createCategory,
  createSubCategory,
  deleteCategory,
  deleteSubCategory,
  fetchCategories,
  updateCategory,
} from "../api/categoriesApi.js";

const emptyForm = { name: "", type: "" };

export default function AddCategory() {
  const [validated, setValidated] = useState(false);
  const [alert, setAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [categoryForm, setCategoryForm] = useState(emptyForm);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newSubcategory, setNewSubcategory] = useState("");
  const [submittingSubcategory, setSubmittingSubcategory] = useState(false);

  async function loadCategories() {
    setCategoriesLoading(true);
    setCategoriesError("");
    try {
      const data = await fetchCategories();
      setCategories(data);
      return data;
    } catch (error) {
      setCategoriesError(error.message);
      return [];
    } finally {
      setCategoriesLoading(false);
    }
  }

  useEffect(() => { loadCategories(); }, []);

  function resetForm() {
    setCategoryForm(emptyForm);
    setEditingCategory(null);
    setNewSubcategory("");
    setValidated(false);
  }

  function startEditing(category) {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, type: category.type });
    setNewSubcategory("");
    setAlert(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!categoryForm.name.trim() || !categoryForm.type) {
      setValidated(true);
      return;
    }

    setValidated(false);
    setSubmitting(true);
    setAlert(null);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm);
        setAlert({ type: "success", message: "Category updated successfully!" });
      } else {
        await createCategory(categoryForm);
        setAlert({ type: "success", message: "Category added successfully!" });
      }
      const data = await loadCategories();
      if (editingCategory) {
        setEditingCategory(data.find((item) => item.id === editingCategory.id) || null);
      } else {
        resetForm();
      }
    } catch (error) {
      setAlert({ type: "danger", message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddSubcategory(event) {
    event.preventDefault();
    if (!editingCategory || !newSubcategory.trim()) return;

    setSubmittingSubcategory(true);
    setAlert(null);
    try {
      await createSubCategory(editingCategory.id, newSubcategory);
      const data = await loadCategories();
      setEditingCategory(data.find((item) => item.id === editingCategory.id) || editingCategory);
      setNewSubcategory("");
      setAlert({ type: "success", message: "Subcategory added successfully!" });
    } catch (error) {
      setAlert({ type: "danger", message: error.message });
    } finally {
      setSubmittingSubcategory(false);
    }
  }

  async function handleDeleteSubcategory(subcategory) {
    if (!editingCategory || !window.confirm(`Delete subcategory “${subcategory.name}”?`)) return;

    setSubmittingSubcategory(true);
    setAlert(null);
    try {
      await deleteSubCategory(editingCategory.id, subcategory.id);
      const data = await loadCategories();
      setEditingCategory(data.find((item) => item.id === editingCategory.id) || editingCategory);
      setAlert({ type: "success", message: "Subcategory deleted successfully!" });
    } catch (error) {
      setAlert({ type: "danger", message: error.message });
    } finally {
      setSubmittingSubcategory(false);
    }
  }

  async function handleDeleteCategory(category) {
    if (!window.confirm(`Delete category “${category.name}”?`)) return;

    setAlert(null);
    try {
      await deleteCategory(category.id);
      if (editingCategory?.id === category.id) resetForm();
      await loadCategories();
      setAlert({ type: "success", message: "Category deleted successfully!" });
    } catch (error) {
      setAlert({ type: "danger", message: error.message });
    }
  }

  return (
    <>
      <PageHeader title={editingCategory ? "Edit Category" : "Add Category"} subtitle="Manage real product categories and subcategories">
        <Link to="/outlets" className="btn btn-primary"><i className="ti ti-arrow-left" /> Back to Manage Outlets</Link>
      </PageHeader>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body p-4">
              {alert ? <div className={`alert alert-${alert.type} py-2`} role="alert">{alert.message}</div> : null}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h2 className="h5 mb-1">{editingCategory ? `Edit ${editingCategory.name}` : "Create a category"}</h2>
                  <p className="small text-muted mb-0">Add the category first, then manage its subcategories while editing.</p>
                </div>
                {editingCategory ? <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetForm}>Cancel edit</button> : null}
              </div>
              <form id="addCategoryForm" noValidate className={validated ? "was-validated" : ""} onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="categoryName" className="form-label">Name</label>
                    <input type="text" className="form-control" id="categoryName" value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="Enter category name" required />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="categoryType" className="form-label">Category Type</label>
                    <select className="form-select" id="categoryType" value={categoryForm.type} onChange={(event) => setCategoryForm({ ...categoryForm, type: event.target.value })} required>
                      <option value="">Select category type</option>
                      <option value="product">Product</option>
                      <option value="service">Service</option>
                      <option value="material">Material</option>
                    </select>
                  </div>
                </div>
                <div className="d-flex gap-2 mt-3">
                  <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Saving..." : editingCategory ? "Save Changes" : "Add Category"}</button>
                  {!editingCategory ? <button type="button" className="btn btn-secondary" onClick={resetForm}>Clear</button> : null}
                </div>
              </form>

              {editingCategory ? (
                <div className="border-top mt-4 pt-4">
                  <h3 className="h6">Subcategories</h3>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {editingCategory.subCategories.length ? editingCategory.subCategories.map((subcategory) => (
                      <span className="badge text-bg-light border d-inline-flex align-items-center gap-2" key={subcategory.id}>
                        {subcategory.name}
                        <button type="button" className="btn-close" aria-label={`Delete ${subcategory.name}`} onClick={() => handleDeleteSubcategory(subcategory)} disabled={submittingSubcategory} />
                      </span>
                    )) : <span className="small text-muted">No subcategories yet.</span>}
                  </div>
                  <form className="row g-2 align-items-end" onSubmit={handleAddSubcategory}>
                    <div className="col-md-8">
                      <label htmlFor="newSubcategory" className="form-label">Add subcategory</label>
                      <input id="newSubcategory" className="form-control" value={newSubcategory} onChange={(event) => setNewSubcategory(event.target.value)} placeholder="e.g. Rice" required disabled={submittingSubcategory} />
                    </div>
                    <div className="col-md-4"><button type="submit" className="btn btn-outline-primary w-100" disabled={submittingSubcategory}>{submittingSubcategory ? "Saving..." : "Add Subcategory"}</button></div>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center bg-transparent px-4 py-3">
              <div><h2 className="h5 mb-1">Categories</h2><p className="small text-muted mb-0">Live categories from the product catalog.</p></div>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={loadCategories} disabled={categoriesLoading}><i className="ti ti-refresh me-1" />Refresh</button>
            </div>
            {categoriesError ? <div className="alert alert-danger rounded-0 mb-0" role="alert">{categoriesError}</div> : null}
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead className="table-light"><tr><th>ID</th><th>Category</th><th>Type</th><th>Subcategories</th><th className="text-end">Actions</th></tr></thead>
                <tbody>
                  {categoriesLoading ? <tr><td colSpan="5" className="text-center py-4 text-muted">Loading categories...</td></tr>
                    : !categories.length ? <tr><td colSpan="5" className="text-center py-4 text-muted">No categories found. Add the first category above.</td></tr>
                      : categories.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td className="fw-semibold">{item.name}</td>
                          <td><span className="badge text-bg-light border text-capitalize">{item.type}</span></td>
                          <td>
                            {item.subCategories.length ? (
                              <div className="d-flex flex-wrap gap-1">
                                {item.subCategories.map((sub) => <span className="badge text-bg-light border" key={sub.id}>{sub.name}</span>)}
                              </div>
                            ) : <span className="text-muted">None</span>}
                          </td>
                          <td className="text-end"><div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => startEditing(item)}>Edit</button><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteCategory(item)}>Delete</button></div></td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
