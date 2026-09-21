import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginStaff } from "../api/staffApi.js";

export default function PosLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("staff@avinsmart.in");
  const [password, setPassword] = useState("staff123");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const result = await loginStaff(email, password);
      localStorage.setItem("token", result.token);
      sessionStorage.setItem("avinSmartPosStaff", JSON.stringify(result.user));
      navigate("/pos");
    } catch (loginError) {
      setError(loginError.message || "Invalid staff email or password.");
    }
  }

  return <main className="pos-login-shell"><div className="pos-login-card"><div className="avin-logo pos-login-logo" aria-label="AvinSmart"><span className="avin-logo__avin"><span className="avin-logo__a">A</span>vin</span><span className="avin-logo__smart"><span className="avin-logo__s">S</span>mart</span></div><h1>Staff POS Login</h1><p className="text-muted">Sign in to start a counter sale.</p>{error && <div className="alert alert-danger py-2">{error}</div>}<form onSubmit={handleSubmit}><label className="form-label" htmlFor="posEmail">Staff email</label><input id="posEmail" type="email" className="form-control mb-3" value={email} onChange={(event) => setEmail(event.target.value)} required /><label className="form-label" htmlFor="posPassword">Password</label><input id="posPassword" type="password" className="form-control mb-4" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="submit" className="btn btn-primary w-100">Open POS</button></form></div></main>;
}
