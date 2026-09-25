import { API_BASE_URL, getPosToken, unwrap } from "./config.js";

function authHeaders() {
  const token = getPosToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function post(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": newIdempotencyKey(), ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  const data = unwrap(body);
  if (!response.ok) throw new Error(data.error || "Could not complete POS request");
  return data;
}

export function createOrder({ items, priceTier, cashier, outletId }) {
  return post("/orders", { items, price_tier: priceTier, cashier, outlet_id: outletId });
}

export function quoteOrder({ items, priceTier, outletId }) {
  return post("/orders/quote", { items, price_tier: priceTier, outlet_id: outletId });
}

export function recordPayment(orderId, { amount, method, cashTendered }) {
  return post(`/orders/${orderId}/payments`, { amount: String(amount), method, cash_tendered: cashTendered == null ? undefined : String(cashTendered) });
}

export function cancelOrder(orderId) {
  return post(`/orders/${orderId}/cancel`, {});
}

export function refundPayment(orderId, paymentId, reason) {
  return post(`/orders/${orderId}/payments/${paymentId}/refund`, { reason });
}
