import { API_BASE_URL, getAdminToken, unwrap } from "./config.js";

export async function fetchDashboardSummary() {
  const response = await fetch(`${API_BASE_URL}/dashboard/summary`, {
    headers: { Authorization: `Bearer ${getAdminToken()}` },
  });
  const data = unwrap(await response.json().catch(() => ({})));
  if (!response.ok) throw new Error(data.error || "Could not fetch dashboard summary");
  return data;
}
