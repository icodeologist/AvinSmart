const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();

export const API_BASE_URL = (configuredApiBaseUrl || (import.meta.env.DEV ? "http://localhost:8080/api/v1" : "/api/v1")).replace(/\/+$/, "");
export const ADMIN_SESSION_KEY = "avinSmartAdminToken";
export const POS_SESSION_KEY = "avinSmartPosToken";

export function getAdminToken() {
  return localStorage.getItem(ADMIN_SESSION_KEY) || "";
}

export function getPosToken() {
  return localStorage.getItem(POS_SESSION_KEY) || "";
}

export function unwrap(data) {
  return data && data.success && Object.prototype.hasOwnProperty.call(data, "data")
    ? data.data
    : data;
}
