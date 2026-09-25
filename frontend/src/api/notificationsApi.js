import { API_BASE_URL, getAdminToken, unwrap } from "./config.js";

function authHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  const data = unwrap(body);
  if (!response.ok) throw new Error(body.error || data?.error || "Notification request failed");
  return data;
}

export function fetchNotifications(limit = 25) {
  return request(`/notifications?limit=${limit}`);
}

export async function fetchUnreadCount() {
  const data = await request("/notifications/unread-count");
  return Number(data?.count || 0);
}

export function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return request("/notifications/read-all", { method: "POST" });
}
