import { API_BASE_URL, unwrap } from "./config.js";

function authHeaders() {
  const token = localStorage.getItem("token");
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

export function createOrder({ items, priceTier, cashier }) {
  return post("/orders", { items, price_tier: priceTier, cashier });
}

export function quoteOrder({ items, priceTier }) {
  return post("/orders/quote", { items, price_tier: priceTier });
}

export function recordPayment(orderId, { amount, method }) {
  return post(`/orders/${orderId}/payments`, { amount: String(amount), method });
}
