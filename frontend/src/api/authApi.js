import { API_BASE_URL, getAdminToken, unwrap } from "./config.js";

async function postJSON(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export function login({ email, password }) {
  return postJSON("/auth/login", { email, password }).then(unwrap);
}

export async function verifyAdminPassword(password) {
  const response = await fetch(`${API_BASE_URL}/auth/verify-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
    body: JSON.stringify({ password }),
  });
  const data = unwrap(await response.json().catch(() => ({})));
  if (!response.ok) throw new Error(data.error || "Could not verify password");
  return data;
}
