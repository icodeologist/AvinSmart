import { API_BASE_URL, unwrap } from "./config.js";

export async function createBill(bill) {
  const payload = {
    bill_number: String(bill.billNumber || "").trim(),
    bill_date: bill.billDate || new Date().toISOString().slice(0, 10),
    customer_name: String(bill.customerName || "").trim(),
    customer_phone: String(bill.customerPhone || "").trim(),
    payment_method: bill.paymentMethod || "cash",
    cashier: String(bill.cashier || "").trim(),
    items: (bill.items || []).map((item) => ({
      name: String(item.name || "").trim(),
      quantity: Number(item.quantity) || 0,
      unit: item.unit || "pcs",
      unit_price: Number(item.unitPrice) || 0,
      amount: Number(item.amount) || 0,
    })),
    subtotal: Number(bill.subtotal) || 0,
    tax_rate: Number(bill.taxRate) || 0,
    discount: Number(bill.discount) || 0,
    total: Number(bill.total) || 0,
    notes: String(bill.notes || "").trim(),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/bills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Could not create bill");
    }

    return unwrap(data);
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error("Backend not reachable yet — bill is ready to submit once the API is wired up.");
    }
    throw error;
  }
}