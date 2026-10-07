import { API_BASE_URL, getAdminToken, unwrap } from "./config.js";

async function postJSON(path, payload) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Could not reach the backend. Make sure the API server is running.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (data.error) throw new Error(data.error);
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return data;
}

export function login({ email, password }) {
  return postJSON("/auth/login", { email, password }).then(unwrap);
}

export function registerAdmin({ username, email, password, phone_num }) {
  return postJSON("/auth/register", { username, email, password, phone_num }).then(unwrap);
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
