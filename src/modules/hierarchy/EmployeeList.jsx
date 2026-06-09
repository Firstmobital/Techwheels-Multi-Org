import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const STAGE_COLORS = {
  hr: "#94A3B8",
  it: "#2563EB",
  security: "#F59E0B",
  accounts: "#06B6D4",
  manager: "#7C3AED",
  complete: "#10B981",
};

export default function EmployeeList() {
  const { employee } = useAuth();
  const [filters, setFilters] = useState({ location: "", role: "", stage: "" });

  const rows = useMemo(() => {
    if (!employee) return [];

    return [
      {
        id: employee.id,
        full_name: employee.full_name ?? "Current User",
        role: employee.role_name ?? "Role",
        locations: employee.location_ids?.length ? employee.location_ids.join(", ") : "-",
        stage: employee.onboarding_stage ?? "hr",
        joined: employee.created_at,
      },
    ].filter((row) => {
      const locationPass = !filters.location || row.locations.includes(filters.location);
      const rolePass = !filters.role || row.role === filters.role;
      const stagePass = !filters.stage || row.stage === filters.stage;
      return locationPass && rolePass && stagePass;
    });
  }, [employee, filters.location, filters.role, filters.stage]);

  return (
    <section className="tw-panel">
      <h2>Employees</h2>

      <div className="tw-filter-row">
        <input
          placeholder="Filter by location"
          value={filters.location}
          onChange={(event) => setFilters((prev) => ({ ...prev, location: event.target.value }))}
        />
        <input
          placeholder="Filter by role"
          value={filters.role}
          onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}
        />
        <select
          value={filters.stage}
          onChange={(event) => setFilters((prev) => ({ ...prev, stage: event.target.value }))}
        >
          <option value="">All stages</option>
          <option value="hr">HR</option>
          <option value="it">IT</option>
          <option value="security">Security</option>
          <option value="accounts">Accounts</option>
          <option value="manager">Manager</option>
          <option value="complete">Complete</option>
        </select>
      </div>

      <table className="tw-table">
        <thead>
          <tr>
            <th>Full name</th>
            <th>Role</th>
            <th>Locations</th>
            <th>Onboarding stage</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.id}>
                <td>{row.full_name}</td>
                <td>{row.role}</td>
                <td>{row.locations}</td>
                <td>
                  <span
                    className="tw-stage-badge"
                    style={{ backgroundColor: STAGE_COLORS[row.stage] || "#94A3B8" }}
                  >
                    {row.stage}
                  </span>
                </td>
                <td>{row.joined ? new Date(row.joined).toLocaleDateString() : "-"}</td>
                <td>
                  <button type="button">View / Edit</button>
                  <button type="button">Re-send invite</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6}>No employees found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
