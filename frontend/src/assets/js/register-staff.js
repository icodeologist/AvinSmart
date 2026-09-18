const API_BASE_URL = "http://localhost:8080/api/v1";

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

function formatStaffDate(value) {
  if (!value) return '<span class="text-muted">&mdash;</span>';
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function statusBadge(status) {
  if (status === "active") {
    return '<span class="badge bg-success-subtle text-success border border-success">Active</span>';
  }
  if (status === "locked") {
    return '<span class="badge bg-warning-subtle text-warning border border-warning"><i class="ti ti-lock me-1"></i>Locked</span>';
  }
  return '<span class="badge bg-secondary-subtle text-secondary border border-secondary">Inactive</span>';
}

function createStaffCard(staff) {
  return `
    <div class="grid-staff__item">
      <div class="grid-staff__card">
        <div class="grid-staff__avatar">
          <i class="ti ti-user"></i>
        </div>
        <div class="grid-staff__details">
          <h4 class="grid-staff__name">${staff.name}</h4>
          <p class="grid-staff__email">${staff.email}</p>
        </div>
        <div class="grid-staff__role">${staff.role}</div>
        <div class="grid-staff__status">${statusBadge(staff.status)}</div>
      </div>
    </div>
  `;
}

function renderStaff(staff) {
  const grid = document.getElementById("staffGrid");
  if (!grid) return;

  if (!staff.length) {
    grid.innerHTML =
      '<p class="text-center py-4 text-secondary">No staff found.</p>';
    return;
  }

  grid.innerHTML = staff
    .map((member) => createStaffCard(member))
    .join("");
}

function flashSuccess() {
  const successAlert = document.getElementById("staffSuccess");
  if (!successAlert) return;
  successAlert.classList.remove("d-none");
  setTimeout(() => successAlert.classList.add("d-none"), 3000);
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

const registerStaffForm = document.getElementById("registerStaffForm");
if (registerStaffForm) {
  registerStaffForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const staff = {
      name: document.getElementById("staffName").value.trim(),
      email: document.getElementById("staffEmail").value.trim(),
      phone: document.getElementById("staffPhone").value.trim(),
      role: document.getElementById("staffRole").value,
      status: "active",
    };

    fetch(`${API_BASE_URL}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staff),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || "Could not create staff");
          });
        }
        return response.json();
      })
      .then((created) => {
        allStaff.unshift({ ...staff, joinedOn: new Date().toISOString().slice(0, 10), _localOnly: true });
        renderStaff(allStaff);
        registerStaffForm.reset();
        flashSuccess();
      })
      .catch(() => {
        allStaff.unshift({ ...staff, joinedOn: new Date().toISOString().slice(0, 10), _localOnly: true });
        renderStaff(allStaff);
        registerStaffForm.reset();
        flashSuccess();
      });
  });
}

if (document.getElementById("staffGrid")) {
  loadStaff();
}