import { useEffect, useState } from "react";
import { getApprovalChainConfig, upsertApprovalChainRow } from "../../lib/db/hierarchy";
import { toast } from "../../stores/toastStore";

export default function ApprovalChainConfig() {
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    getApprovalChainConfig()
      .then((data) => {
        setRows(data.rows);
        setRoles(data.roles);
      })
      .catch(() => {
        setRows([]);
        setRoles([]);
      });
  }, []);

  async function updateRow(index, patch) {
    const nextRows = rows.map((row, idx) => (idx === index ? { ...row, ...patch } : row));
    setRows(nextRows);

    const row = nextRows[index];
    try {
      await upsertApprovalChainRow(row.action_type, row.required_role_id, row.can_skip_levels);
      toast.success("Approval chain updated.");
    } catch (_error) {
      toast.error("Failed to save approval chain config.");
    }
  }

  return (
    <section className="tw-panel">
      <h3>Approval chain configuration</h3>
      <p className="tw-muted-text">
        Skip levels: when enabled, approval requests bypass intermediate managers and go directly to the required role.
      </p>
      <table className="tw-table">
        <thead>
          <tr>
            <th>Action type</th>
            <th>Required approver role</th>
            <th>Skip levels</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.action_type}>
              <td>{row.action_label}</td>
              <td>
                <select
                  value={row.required_role_id}
                  onChange={(event) => updateRow(index, { required_role_id: event.target.value })}
                  onBlur={() => updateRow(index, {})}
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={row.can_skip_levels}
                  onChange={(event) => updateRow(index, { can_skip_levels: event.target.checked })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
