const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();

// Vite proxies this path to the local API during development, avoiding browser
// CORS preflights for authenticated mutations such as payroll updates.
export const API_BASE_URL = (configuredApiBaseUrl || "/api/v1").replace(/\/+$/, "");
export const ADMIN_SESSION_KEY = "avinSmartAdminToken";
export const POS_SESSION_KEY = "avinSmartPosToken";

export function getAdminToken() {
  return localStorage.getItem(ADMIN_SESSION_KEY) || "";
}

export function getPosToken() {
  return sessionStorage.getItem(POS_SESSION_KEY) || "";
}

export function unwrap(data) {
  return data && data.success && Object.prototype.hasOwnProperty.call(data, "data")
    ? data.data
    : data;
}
