const NEXT_PAYROLL_DATE = "30 Sep 2026";

const salaryRecords = [
  { id: 1, name: "John Doe", email: "john@avinsmart.com", role: "Manager", salary: 4200, lastPaid: "2026-08-30", status: "paid" },
  { id: 2, name: "Jane Smith", email: "jane@avinsmart.com", role: "Sales", salary: 3200, lastPaid: "2026-08-30", status: "paid" },
  { id: 3, name: "Mike Johnson", email: "mike@avinsmart.com", role: "Support", salary: 2850, lastPaid: "2026-07-30", status: "pending" },
  { id: 4, name: "Sarah Williams", email: "sarah@avinsmart.com", role: "Inventory", salary: 3000, lastPaid: "2026-08-30", status: "paid" },
];

export function getSalaryRecords() {
  return salaryRecords.map((record) => ({ ...record }));
}

export function getSalarySummary(records) {
  const total = records.reduce((sum, record) => sum + record.salary, 0);
  const paid = records
    .filter((record) => record.status === "paid")
    .reduce((sum, record) => sum + record.salary, 0);
  return {
    total,
    paid,
    pending: total - paid,
    nextPayrollDate: NEXT_PAYROLL_DATE,
  };
}

export function markSalaryPaid(record) {
  record.status = "paid";
  record.lastPaid = new Date().toISOString();
  return record;
}