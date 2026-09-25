import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { login } from "../api/authApi.js";
import { ADMIN_SESSION_KEY, getAdminToken } from "../api/config.js";

export default function SignIn() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [validated, setValidated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  if (getAdminToken()) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    const form = formRef.current;
    form.classList.add("was-validated");
    setValidated(true);

    if (!form.checkValidity()) {
      return;
    }

    setSubmitting(true);
    setAlert(null);

    try {
      const data = await login({
        email: form.email.value,
        password: form.password.value,
      });

      localStorage.setItem(ADMIN_SESSION_KEY, data.token);
      localStorage.setItem("admin", JSON.stringify(data.user));
      setAlert({ type: "success", message: "Login successful. Redirecting to the admin dashboard..." });
      setTimeout(() => navigate("/dashboard"), 600);
    } catch (error) {
      setAlert({
        type: "danger",
        message: `${error.message}. New admin? `,
        link: true,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100">
      <div className="card" style={{ maxWidth: 420, width: "100%" }}>
        <div className="card-body p-5">
          <div className="text-center mb-3">
            <Link to="/login" className="mb-4 d-inline-block">
              <span className="avin-logo" aria-label="AvinSmart"><span className="avin-logo__avin"><span className="avin-logo__a">A</span>vin</span><span className="avin-logo__smart"><span className="avin-logo__s">S</span>mart</span></span>
            </Link>
            <h1 className="card-title mb-5 h5">Admin Login</h1>
          </div>

          <form id="signinForm" ref={formRef} className="needs-validation mt-3" noValidate onSubmit={handleSubmit}>
            {alert ? (
              <div id="signinAlert" className={`alert alert-${alert.type}`} role="alert">
                {alert.message}
                {alert.link ? <Link to="/signup" className="alert-link">Create an account</Link> : null}
              </div>
            ) : null}
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email address</label>
              <input id="email" name="email" type="email" className="form-control" placeholder="name@example.com" required autoFocus />
              <div className="invalid-feedback">Please enter a valid email.</div>
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label d-flex justify-content-between">
                <span>Password</span>
                <a href="#" className="small link-primary">Forgot Password?</a>
              </label>
              <input id="password" name="password" type="password" className="form-control" placeholder="Password" required minLength={8} />
              <div className="invalid-feedback">Please provide a password (min 8 characters).</div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="form-check">
                <input id="remember" name="remember" className="form-check-input" type="checkbox" />
                <label className="form-check-label small" htmlFor="remember">Remember me</label>
              </div>
            </div>

            <button id="signinSubmit" className="btn btn-primary w-100" type="submit" disabled={submitting}>
              {submitting ? "Please wait..." : "Sign in"}
            </button>
          </form>

          <div className="text-center mt-3 small text-muted">
            Need a staff account? Ask an administrator to create one.
          </div>
        </div>
      </div>
    </div>
  );
}
