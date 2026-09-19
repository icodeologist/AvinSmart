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
      unit_price: Number(item.unitPrice) || 0,
      amount: Number(item.amount) || 0,
      retail_price: Number(item.retailPrice) || 0,
      customer_display_price: Number(item.customerDisplayPrice) || 0,
      bought_price: Number(item.boughtPrice) || 0,
      whole_sale_price: Number(item.wholeSalePrice) || 0,
    })),
    tax_rate: Number(bill.taxRate) || 0,
    discount: Number(bill.discount) || 0,
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
