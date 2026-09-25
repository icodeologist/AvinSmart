import { API_BASE_URL, getAdminToken, unwrap } from "./config.js";

function authHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeOutlet(outlet) {
  return {
    id: outlet.id,
    name: outlet.name,
    location: outlet.location || "",
    contact: outlet.contact_person || "",
    phone: outlet.phone || "",
    email: outlet.email || "",
    status: outlet.status || "active",
    addedOn: outlet.created_at,
    lockedSince: outlet.locked_at || null,
  };
}

export async function fetchOutlets() {
  try {
    const response = await fetch(`${API_BASE_URL}/outlets`, { headers: authHeaders() });
    const data = unwrap(await response.json().catch(() => []));

    if (!response.ok) {
      throw new Error(data.error || "Could not fetch outlets");
    }

    return (Array.isArray(data) ? data : []).map(normalizeOutlet);
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error(`Could not fetch outlets: ${error.message}`);
    }
    throw error;
  }
}

export async function createOutlet(outlet) {
  try {
    const response = await fetch(`${API_BASE_URL}/outlets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(outlet),
    });
    const data = unwrap(await response.json().catch(() => null));

    if (!response.ok) {
      throw new Error(data.error || "Could not create outlet");
    }

    return { created: normalizeOutlet(data) };
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error(`Could not create outlet: ${error.message}`);
    }
    throw error;
  }
}
