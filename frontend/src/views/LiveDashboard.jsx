import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { verifyAdminPassword } from "../api/authApi.js";
import { DashboardWorkspace } from "./Dashboard.jsx";

export default function LiveDashboard() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setUnlocking(true);
    setError("");
    try {
      await verifyAdminPassword(password);
      setPassword("");
      setUnlocked(true);
    } catch (verifyError) {
      setError(verifyError.message || "Could not continue.");
    } finally {
      setUnlocking(false);
    }
  }

  if (unlocked) return <DashboardWorkspace live fullScreen onShowDemo={() => navigate("/dashboard")} />;

  return (
    <main className="min-vh-100 bg-light d-flex align-items-center justify-content-center p-3">
      <section className="card border-0 shadow-sm" style={{ width: "100%", maxWidth: 420 }}>
        <div className="card-body p-4 p-md-5">
          <p className="text-muted small mb-2">Private workspace</p>
          <h1 className="h4 mb-2">Continue to workspace</h1>
          <p className="text-muted mb-4">Confirm your identity to open this view.</p>
          {error ? <div className="alert alert-danger py-2 small" role="alert">{error}</div> : null}
          <form onSubmit={handleSubmit}>
            <label className="form-label" htmlFor="workspacePassword">Password</label>
            <input id="workspacePassword" type="password" className="form-control" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required autoFocus />
            <div className="d-flex gap-2 mt-4"><button type="submit" className="btn btn-primary" disabled={unlocking}>{unlocking ? "Checking..." : "Continue"}</button><button type="button" className="btn btn-outline-secondary" onClick={() => navigate("/profile")}>Back</button></div>
          </form>
        </div>
      </section>
    </main>
  );
}
