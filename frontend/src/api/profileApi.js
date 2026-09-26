import { API_BASE_URL, getAdminToken, getPosToken, unwrap } from "./config.js";

function authHeaders() {
  const token = getPosToken() || getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function updateProfile({ name, photoBase64 }) {
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name: String(name || "").trim(), photo_base64: photoBase64 || "" }),
  });
  const body = await response.json().catch(() => ({}));
  const data = unwrap(body);
  if (!response.ok) {
    const error = new Error(data.error || "Could not update profile");
    error.fields = data.fields;
    throw error;
  }
  return data;
}
