import { useEffect, useState } from "react";
import {
  addRole,
  cloneRole,
  deleteRole,
  getRolesManagementData,
  setDefaultRole,
  updateRole,
} from "../../lib/db/hierarchy";
import { toast } from "../../stores/toastStore";

export default function RolesManagement() {
  const [roles, setRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [rolePermissionRights, setRolePermissionRights] = useState([]);
  const [newRole, setNewRole] = useState({ name: "", description: "" });

  async function hydrate() {
    const data = await getRolesManagementData();
    setRoles(data.roles);
    setRolePermissions(data.rolePermissions);
    setRolePermissionRights(data.rolePermissionRights);
  }

  useEffect(() => {
    hydrate().catch(() => toast.error("Failed to load roles."));
  }, []);

  async function handleAddRole() {
    if (!roles[0]?.org_id || !newRole.name.trim()) return;
    await addRole(roles[0].org_id, newRole.name.trim(), newRole.description.trim());
    setNewRole({ name: "", description: "" });
    await hydrate();
  }

  async function handleClone(role) {
    await cloneRole(role, rolePermissions, rolePermissionRights);
    await hydrate();
    toast.success("Role cloned.");
  }

  async function handleDelete(role) {
    if (role.employee_count > 0) return;
    await deleteRole(role.id);
    await hydrate();
  }

  async function handleToggleDefault(role) {
    await setDefaultRole(role);
    await hydrate();
  }

  async function handleInlineEdit(roleId, updates) {
    await updateRole(roleId, updates);
    await hydrate();
  }

  return (
    <section className="tw-panel">
      <h3>Roles management</h3>
      <table className="tw-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Employee count</th>
            <th>Default</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <input
                value={newRole.name}
                onChange={(event) => setNewRole((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="New role"
              />
            </td>
            <td>
              <input
                value={newRole.description}
                onChange={(event) => setNewRole((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Description"
              />
            </td>
            <td>-</td>
            <td>-</td>
            <td>
              <button type="button" onClick={handleAddRole}>Add role</button>
            </td>
          </tr>
          {roles.map((role) => (
            <tr key={role.id}>
              <td>
                <input
                  value={role.name}
                  onChange={(event) =>
                    setRoles((prev) => prev.map((item) => (item.id === role.id ? { ...item, name: event.target.value } : item)))
                  }
                  onBlur={(event) =>
                    handleInlineEdit(role.id, { name: event.target.value }).catch(() => {
                      toast.error("Failed to update role name.");
                    })
                  }
                />
              </td>
              <td>
                <input
                  value={role.description || ""}
                  onChange={(event) =>
                    setRoles((prev) =>
                      prev.map((item) =>
                        item.id === role.id ? { ...item, description: event.target.value } : item
                      )
                    )
                  }
                  onBlur={(event) =>
                    handleInlineEdit(role.id, { description: event.target.value }).catch(() => {
                      toast.error("Failed to update role description.");
                    })
                  }
                />
              </td>
              <td>{role.employee_count}</td>
              <td>
                <input
                  type="checkbox"
                  checked={role.is_default}
                  onChange={() =>
                    handleToggleDefault(role).catch(() => {
                      toast.error("Failed to set default role.");
                    })
                  }
                />
              </td>
              <td>
                <button type="button" onClick={() => handleClone(role).catch(() => toast.error("Clone failed."))}>
                  Clone
                </button>
                <button
                  type="button"
                  title={role.employee_count > 0 ? "Remove all employees from this role first" : "Delete role"}
                  disabled={role.employee_count > 0}
                  onClick={() => handleDelete(role).catch(() => toast.error("Delete failed."))}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
