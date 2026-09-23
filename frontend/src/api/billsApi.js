import { API_BASE_URL, unwrap } from "./config.js";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createBill(bill) {
  const payload = {
    bill_number: String(bill.billNumber || "").trim(),
    bill_date: bill.billDate || "",
    customer_name: String(bill.customerName || "").trim(),
    customer_phone: String(bill.customerPhone || "").trim(),
    payment_method: bill.paymentMethod || "cash",
    cashier: String(bill.cashier || "").trim(),
    price_tier: bill.priceTier || "retail",
    items: (bill.items || []).map((item) => ({
      product_id: item.productId || undefined,
      name: String(item.name || "").trim(),
      sku_id: String(item.skuId || "").trim(),
      quantity: Number(item.quantity) || 0,
      unit: item.unit || "pcs",
      unit_price: String(item.unitPrice ?? "0.00"),
      amount: String(item.amount ?? "0.00"),
      retail_price: String(item.retailPrice ?? "0.00"),
      customer_display_price: String(item.customerDisplayPrice ?? "0.00"),
      bought_price: String(item.boughtPrice ?? "0.00"),
      whole_sale_price: String(item.wholeSalePrice ?? "0.00"),
    })),
    tax_rate: Number(bill.taxRate) || 0,
    discount: String(bill.discount ?? "0.00"),
    notes: String(bill.notes || "").trim(),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/bills`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const fieldErrors = data.fields ? Object.values(data.fields).flat().join(" ") : "";
      throw new Error([data.error || "Could not create bill", fieldErrors].filter(Boolean).join(": "));
    }

    return unwrap(data);
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error(`Could not submit bill: ${error.message}`);
    }
    throw error;
  }
}

export async function quoteBill(bill) {
  const payload = {
    price_tier: bill.priceTier || "retail",
    tax_rate: Number(bill.taxRate) || 0,
    discount: String(bill.discount ?? "0.00"),
    items: (bill.items || []).map((item) => ({
      product_id: item.productId || undefined,
      name: String(item.name || "").trim(),
      quantity: Number(item.quantity) || 0,
      unit: item.unit || "pcs",
    })),
  };
  const response = await fetch(`${API_BASE_URL}/bills/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  const data = unwrap(body);
  if (!response.ok) throw new Error(body.error || "Could not calculate bill total");
  return data;
}
