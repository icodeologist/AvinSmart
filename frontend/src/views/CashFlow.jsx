import { useMemo, useState } from "react";
import PageHeader from "../components/layout/PageHeader.jsx";

const today = new Date();
const isoDate = (daysAgo) => {
  const date = new Date(today);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};
const currentDate = today.toISOString().slice(0, 10);
const currentTime = today.toTimeString().slice(0, 5);

const initialEntries = [
  { id: 1, date: isoDate(1), time: "10:15", party: "Shop sales", description: "Daily counter sales", credit: 8600, debit: 0 },
  { id: 2, date: isoDate(1), time: "13:40", party: "Milk Supplier", description: "Milk stock purchase", credit: 0, debit: 4200 },
  { id: 3, date: isoDate(3), time: "16:20", party: "Shop sales", description: "UPI customer receipts", credit: 5200, debit: 0 },
  { id: 4, date: isoDate(4), time: "11:05", party: "Ravi Transport", description: "Delivery charges", credit: 0, debit: 1800 },
  { id: 5, date: isoDate(8), time: "15:10", party: "Packaging Vendor", description: "Boxes and carry bags", credit: 0, debit: 3500 },
  { id: 6, date: isoDate(12), time: "18:30", party: "Shop sales", description: "Weekend counter sales", credit: 11200, debit: 0 },
  { id: 7, date: isoDate(17), time: "09:45", party: "Electricity Office", description: "Monthly electricity bill", credit: 0, debit: 2400 },
];

function formatMoney(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CashFlow() {
  const [openingBalance, setOpeningBalance] = useState(25000);
  const [entries, setEntries] = useState(initialEntries);
  const [period, setPeriod] = useState("all");
  const [form, setForm] = useState({ date: currentDate, time: currentTime, party: "", description: "", type: "debit", amount: "" });

  const filteredEntries = useMemo(() => {
    if (period === "all") return entries;
    const cutoff = new Date(today);
    if (period === "day") {
      cutoff.setHours(0, 0, 0, 0);
    } else {
      cutoff.setDate(cutoff.getDate() - (period === "week" ? 7 : 30));
    }
    return entries.filter((entry) => new Date(`${entry.date}T${entry.time}`) >= cutoff);
  }, [entries, period]);

  const runningRows = useMemo(() => {
    let balance = Number(openingBalance) || 0;
    return [...filteredEntries].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).map((entry) => {
      balance += entry.credit - entry.debit;
      return { ...entry, balance };
    });
  }, [filteredEntries, openingBalance]);

  const closingBalance = runningRows.length ? runningRows[runningRows.length - 1].balance : Number(openingBalance) || 0;
  const totalCredit = filteredEntries.reduce((sum, entry) => sum + entry.credit, 0);
  const totalDebit = filteredEntries.reduce((sum, entry) => sum + entry.debit, 0);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addEntry(event) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.date || !form.time || !form.party.trim() || !amount || amount <= 0) return;
    setEntries((current) => [...current, { id: Date.now(), date: form.date, time: form.time, party: form.party.trim(), description: form.description.trim() || "Manual entry", credit: form.type === "credit" ? amount : 0, debit: form.type === "debit" ? amount : 0 }]);
    setForm({ date: currentDate, time: currentTime, party: "", description: "", type: "debit", amount: "" });
  }

  return <>
    <PageHeader title="Cash Flow" subtitle="Manual shop finance ledger and bank-style passbook" />

    <div className="row g-3 mb-3">
      <div className="col-md-4"><div className="card h-100"><div className="card-body"><label htmlFor="openingBalance" className="form-label">Opening / manual balance</label><div className="input-group"><span className="input-group-text">₹</span><input id="openingBalance" type="number" min="0" className="form-control" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} /></div><small className="text-muted">Edit this when starting a new manual record.</small></div></div></div>
      <div className="col-md-4"><div className="card h-100"><div className="card-body"><small className="text-muted d-block">Credits in selected period</small><strong className="fs-4 text-success">{formatMoney(totalCredit)}</strong><small className="text-muted d-block mt-2">Money received or income</small></div></div></div>
      <div className="col-md-4"><div className="card h-100"><div className="card-body"><small className="text-muted d-block">Current balance</small><strong className="fs-4 text-primary">{formatMoney(closingBalance)}</strong><small className="text-muted d-block mt-2">After credits and debits</small></div></div></div>
    </div>

    <div className="card mb-3"><div className="card-header bg-white px-4 py-3"><h2 className="h5 mb-0">Add manual entry</h2></div><div className="card-body p-4"><form onSubmit={addEntry}><div className="row g-3 align-items-end">
      <div className="col-md-2"><label className="form-label">Date</label><input type="date" className="form-control" value={form.date} onChange={(event) => updateForm("date", event.target.value)} required /></div>
      <div className="col-md-2"><label className="form-label">Time</label><input type="time" className="form-control" value={form.time} onChange={(event) => updateForm("time", event.target.value)} required /></div>
      <div className="col-md-2"><label className="form-label">Person / source</label><input className="form-control" placeholder="Supplier or income source" value={form.party} onChange={(event) => updateForm("party", event.target.value)} required /></div>
      <div className="col-md-2"><label className="form-label">Description</label><input className="form-control" placeholder="Optional note" value={form.description} onChange={(event) => updateForm("description", event.target.value)} /></div>
      <div className="col-md-2"><label className="form-label">Entry type</label><select className="form-select" value={form.type} onChange={(event) => updateForm("type", event.target.value)}><option value="debit">Debit / paid</option><option value="credit">Credit / income</option></select></div>
      <div className="col-md-2"><label className="form-label">Amount</label><div className="input-group"><span className="input-group-text">₹</span><input type="number" min="1" step="0.01" className="form-control" placeholder="0.00" value={form.amount} onChange={(event) => updateForm("amount", event.target.value)} required /></div></div>
      <div className="col-12"><button type="submit" className="btn btn-primary"><i className="ti ti-plus me-1"></i>Add entry</button></div>
    </div></form></div></div>

    <section className="card"><div className="card-header bg-white px-4 py-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"><div><h2 className="h5 mb-1">Passbook</h2><p className="small text-muted mb-0">Credits increase the balance; debits reduce it.</p></div><div className="d-flex align-items-center gap-2"><label htmlFor="cashFlowPeriod" className="form-label mb-0">Show</label><select id="cashFlowPeriod" className="form-select form-select-sm" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="day">Today</option><option value="week">This week</option><option value="month">This month</option><option value="all">All records</option></select></div></div><div className="table-responsive"><table className="table mb-0 align-middle"><thead className="table-light"><tr><th>Date</th><th>Time</th><th>Particulars</th><th>Credit</th><th>Debit</th><th>Balance</th></tr></thead><tbody><tr className="table-light"><td colSpan="5" className="fw-semibold">Opening balance</td><td className="fw-bold">{formatMoney(openingBalance)}</td></tr>{runningRows.length ? runningRows.map((entry) => <tr key={entry.id}><td>{formatDate(entry.date)}</td><td>{entry.time}</td><td><strong>{entry.party}</strong><small className="d-block text-muted">{entry.description}</small></td><td className="text-success fw-semibold">{entry.credit ? `+ ${formatMoney(entry.credit)}` : "—"}</td><td className="text-danger fw-semibold">{entry.debit ? `- ${formatMoney(entry.debit)}` : "—"}</td><td className="fw-bold">{formatMoney(entry.balance)}</td></tr>) : <tr><td colSpan="6" className="text-center text-muted py-5">No entries for this period.</td></tr>}</tbody><tfoot><tr><th colSpan="3" className="text-end">Period totals</th><th className="text-success">{formatMoney(totalCredit)}</th><th className="text-danger">{formatMoney(totalDebit)}</th><th>{formatMoney(closingBalance)}</th></tr></tfoot></table></div></section>
  </>;
}
