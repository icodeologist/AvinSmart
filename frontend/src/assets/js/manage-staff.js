const API_BASE_URL = window.__AVINSMART_API_BASE_URL__ || "/api/v1";

let allStaff = [];

const dummyStaff = [
  {
    name: "John Doe",
    email: "john@avinsmart.com",
    phone: "+1 (512) 555-0134",
    role: "manager",
    status: "active",
    joinedOn: "2024-03-15",
  },
  {
    name: "Jane Smith",
    email: "jane@avinsmart.com",
    phone: "+1 (512) 555-0178",
    role: "sales",
    status: "active",
    joinedOn: "2024-05-22",
  },
  {
    name: "Mike Johnson",
    email: "mike@avinsmart.com",
    phone: "+1 (214) 555-0199",
    role: "support",
    status: "locked",
    joinedOn: "2025-01-10",
  },
  {
    name: "Sarah Williams",
    email: "sarah@avinsmart.com",
    phone: "+1 (713) 555-0155",
    role: "inventory",
    status: "inactive",
    joinedOn: "2025-06-30",
  },
];

const staffGrid = document.getElementById("staffGrid");

function statusBadge(status) {
  if (status === "active") {
    return '<span class="badge bg-success-subtle text-success border border-success">Active</span>';
  }
  if (status === "locked") {
    return '<span class="badge bg-warning-subtle text-warning border border-warning"><i class="ti ti-lock me-1"></i>Locked</span>';
  }
  return '<span class="badge bg-secondary-subtle text-secondary border border-secondary">Inactive</span>';
}

function formatDate(value) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function createStaffCard(member) {
  return `
    <article class="staff-card">
      <div class="staff-card__header">
        <span class="staff-card__avatar" aria-hidden="true">
          <i class="ti ti-user"></i>
        </span>
        <div class="staff-card__identity">
          <h2 class="staff-card__name">${member.name}</h2>
          <p class="staff-card__email">${member.email}</p>
        </div>
        ${statusBadge(member.status)}
      </div>
      <dl class="staff-card__details">
        <div>
          <dt>Role</dt>
          <dd>${member.role}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>${member.phone || "Not available"}</dd>
        </div>
        <div>
          <dt>Joined</dt>
          <dd>${formatDate(member.joinedOn)}</dd>
        </div>
      </dl>
    </article>
  `;
}

function renderStaff(staff) {
  if (!staffGrid) return;

  if (!staff.length) {
    staffGrid.innerHTML =
      '<p class="staff-grid__empty text-center py-4 text-secondary">No staff found.</p>';
    return;
  }

  staffGrid.innerHTML = staff
    .map((member) => createStaffCard(member))
    .join("");
}

async function loadStaff() {
  try {
    const response = await fetch(`${API_BASE_URL}/staff`);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data.error || "Could not fetch staff");
    }

    allStaff = data;
  } catch (error) {
    allStaff = dummyStaff.map((member) => ({ ...member }));
  }

  renderStaff(allStaff);
}

if (staffGrid) {
  loadStaff();
}
