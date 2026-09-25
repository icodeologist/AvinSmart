const API_BASE_URL = window.__AVINSMART_API_BASE_URL__ || "/api/v1";

let allOutlets = [];

const dummyOutlets = [
  {
    name: "Downtown Branch",
    location: "12 Main Street, Austin, TX",
    contact: "Maria Gonzalez",
    phone: "+1 (512) 555-0134",
    email: "maria@avinsmart.com",
    status: "active",
    addedOn: "2024-01-15",
    lockedSince: null,
  },
  {
    name: "Westside Mall Outlet",
    location: "Westside Mall, Suite 210, Dallas, TX",
    contact: "James Carter",
    phone: "+1 (972) 555-0178",
    email: "james@avinsmart.com",
    status: "active",
    addedOn: "2024-03-22",
    lockedSince: null,
  },
  {
    name: "Airport Kiosk",
    location: "Terminal B, DFW International Airport",
    contact: "Sofia Rodriguez",
    phone: "+1 (214) 555-0199",
    email: "sofia@avinsmart.com",
    status: "locked",
    addedOn: "2024-06-10",
    lockedSince: "2026-01-08",
  },
  {
    name: "Northgate Store",
    location: "88 Northgate Plaza, Houston, TX",
    contact: "Daniel Kim",
    phone: "+1 (713) 555-0155",
    email: "daniel@avinsmart.com",
    status: "inactive",
    addedOn: "2024-08-01",
    lockedSince: null,
  },
  {
    name: "University Corner",
    location: "5 Campus Drive, San Antonio, TX",
    contact: "Alisha Patel",
    phone: "+1 (210) 555-0122",
    email: "alisha@avinsmart.com",
    status: "active",
    addedOn: "2025-02-18",
    lockedSince: null,
  },
  {
    name: "Riverside Branch",
    location: "440 Riverside Blvd, Houston, TX",
    contact: "Peter Nguyen",
    phone: "+1 (281) 555-0144",
    email: "peter@avinsmart.com",
    status: "locked",
    addedOn: "2025-05-05",
    lockedSince: "2026-07-30",
  },
];

const tableBody = document.getElementById("outletsTableBody");
const successAlert = document.getElementById("outletSuccess");

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
  if (!value) return '<span class="text-muted">&mdash;</span>';
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function normalizeOutlet(outlet) {
  return {
    name: outlet.name,
    location: outlet.location || "",
    contact: outlet.contact_person || "",
    phone: outlet.phone || "",
    email: outlet.email || "",
    status: outlet.status || "active",
    addedOn: outlet.created_at,
    lockedSince: outlet.locked_at || null,
  };
}

function renderOutlets(outlets) {
  if (!outlets.length) {
    tableBody.innerHTML =
      '<tr><td colspan="8" class="text-center py-4 text-secondary">No outlets found.</td></tr>';
    return;
  }

  tableBody.innerHTML = outlets
    .map(
      (outlet) => `
        <tr class="align-middle">
          <td>
            <a href="#" class="d-flex align-items-center gap-2 text-decoration-none text-reset">
              <span class="icon-shape icon-sm bg-primary bg-opacity-10 text-primary rounded-2">
                <i class="ti ti-building-store"></i>
              </span>
              <span class="fw-semibold">${outlet.name}</span>
            </a>
          </td>
          <td>${outlet.location}</td>
          <td>
            <p class="mb-0">${outlet.contact}</p>
            <small class="text-muted">${outlet.phone} &middot; ${outlet.email}</small>
          </td>
          <td>${statusBadge(outlet.status)}</td>
          <td>${formatDate(outlet.addedOn)}</td>
          <td>${formatDate(outlet.lockedSince)}</td>
          <td>
            <a href="#" title="Edit"><i class="ti ti-edit"></i></a>
            <a href="#" class="link-danger ms-2" title="Delete"><i class="ti ti-trash"></i></a>
          </td>
        </tr>
      `
    )
    .join("");
}

function flashSuccess() {
  if (!successAlert) return;
  successAlert.classList.remove("d-none");
  setTimeout(() => successAlert.classList.add("d-none"), 3000);
}

async function loadOutlets() {
  try {
    const response = await fetch(`${API_BASE_URL}/outlets`);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data.error || "Could not fetch outlets");
    }

    allOutlets = data.map(normalizeOutlet);
  } catch (error) {
    allOutlets = dummyOutlets.map((outlet) => ({ ...outlet }));
  }

  renderOutlets(allOutlets);
}

const addOutletForm = document.getElementById("addOutletForm");
if (addOutletForm) {
  addOutletForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const outlet = {
      name: document.getElementById("outletName").value.trim(),
      location: document.getElementById("outletLocation").value.trim(),
      contact_person: document.getElementById("outletContact").value.trim(),
      phone: document.getElementById("outletPhone").value.trim(),
      email: document.getElementById("outletEmail").value.trim(),
      status: document.getElementById("outletStatus").value,
    };

    fetch(`${API_BASE_URL}/outlets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(outlet),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || "Could not create outlet");
          });
        }
        return response.json();
      })
      .then((created) => {
        allOutlets.unshift(normalizeOutlet(created));
        renderOutlets(allOutlets);
        addOutletForm.reset();
        flashSuccess();
      })
      .catch(() => {
        allOutlets.unshift({
          name: outlet.name,
          location: outlet.location,
          contact: outlet.contact_person,
          phone: outlet.phone,
          email: outlet.email,
          status: outlet.status,
          addedOn: new Date().toISOString().slice(0, 10),
          lockedSince: outlet.status === "locked" ? new Date().toISOString().slice(0, 10) : null,
          _localOnly: true,
        });
        renderOutlets(allOutlets);
        addOutletForm.reset();
        flashSuccess();
      });
  });
}

if (tableBody) {
  loadOutlets();
}
