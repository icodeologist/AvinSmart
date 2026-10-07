import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { registerAdmin } from "../api/authApi.js";
import { ADMIN_SESSION_KEY, getAdminToken } from "../api/config.js";

export default function RegisterAdmin() {
  const formRef = useRef(null);
  const navigate = useNavigate();
  const [alert, setAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (getAdminToken()) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    const form = formRef.current;
    form.confirmPassword.setCustomValidity(form.password.value === form.confirmPassword.value ? "" : "Passwords do not match.");
    form.classList.add("was-validated");
    if (!form.checkValidity()) return;
    setSubmitting(true);
    setAlert(null);
    try {
      const data = await registerAdmin({
        username: form.username.value,
        email: form.email.value,
        password: form.password.value,
        phone_num: form.phoneNum.value,
      });
      localStorage.setItem(ADMIN_SESSION_KEY, data.token);
      localStorage.setItem("admin", JSON.stringify(data.user));
      setAlert({ type: "success", message: "Admin account created. Opening your dashboard..." });
      setTimeout(() => navigate("/dashboard"), 500);
    } catch (error) {
      setAlert({ type: "danger", message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container d-flex align-items-center justify-content-center min-vh-100 py-5">
      <div className="card border-0 shadow-lg" style={{ maxWidth: 620, width: "100%", borderRadius: 20 }}>
        <div className="card-body p-4 p-lg-5">
          <div className="text-center mb-4">
            <Link to="/" className="mb-4 d-inline-block">
              <span className="avin-logo" aria-label="AvinSmart"><span className="avin-logo__avin"><span className="avin-logo__a">A</span>vin</span><span className="avin-logo__smart"><span className="avin-logo__s">S</span>mart</span></span>
            </Link>
            <h1 className="h3 mb-1">Register Admin</h1>
            <p className="text-muted mb-0">Create your administrator profile.</p>
          </div>

          {alert ? <div className={`alert alert-${alert.type}`} role="alert">{alert.message}</div> : null}
          <form ref={formRef} className="needs-validation" noValidate onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6"><label htmlFor="username" className="form-label">Admin name</label><input id="username" name="username" className="form-control" required autoFocus /><div className="invalid-feedback">Please enter an admin name.</div></div>
              <div className="col-md-6"><label htmlFor="phoneNum" className="form-label">Phone number</label><input id="phoneNum" name="phoneNum" type="tel" className="form-control" required /><div className="invalid-feedback">Please enter a phone number.</div></div>
              <div className="col-12"><label htmlFor="email" className="form-label">Email address</label><input id="email" name="email" type="email" className="form-control" placeholder="admin@example.com" required /><div className="invalid-feedback">Please enter a valid email.</div></div>
              <div className="col-md-6"><label htmlFor="password" className="form-label">Password</label><input id="password" name="password" type="password" className="form-control" minLength={8} required /><div className="invalid-feedback">Use at least 8 characters.</div></div>
              <div className="col-md-6"><label htmlFor="confirmPassword" className="form-label">Confirm password</label><input id="confirmPassword" name="confirmPassword" type="password" className="form-control" minLength={8} required onInput={(event) => event.currentTarget.setCustomValidity(formRef.current.password.value === event.currentTarget.value ? "" : "Passwords do not match.")} /><div className="invalid-feedback">Passwords must match.</div></div>
            </div>
            <button className="btn btn-primary w-100 mt-4" type="submit" disabled={submitting}>{submitting ? "Creating account..." : "Register admin"}</button>
          </form>
          <div className="text-center mt-4 small text-muted">Already registered? <Link to="/admin/login" className="link-primary">Sign in</Link></div>
        </div>
      </div>
    </main>
  );
}
