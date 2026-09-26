import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { register } from "../api/authApi.js";
import { getPosToken } from "../api/config.js";

export default function SignUp() {
  const navigate = useNavigate();
  if (getPosToken()) return <Navigate to="/profile" replace />;
  const formRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [photoBase64, setPhotoBase64] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");

  function handlePhotoChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result);
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

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
        photoBase64,
      });

      setAlert({ type: "success", message: "Registration successful. Redirecting to login..." });
      form.reset();
      form.classList.remove("was-validated");
      setPhotoBase64("");
      setPhotoPreview("");
      setTimeout(() => navigate("/admin/login"), 800);
    } catch (error) {
      setAlert({ type: "danger", message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container d-flex align-items-center justify-content-center min-vh-100 py-5">
      <div className="card border-0 shadow-lg overflow-hidden" style={{ maxWidth: 920, width: "100%", borderRadius: 20 }}>
        <div className="row g-0">
          <section className="col-lg-5 p-4 p-lg-5 text-white bg-primary d-flex flex-column justify-content-between" style={{ minHeight: 620 }}>
            <div>
              <Link to="/" className="text-white text-decoration-none d-inline-block mb-5">
                <span className="avin-logo" aria-label="AvinSmart"><span className="avin-logo__avin"><span className="avin-logo__a">A</span>vin</span><span className="avin-logo__smart"><span className="avin-logo__s">S</span>mart</span></span>
              </Link>
              <span className="badge rounded-pill bg-white text-primary mb-3">Administrator access</span>
              <h1 className="display-6 fw-bold mb-3">Set up your control centre.</h1>
              <p className="lead text-white-50">Create the account that will manage outlets, inventory, staff, and business operations.</p>
            </div>
            <div className="small text-white-50"><i className="ti ti-shield-check me-2" />Your profile details can be updated later.</div>
          </section>

          <section className="col-lg-7 p-4 p-lg-5">
            <div className="mb-4"><h2 className="h3 mb-1">Admin Registration</h2><p className="text-muted mb-0">Create your administrator profile to get started.</p></div>
            <form id="signupForm" ref={formRef} className="needs-validation" noValidate onSubmit={handleSubmit}>
              {alert ? <div id="signupAlert" className={`alert alert-${alert.type}`} role="alert">{alert.message}</div> : null}
              <div className="row g-3">
                <div className="col-md-6"><label htmlFor="username" className="form-label">Admin name</label><input id="username" name="username" type="text" className="form-control" placeholder="Enter admin name" required /><div className="invalid-feedback">Please enter an admin name.</div></div>
                <div className="col-md-6"><label htmlFor="phoneNum" className="form-label">Phone number</label><input id="phoneNum" name="phoneNum" type="tel" className="form-control" placeholder="9876543210" required /><div className="invalid-feedback">Please enter your phone number.</div></div>
                <div className="col-12"><label htmlFor="email" className="form-label">Email address</label><input id="email" name="email" type="email" className="form-control" placeholder="admin@example.com" required /><div className="invalid-feedback">Please enter a valid email.</div></div>
                <div className="col-12"><label htmlFor="adminPhoto" className="form-label">Profile photo</label><div className="d-flex align-items-center gap-3 border rounded-3 p-3"><div className="rounded-circle overflow-hidden bg-light d-flex align-items-center justify-content-center" style={{ width: 64, height: 64, flex: "0 0 auto" }}>{photoPreview ? <img src={photoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <i className="ti ti-camera fs-3 text-muted" />}</div><div className="flex-grow-1"><input id="adminPhoto" name="adminPhoto" type="file" className="form-control" accept="image/jpeg,image/png,image/webp,image/gif" required onChange={handlePhotoChange} /><small className="text-muted">JPG, PNG, WEBP, or GIF up to 10 MB.</small></div></div><div className="invalid-feedback">Please select a profile photo.</div></div>
                <div className="col-md-6"><label htmlFor="password" className="form-label">Password</label><input id="password" name="password" type="password" className="form-control" placeholder="At least 8 characters" required minLength={8} /><div className="invalid-feedback">Please provide a password (min 8 characters).</div></div>
                <div className="col-md-6"><label htmlFor="confirmPassword" className="form-label">Confirm password</label><input id="confirmPassword" name="confirmPassword" type="password" className="form-control" placeholder="Repeat password" required onInput={(event) => { event.currentTarget.setCustomValidity(formRef.current.password.value !== event.currentTarget.value ? "Passwords do not match." : ""); }} /><div className="invalid-feedback">Passwords must match.</div></div>
              </div>
              <div className="form-check mt-4"><input id="terms" name="terms" className="form-check-input" type="checkbox" required /><label className="form-check-label small" htmlFor="terms">I agree to the terms and privacy policy.</label><div className="invalid-feedback">You must agree before continuing.</div></div>
              <button id="signupSubmit" className="btn btn-primary w-100 mt-4 py-2" type="submit" disabled={submitting}>{submitting ? "Registering..." : "Create Admin Account"}</button>
            </form>
            <div className="text-center mt-4 small text-muted">Already have an account? <Link to="/admin/login" className="link-primary">Sign in</Link></div>
          </section>
        </div>
      </div>
    </main>
  );
}
