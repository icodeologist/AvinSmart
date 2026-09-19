import { API_BASE_URL, unwrap } from "./config.js";

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

export function register({ username, email, password, reenterPassword, phoneNum }) {
  return postJSON("/auth/register", {
    username,
    email,
    password,
    reenter_password: reenterPassword,
    phone_num: phoneNum,
  });
}
