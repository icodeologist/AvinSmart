import { API_BASE_URL, unwrap } from "./config.js";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalize(member) {
  return {
    id: member.id,
    name: member.name || "Unknown",
    email: member.email || "",
    phone: member.phone || "",
    role: member.role || "staff",
    status: member.status || "active",
    joinedOn: member.joinedOn || member.created_at || "",
  };
}

export async function fetchStaff() {
  try {
    const response = await fetch(`${API_BASE_URL}/staff`, { headers: authHeaders() });
    const data = unwrap(await response.json().catch(() => []));

    if (!response.ok) {
      throw new Error(data.error || "Could not fetch staff");
    }

    return Array.isArray(data) ? data.map(normalize) : [];
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error(`Could not fetch staff: ${error.message}`);
    }
    throw error;
  }
}

export async function createStaff(staff) {
  const payload = {
    name: String(staff.name || "").trim(),
    email: String(staff.email || "").trim(),
    password: String(staff.password || ""),
    phone: String(staff.phone || "").trim(),
    role: staff.role || "staff",
  };

  try {
    const response = await fetch(`${API_BASE_URL}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "Could not create staff");
      if (data.fields) {
        error.fields = data.fields;
      }
      throw error;
    }

    return unwrap(data);
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error(`Could not create staff: ${error.message}`);
    }
    throw error;
  }
}