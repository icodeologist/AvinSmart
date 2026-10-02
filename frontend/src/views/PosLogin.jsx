import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginStaff } from "../api/staffApi.js";
import { POS_SESSION_KEY } from "../api/config.js";

export default function PosLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const result = await loginStaff(email, password, role);
      sessionStorage.setItem(POS_SESSION_KEY, result.token);
      sessionStorage.setItem("avinSmartPosStaff", JSON.stringify(result.user));
      // Remove the legacy shared-browser POS token without disturbing an
      // administrator session that may be open in another tab.
      localStorage.removeItem(POS_SESSION_KEY);
      navigate(result.user.role === "inventory_staff" ? "/inventory" : "/pos");
    } catch (loginError) {
      setError(loginError.message || "Invalid staff email or password.");
    }
  }

  const destination = role === "inventory_staff" ? "inventory management" : role === "sales" ? "the sales POS" : "your staff workspace";
  return <main className="pos-login-shell"><div className="pos-login-card"><div className="avin-logo pos-login-logo" aria-label="AvinSmart"><span className="avin-logo__avin"><span className="avin-logo__a">A</span>vin</span><span className="avin-logo__smart"><span className="avin-logo__s">S</span>mart</span></div><h1>Staff Login</h1><p className="text-muted">Select your assigned role and sign in to open {destination}.</p>{error && <div className="alert alert-danger py-2">{error}</div>}<form onSubmit={handleSubmit}><label className="form-label" htmlFor="staffRole">Staff role</label><select id="staffRole" className="form-select mb-3" value={role} onChange={(event) => { setRole(event.target.value); setError(""); }} required><option value="" disabled>Select your assigned role</option><option value="sales">Sales Staff</option><option value="inventory_staff">Inventory Staff</option></select><label className="form-label" htmlFor="posEmail">Staff email</label><input id="posEmail" type="email" className="form-control mb-3" value={email} onChange={(event) => setEmail(event.target.value)} required /><label className="form-label" htmlFor="posPassword">Password</label><input id="posPassword" type="password" className="form-control mb-4" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="submit" className="btn btn-primary w-100">Continue</button></form></div></main>;
}
