import { API_BASE_URL, getAdminToken, unwrap } from "./config.js";

function authHeaders() {
  const token = getAdminToken();
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
    outlets: Array.isArray(member.outlets) ? member.outlets.map((outlet) => ({ id: outlet.id, name: outlet.name })) : [],
    joinedOn: member.joinedOn || member.created_at || "",
    passwordSet: true,
  };
}

async function parseResponse(response, fallbackMessage) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || fallbackMessage);
    if (body.fields) error.fields = body.fields;
    throw error;
  }
  return unwrap(body);
}

export async function fetchStaff() {
  try {
    const response = await fetch(`${API_BASE_URL}/staff`, { headers: authHeaders() });
    const data = await parseResponse(response, "Could not fetch staff");

    return Array.isArray(data) ? data.map(normalize) : [];
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error(`Could not fetch staff: ${error.message}`);
    }
    throw error;
  }
}

export async function loginStaff(email, password, role) {
  const response = await fetch(`${API_BASE_URL}/staff/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: String(email || "").trim(), password: String(password || ""), role }),
  });

  try {
    return await parseResponse(response, "Could not login staff");
  } catch (error) {
    if (error.name === "TypeError") throw new Error(`Could not login staff: ${error.message}`);
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
    outlet_ids: Array.isArray(staff.outletIds) ? staff.outletIds.map(Number) : [],
  };

  try {
    const response = await fetch(`${API_BASE_URL}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });

    return parseResponse(response, "Could not create staff");
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error(`Could not create staff: ${error.message}`);
    }
    throw error;
  }
}

export async function updateStaff(id, staff) {
  const response = await fetch(`${API_BASE_URL}/staff/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      name: String(staff.name || "").trim(),
      email: String(staff.email || "").trim(),
      phone: String(staff.phone || "").trim(),
      role: staff.role || "staff",
      status: staff.status || "active",
      outlet_ids: Array.isArray(staff.outletIds) ? staff.outletIds.map(Number) : undefined,
    }),
  });
  try {
    return normalize(await parseResponse(response, "Could not update staff"));
  } catch (error) {
    if (error.name === "TypeError") throw new Error(`Could not update staff: ${error.message}`);
    throw error;
  }
}

export async function changeStaffPassword(id, password, reenterPassword) {
  const response = await fetch(`${API_BASE_URL}/staff/${id}/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ password, reenter_password: reenterPassword }),
  });
  return parseResponse(response, "Could not update staff password");
}

export async function deleteStaff(id) {
  const response = await fetch(`${API_BASE_URL}/staff/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return parseResponse(response, "Could not delete staff");
}
