import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/authApi.js";

export default function SignUp() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    const form = formRef.current;
    form.classList.add("was-validated");

    if (!form.checkValidity()) {
      return;
    }

    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    if (password !== confirmPassword) {
      setAlert({ type: "danger", message: "Passwords must match." });
      return;
    }

    setSubmitting(true);
    setAlert(null);

    try {
      await register({
        username: form.username.value,
        email: form.email.value,
        password,
        reenterPassword: confirmPassword,
        phoneNum: form.phoneNum.value,
      });

      setAlert({ type: "success", message: "Registration successful. Redirecting to login..." });
      form.reset();
      form.classList.remove("was-validated");
      setTimeout(() => navigate("/login"), 800);
    } catch (error) {
      setAlert({ type: "danger", message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100">
      <div className="card" style={{ maxWidth: 420, width: "100%" }}>
        <div className="card-body p-5">
          <div className="text-center mb-3">
            <Link to="/" className="mb-4 d-inline-block">
              <img src="/assets/images/logo-icon.svg" alt="" width="36" />
              <span className="ms-2"><img src="/assets/images/logo.svg" alt="" /></span>
            </Link>
            <h1 className="card-title mb-5 h5">Create your account</h1>
          </div>

          <form id="signupForm" ref={formRef} className="needs-validation mt-3" noValidate onSubmit={handleSubmit}>
            {alert ? (
              <div id="signupAlert" className={`alert alert-${alert.type}`} role="alert">{alert.message}</div>
            ) : null}
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Username</label>
              <input id="username" name="username" type="text" className="form-control" placeholder="admin" required />
              <div className="invalid-feedback">Please enter a username.</div>
            </div>

            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email address</label>
              <input id="email" name="email" type="email" className="form-control" placeholder="name@example.com" required />
              <div className="invalid-feedback">Please enter a valid email.</div>
            </div>

            <div className="mb-3">
              <label htmlFor="phoneNum" className="form-label">Phone number</label>
              <input id="phoneNum" name="phoneNum" type="tel" className="form-control" placeholder="9876543210" required />
              <div className="invalid-feedback">Please enter your phone number.</div>
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input id="password" name="password" type="password" className="form-control" placeholder="Create a password" required minLength={8} />
              <div className="invalid-feedback">Please provide a password (min 8 characters).</div>
            </div>

            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">Confirm password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className="form-control"
                placeholder="Repeat password"
                required
                onInput={(event) => {
                  event.currentTarget.setCustomValidity(
                    formRef.current.password.value !== event.currentTarget.value
                      ? "Passwords do not match."
                      : ""
                  );
                }}
              />
              <div className="invalid-feedback">Passwords must match.</div>
            </div>

            <div className="mb-3 form-check">
              <input id="terms" name="terms" className="form-check-input" type="checkbox" required />
              <label className="form-check-label small" htmlFor="terms">
                I agree to the <a href="#" className="text-decoration-none">terms and privacy</a>
              </label>
              <div className="invalid-feedback">You must agree before continuing.</div>
            </div>

            <button id="signupSubmit" className="btn btn-primary w-100" type="submit" disabled={submitting}>
              {submitting ? "Please wait..." : "Sign up"}
            </button>
          </form>

          <div className="text-center mt-3 small text-muted">
            Already have an account? <Link to="/login" className="link-primary">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}