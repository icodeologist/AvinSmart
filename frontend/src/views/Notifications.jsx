import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notificationsApi.js";

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setItems(await fetchNotifications(100));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function read(item) {
    if (!item.read_at) {
      await markNotificationRead(item.id);
      setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, read_at: new Date().toISOString() } : currentItem));
    }
    if (item.action_url) navigate(item.action_url);
  }

  async function readAll() {
    await markAllNotificationsRead();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div><h1 className="h3 mb-1">Notifications</h1><p className="text-muted mb-0">Updates for your account and outlet.</p></div>
        <button className="btn btn-outline-primary" type="button" onClick={readAll} disabled={!items.some((item) => !item.read_at)}>Mark all as read</button>
      </div>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <div className="card"><div className="list-group list-group-flush">
        {loading ? <div className="p-4 text-muted">Loading notifications...</div> : null}
        {!loading && !items.length ? <div className="p-4 text-muted">You have no notifications.</div> : null}
        {items.map((item) => (
          <button key={item.id} type="button" className={`list-group-item list-group-item-action text-start p-4 ${item.read_at ? "" : "bg-primary-subtle"}`} onClick={() => read(item)}>
            <div className="d-flex justify-content-between gap-3"><strong>{item.title}</strong><small className="text-muted text-nowrap">{formatDate(item.created_at)}</small></div>
            <span className="badge text-bg-light text-capitalize mt-2">{item.type || "general"}</span>
            <div className="text-muted mt-1">{item.message}</div>
          </button>
        ))}
      </div></div>
    </>
  );
}
