import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader.jsx";
import { createBill } from "../api/billsApi.js";

const paymentMethods = ["Cash", "Card", "UPI", "Credit"];
const units = ["pcs", "kg", "L", "packets"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nextBillNumber() {
  return `BIL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function CreateBill() {
  const formRef = useRef(null);
  const [validated, setValidated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const [billNumber, setBillNumber] = useState(() => nextBillNumber());
  const [billDate, setBillDate] = useState(() => todayISO());
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
  const [cashier, setCashier] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState([
    { id: Date.now(), name: "", quantity: 1, unit: units[0], unitPrice: "" },
  ]);
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice) || 0),
    0
  );
  const tax = (subtotal * Number(taxRate)) / 100;
  const total = Math.max(0, subtotal + tax - (Number(discount) || 0));

  function updateItem(id, field, value) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { id: Date.now(), name: "", quantity: 1, unit: units[0], unitPrice: "" }]);
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = formRef.current;

    if (!form.checkValidity()) {
      setValidated(true);
      return;
    }

    if (!items.some((item) => String(item.name || "").trim())) {
      setAlert({ type: "danger", message: "Add at least one item with a name." });
      return;
    }

    setSubmitting(true);
    setAlert(null);

    try {
      const created = await createBill({
        billNumber,
        billDate,
        customerName,
        customerPhone,
        paymentMethod,
        cashier,
        notes,
        items: items.map((item) => ({
          ...item,
          amount: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        })),
        subtotal,
        taxRate,
        discount,
        total,
      });

      setAlert({
        type: "success",
        message: `Bill ${created?.bill_number || billNumber} saved successfully, total ${formatMoney(total)}.`,
      });
    } catch (error) {
      setAlert({ type: "danger", message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Create Bill" subtitle="Create a custom bill for your customer">
        <Link to="/" className="btn btn-sm btn-outline-secondary">
          <i className="ti ti-arrow-left"></i> Back to Dashboard
        </Link>
      </PageHeader>

      <form
        id="createBillForm"
        ref={formRef}
        noValidate
        className={validated ? "was-validated" : ""}
        onSubmit={handleSubmit}
      >
        {alert ? (
          <div className={`alert alert-${alert.type}`} role="alert">{alert.message}</div>
        ) : null}

        <div className="card mb-3">
          <div className="card-header bg-white px-4 py-3">
            <h3 className="h5 mb-0"><i className="ti ti-user me-2"></i>Bill & Customer Information</h3>
          </div>
          <div className="card-body p-4">
            <div className="row g-3">
              <div className="col-md-4 mb-3">
                <label htmlFor="billNumber" className="form-label">Bill Number</label>
                <input
                  type="text"
                  className="form-control"
                  id="billNumber"
                  value={billNumber}
                  onChange={(event) => setBillNumber(event.target.value)}
                  required
                />
              </div>
              <div className="col-md-4 mb-3">
                <label htmlFor="billDate" className="form-label">Bill Date</label>
                <input
                  type="date"
                  className="form-control"
                  id="billDate"
                  value={billDate}
                  onChange={(event) => setBillDate(event.target.value)}
                  required
                />
              </div>
              <div className="col-md-4 mb-3">
                <label htmlFor="paymentMethod" className="form-label">Payment Method</label>
                <select
                  className="form-select"
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="customerName" className="form-label">Customer Name</label>
                <input
                  type="text"
                  className="form-control"
                  id="customerName"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="customerPhone" className="form-label">Customer Phone</label>
                <input
                  type="tel"
                  className="form-control"
                  id="customerPhone"
                  placeholder="Enter customer phone"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="cashier" className="form-label">Cashier</label>
                <input
                  type="text"
                  className="form-control"
                  id="cashier"
                  placeholder="Enter cashier name"
                  value={cashier}
                  onChange={(event) => setCashier(event.target.value)}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="notes" className="form-label">Notes</label>
                <input
                  type="text"
                  className="form-control"
                  id="notes"
                  placeholder="Optional note on the bill"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header d-flex justify-content-between align-items-center bg-white px-4 py-3">
            <h3 className="h5 mb-0"><i className="ti ti-shopping-cart me-2"></i>Bill Items</h3>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={addItem}>
              <i className="ti ti-plus"></i> Add Item
            </button>
          </div>
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead className="table-light border-light">
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Item Name</th>
                  <th style={{ width: 120 }}>Qty</th>
                  <th style={{ width: 130 }}>Unit</th>
                  <th style={{ width: 140 }}>Unit Price</th>
                  <th style={{ width: 120 }}>Amount</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="text-muted">{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Item name"
                        value={item.name}
                        onChange={(event) => updateItem(item.id, "name", event.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-control form-control-sm text-end"
                        value={item.quantity}
                        onChange={(event) => updateItem(item.id, "quantity", event.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={item.unit}
                        onChange={(event) => updateItem(item.id, "unit", event.target.value)}
                      >
                        {units.map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control form-control-sm text-end"
                        placeholder="0.00"
                        value={item.unitPrice}
                        onChange={(event) => updateItem(item.id, "unitPrice", event.target.value)}
                        required
                      />
                    </td>
                    <td className="text-end fw-semibold">
                      {formatMoney((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length <= 1}
                        title="Remove item"
                      >
                        <i className="ti ti-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-lg-4 offset-lg-8">
            <div className="card mb-3">
              <div className="card-header bg-white px-4 py-3">
                <h3 className="h5 mb-0"><i className="ti ti-receipt-2 me-2"></i>Summary</h3>
              </div>
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between align-items-center px-4">
                  <span className="text-secondary">Subtotal</span>
                  <span className="fw-semibold">{formatMoney(subtotal)}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-4">
                  <span className="text-secondary w-50">Tax (%)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control form-control-sm text-end w-25"
                    value={taxRate}
                    onChange={(event) => setTaxRate(event.target.value)}
                  />
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-4">
                  <span className="text-secondary d-flex justify-content-between align-items-center w-50">
                    <span>Tax Amount</span>
                  </span>
                  <span className="fw-semibold">{formatMoney(tax)}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-4">
                  <span className="text-secondary w-50">Discount ($)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control form-control-sm text-end w-25"
                    value={discount}
                    onChange={(event) => setDiscount(event.target.value)}
                  />
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-4 border-top-0">
                  <span className="fw-bold">Total</span>
                  <span className="fw-bold text-primary fs-5">{formatMoney(total)}</span>
                </li>
              </ul>
              <div className="card-footer bg-white px-4 py-3">
                <button id="createBillSubmit" type="submit" className="btn btn-primary w-100" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span> Saving...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-file-invoice me-1"></i> Generate Bill
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}