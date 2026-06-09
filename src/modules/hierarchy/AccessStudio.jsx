import { useEffect, useMemo, useState } from "react";
import {
  getAccessStudioData,
  setRolePermissionRight,
  updateEmployeeRole,
} from "../../lib/db/hierarchy";
import { toast } from "../../stores/toastStore";
import ApprovalChainConfig from "./ApprovalChainConfig";

export default function AccessStudio() {
  const [data, setData] = useState({
    employees: [],
    roles: [],
    permissions: [],
    rights: [],
    rolePermissionMap: new Map(),
    rolePermissionRights: new Set(),
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  async function hydrate() {
    const next = await getAccessStudioData();
    setData(next);
    if (!selectedEmployeeId && next.employees.length) {
      setSelectedEmployeeId(next.employees[0].id);
    }
  }

  useEffect(() => {
    hydrate().catch(() => toast.error("Failed to load Access Studio."));
  }, []);

  const selectedEmployee = useMemo(
    () => data.employees.find((employee) => employee.id === selectedEmployeeId) || null,
    [data.employees, selectedEmployeeId]
  );

  const selectedRole = useMemo(
    () => data.roles.find((role) => role.id === selectedEmployee?.role_id) || null,
    [data.roles, selectedEmployee?.role_id]
  );

  const orgAdminCount = useMemo(
    () => data.employees.filter((employee) => employee.role_name === "Org Admin").length,
    [data.employees]
  );

  const groupedPermissions = useMemo(() => {
    const groups = { core_crm: [], org: [], config: [], other: [] };
    data.permissions.forEach((perm) => {
      if (perm.context.startsWith("org.")) groups.org.push(perm);
      else if (perm.context.startsWith("config.")) groups.config.push(perm);
      else if (perm.module_key === "core_crm") groups.core_crm.push(perm);
      else groups.other.push(perm);
    });
    return groups;
  }, [data.permissions]);

  async function changeRole(nextRoleId) {
    if (!selectedEmployee) return;
    if (selectedEmployee.role_name === "Org Admin" && orgAdminCount <= 1) {
      toast.error("Cannot change role of the only Org Admin.");
      return;
    }

    await updateEmployeeRole(selectedEmployee.id, nextRoleId);
    await hydrate();
    toast.success("Employee role updated.");
  }

  async function toggleRight(permissionId, rightId, enabled) {
    if (!selectedRole?.id) return;
    await setRolePermissionRight({
      roleId: selectedRole.id,
      permissionId,
      rightId,
      enabled,
    });
    await hydrate();
  }

  function renderPermissionRows(groupName, rows) {
    if (!rows.length) return null;

    return (
      <>
        <tr className="tw-section-row">
          <td colSpan={5}>{groupName}</td>
        </tr>
        {rows.map((perm) => {
          const rolePermId = data.rolePermissionMap.get(`${selectedRole?.id}:${perm.id}`);
          return (
            <tr key={perm.id}>
              <td>{perm.label}</td>
              {data.rights.map((right) => {
                const checked = rolePermId
                  ? data.rolePermissionRights.has(`${rolePermId}:${right.name}`)
                  : false;

                return (
                  <td key={`${perm.id}-${right.id}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        toggleRight(perm.id, right.id, event.target.checked).catch(() => {
                          toast.error("Failed to update permission right.");
                        })
                      }
                    />
                  </td>
                );
              })}
            </tr>
          );
        })}
      </>
    );
  }

  return (
    <div className="tw-access-layout">
      <div className="tw-access-left tw-panel">
        <h3>Employees</h3>
        {data.employees.map((employee) => (
          <button
            key={employee.id}
            type="button"
            className={`tw-access-employee${employee.id === selectedEmployeeId ? " active" : ""}`}
            onClick={() => setSelectedEmployeeId(employee.id)}
          >
            <strong>{employee.full_name}</strong>
            <span>{employee.role_name}</span>
          </button>
        ))}
      </div>

      <div className="tw-access-right">
        <section className="tw-panel">
          <h3>Role assignment</h3>
          <p>
            Current role: <strong>{selectedRole?.name || "No role"}</strong>
          </p>
          <select
            value={selectedEmployee?.role_id || ""}
            onChange={(event) =>
              changeRole(event.target.value).catch(() => {
                toast.error("Failed to update role.");
              })
            }
          >
            <option value="">Select role</option>
            {data.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </section>

        <section className="tw-panel">
          <h3>Permission matrix</h3>
          <p className="tw-inline-warning">
            Changes here affect all employees with the {selectedRole?.name || "selected"} role.
          </p>
          <div className="tw-matrix-wrap">
            <table className="tw-table tw-sticky-head">
              <thead>
                <tr>
                  <th>Permission</th>
                  <th>View</th>
                  <th>Edit</th>
                  <th>Approve</th>
                  <th>Export</th>
                </tr>
              </thead>
              <tbody>
                {renderPermissionRows("Core CRM", groupedPermissions.core_crm)}
                {renderPermissionRows("Organisation", groupedPermissions.org)}
                {renderPermissionRows("Configuration", groupedPermissions.config)}
                {renderPermissionRows("Other", groupedPermissions.other)}
              </tbody>
            </table>
          </div>
        </section>

        <ApprovalChainConfig />
      </div>
    </div>
  );
}
