const API_BASE_URL = "http://localhost:8080/api/v1";

const fallbackStaff = [
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

const localStaff = [];

function normalize(member) {
  return {
    name: member.name || "Unknown",
    email: member.email || "",
    phone: member.phone || "",
    role: member.role || "staff",
    status: member.status || "active",
    joinedOn: member.joinedOn || "",
  };
}

export function getFallbackStaff() {
  return fallbackStaff.map((member) => ({ ...member }));
}

export async function fetchStaff() {
  try {
    const response = await fetch(`${API_BASE_URL}/staff`);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data.error || "Could not fetch staff");
    }

    return [...(Array.isArray(data) ? data.map(normalize) : []), ...localStaff];
  } catch (error) {
    return [...getFallbackStaff(), ...localStaff];
  }
}

export async function createStaff(staff) {
  const payload = {
    name: String(staff.name || "").trim(),
    email: String(staff.email || "").trim(),
    phone: String(staff.phone || "").trim(),
    role: staff.role || "staff",
    status: "active",
  };

  try {
    const response = await fetch(`${API_BASE_URL}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Could not create staff");
    }

    const created = await response.json().catch(() => null);
    if (created && typeof created === "object" && !Array.isArray(created)) {
      localStaff.unshift(normalize({ ...payload, ...created }));
    } else {
      localStaff.unshift(createLocalRecord(payload));
    }
  } catch (error) {
    localStaff.unshift(createLocalRecord(payload));
  }

  return payload;
}

function createLocalRecord(payload) {
  return normalize({
    ...payload,
    joinedOn: new Date().toISOString().slice(0, 10),
    _localOnly: true,
  });
}