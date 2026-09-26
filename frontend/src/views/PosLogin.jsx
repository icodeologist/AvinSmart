import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginStaff } from "../api/staffApi.js";
import { POS_SESSION_KEY } from "../api/config.js";

export default function PosLogin({ role = "sales" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const result = await loginStaff(email, password, role);
      localStorage.setItem(POS_SESSION_KEY, result.token);
      sessionStorage.setItem("avinSmartPosStaff", JSON.stringify(result.user));
      localStorage.removeItem("avinSmartAdminToken");
      localStorage.removeItem("admin");
      navigate(result.user.role === "inventory_staff" ? "/inventory" : "/pos");
    } catch (loginError) {
      setError(loginError.message || "Invalid staff email or password.");
    }
  }

  const title = role === "inventory_staff" ? "Staff / Inventory Login" : "Staff / Sales Login";
  const destination = role === "inventory_staff" ? "inventory management" : "the sales POS";
  return <main className="pos-login-shell"><div className="pos-login-card"><div className="avin-logo pos-login-logo" aria-label="AvinSmart"><span className="avin-logo__avin"><span className="avin-logo__a">A</span>vin</span><span className="avin-logo__smart"><span className="avin-logo__s">S</span>mart</span></div><h1>{title}</h1><p className="text-muted">Sign in to open {destination}.</p>{error && <div className="alert alert-danger py-2">{error}</div>}<form onSubmit={handleSubmit}><label className="form-label" htmlFor="posEmail">Staff email</label><input id="posEmail" type="email" className="form-control mb-3" value={email} onChange={(event) => setEmail(event.target.value)} required /><label className="form-label" htmlFor="posPassword">Password</label><input id="posPassword" type="password" className="form-control mb-4" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="submit" className="btn btn-primary w-100">Continue</button></form></div></main>;
}
