const salaryRecords = [
  { name: "John Doe", email: "john@avinsmart.com", role: "Manager", salary: 4200, lastPaid: "2026-08-30", status: "paid" },
  { name: "Jane Smith", email: "jane@avinsmart.com", role: "Sales", salary: 3200, lastPaid: "2026-08-30", status: "paid" },
  { name: "Mike Johnson", email: "mike@avinsmart.com", role: "Support", salary: 2850, lastPaid: "2026-07-30", status: "pending" },
  { name: "Sarah Williams", email: "sarah@avinsmart.com", role: "Inventory", salary: 3000, lastPaid: "2026-08-30", status: "paid" },
];

const tableBody = document.getElementById("salaryTableBody");
const emptyState = document.getElementById("salaryEmpty");
const searchInput = document.getElementById("salarySearch");
const statusSelect = document.getElementById("salaryStatus");

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function statusBadge(status) {
  if (status === "paid") {
    return '<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="ti ti-circle-check me-1"></i>Paid</span>';
  }
  return '<span class="badge bg-warning-subtle text-warning border border-warning-subtle"><i class="ti ti-clock me-1"></i>Pending</span>';
}

function renderSummary() {
  const total = salaryRecords.reduce((sum, record) => sum + record.salary, 0);
  const paid = salaryRecords.filter((record) => record.status === "paid")
    .reduce((sum, record) => sum + record.salary, 0);
  document.getElementById("totalPayroll").textContent = currency.format(total);
  document.getElementById("paidPayroll").textContent = currency.format(paid);
  document.getElementById("pendingPayroll").textContent = currency.format(total - paid);
}

function renderRecords() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusSelect.value;
  const filtered = salaryRecords.filter((record) => {
    const matchesSearch = `${record.name} ${record.email} ${record.role}`.toLowerCase().includes(query);
    const matchesStatus = selectedStatus === "all" || record.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  tableBody.innerHTML = filtered.map((record, index) => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <span class="icon-shape icon-sm bg-primary bg-opacity-10 text-primary rounded-2"><i class="ti ti-user"></i></span>
          <div><div class="fw-semibold">${record.name}</div><small class="text-muted">${record.email}</small></div>
        </div>
      </td>
      <td>${record.role}</td>
      <td class="fw-semibold">${currency.format(record.salary)}</td>
      <td>${formatDate(record.lastPaid)}</td>
      <td>${statusBadge(record.status)}</td>
      <td class="text-end">
        ${record.status === "pending" ? `<button type="button" class="btn btn-sm btn-outline-success mark-paid" data-index="${salaryRecords.indexOf(record)}"><i class="ti ti-check me-1"></i>Mark paid</button>` : '<span class="text-muted small">Up to date</span>'}
      </td>
    </tr>
  `).join("");

  emptyState.classList.toggle("d-none", filtered.length !== 0);
}

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest(".mark-paid");
  if (!button) return;
  salaryRecords[button.dataset.index].status = "paid";
  salaryRecords[button.dataset.index].lastPaid = new Date().toISOString();
  renderSummary();
  renderRecords();
});

searchInput.addEventListener("input", renderRecords);
statusSelect.addEventListener("change", renderRecords);
renderSummary();
renderRecords();
