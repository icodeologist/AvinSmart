import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import { fetchProducts, formatPrice, productImagePath } from "../api/productsApi.js";
import { getPosToken } from "../api/config.js";

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchProducts("", "", getPosToken() ? "pos" : "admin")
      .then((data) => {
        if (cancelled) return;
        setProducts(data);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category?.name).filter(Boolean))],
    [products]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = !category || product.category?.name === category;
      const matchesSearch =
        !query ||
        [product.title, product.sku_id, product.category?.name, product.sub_category?.name]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [products, search, category]);

  return (
    <>
      <PageHeader title="Inventory" subtitle="Manage your product inventory">
        <Link to="/outlets" className="btn btn-sm btn-primary">
          <i className="ti ti-building-store"></i> Select Outlet to Add Product
        </Link>
      </PageHeader>

      <div className="row">
        <div className="col-12">
          <div className="d-flex gap-2 mb-3 flex-wrap justify-content-between">
            <div className="d-flex gap-2 flex-wrap">
              <input
                type="text"
                id="searchInput"
                className="form-control form-control-sm"
                placeholder="Search products..."
                style={{ maxWidth: 250 }}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                id="categoryFilter"
                className="form-select form-select-sm"
                style={{ maxWidth: 180 }}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((name) => (
                  <option value={name} key={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-secondary">
                <i className="ti ti-file-excel"></i> Excel
              </button>
              <button className="btn btn-sm btn-outline-secondary">
                <i className="ti ti-file-pdf"></i> PDF
              </button>
            </div>
          </div>

          <div className="card table-responsive">
            <table className="table mb-0 text-nowrap table-hover">
              <thead className="table-light border-light">
                <tr>
                  <th>Image</th>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Subcategory</th>
                  <th>Bought Price</th>
                  <th>Whole Sale</th>
                  <th>Retail Price</th>
                  <th>Customer Display</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="inventoryTableBody">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="text-center py-4 text-secondary">Loading products...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={11} className="text-center py-4 text-danger">{error}</td>
                  </tr>
                ) : !filtered.length ? (
                  <tr>
                    <td colSpan={11} className="text-center py-4 text-secondary">No products found.</td>
                  </tr>
                ) : (
                  filtered.map((product) => (
                    <tr className="align-middle" key={product.id || product.sku_id}>
                      <td>
                        <a href="#">
                          <img
                            src={productImagePath(product)}
                            alt=""
                            className="avatar avatar-md rounded"
                            onError={(event) => { event.currentTarget.src = "/assets/images/product-1.png"; }}
                          />
                          <span className="ms-3">{product.title}</span>
                        </a>
                      </td>
                      <td>{product.sku_id}</td>
                      <td>{product.category?.name || "-"}</td>
                      <td>{product.sub_category?.name || "-"}</td>
                      <td>{formatPrice(product.bought_price)}</td>
                      <td>{formatPrice(product.whole_sale_price)}</td>
                      <td>{formatPrice(product.retail_price)}</td>
                      <td>{formatPrice(product.customer_display_price)}</td>
                      <td>{product.unit || "pcs"}</td>
                      <td>{product.quantity}</td>
                      <td>
                        <a href="#"><i className="ti ti-edit"></i></a>
                        <a href="#" className="link-danger"><i className="ti ti-trash ms-2"></i></a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td className="border-bottom-0">Showing product per page</td>
                  <td colSpan={10} className="border-bottom-0">
                    <nav aria-label="Page navigation" className="d-flex justify-content-end">
                      <ul className="pagination mb-0">
                        <li className="page-item disabled">
                          <a className="page-link" href="#">Previous</a>
                        </li>
                        <li className="page-item active"><a className="page-link" href="#">1</a></li>
                        <li className="page-item"><a className="page-link" href="#">2</a></li>
                        <li className="page-item"><a className="page-link" href="#">3</a></li>
                        <li className="page-item">
                          <a className="page-link" href="#">Next</a>
                        </li>
                      </ul>
                    </nav>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
