const API_BASE_URL = window.__AVINSMART_API_BASE_URL__ || "/api/v1";

function showAlert(element, type, message) {
  element.className = `alert alert-${type}`;
  element.innerHTML = message;
}

function setLoading(button, isLoading, label) {
  button.disabled = isLoading;
  button.textContent = isLoading ? "Please wait..." : label;
}

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

const signinForm = document.getElementById("signinForm");
if (signinForm) {
  const alert = document.getElementById("signinAlert");
  const submitButton = document.getElementById("signinSubmit");

  signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    signinForm.classList.add("was-validated");

    if (!signinForm.checkValidity()) {
      return;
    }

    setLoading(submitButton, true, "Sign in");

    try {
      const data = await postJSON("/auth/login", {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
      });

      localStorage.setItem("admin", JSON.stringify(data.admin));
      showAlert(alert, "success", "Login successful. Redirecting to dashboard...");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 600);
    } catch (error) {
      showAlert(
        alert,
        "danger",
        error.message,
      );
    } finally {
      setLoading(submitButton, false, "Sign in");
    }
  });
}
