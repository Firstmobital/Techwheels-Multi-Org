import { useEffect, useMemo, useState } from "react";
import { listOrgRoles, saveOrgRoles } from "../../../lib/db/onboarding";

export default function Step4CustomiseRoles({ orgId, registerSubmit, setStepValid }) {
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    if (!orgId) return;
    listOrgRoles().then(setRoles).catch(() => setRoles([]));
  }, [orgId]);

  const valid = useMemo(() => Boolean(orgId), [orgId]);

  useEffect(() => {
    setStepValid(4, valid);
  }, [setStepValid, valid]);

  useEffect(() => {
    registerSubmit(async () => {
      if (!orgId) return { ok: false };
      const filtered = roles.filter((role) => role.name?.trim());
      await saveOrgRoles({ orgId, roles: filtered });
      return { ok: true };
    });
  }, [orgId, registerSubmit, roles]);

  function addRole() {
    setRoles((prev) => [
      ...prev,
      { id: crypto.randomUUID(), org_id: orgId, name: "", description: "", is_default: false },
    ]);
  }

  return (
    <div className="tw-step-grid">
      <h3>Step 4: Customise roles</h3>
      <table className="tw-table">
        <thead>
          <tr>
            <th>Role name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role, idx) => (
            <tr key={role.id || idx}>
              <td>
                <input
                  value={role.name || ""}
                  onChange={(event) =>
                    setRoles((prev) =>
                      prev.map((item, index) =>
                        index === idx ? { ...item, name: event.target.value } : item
                      )
                    )
                  }
                />
              </td>
              <td>
                <input
                  value={role.description || ""}
                  onChange={(event) =>
                    setRoles((prev) =>
                      prev.map((item, index) =>
                        index === idx ? { ...item, description: event.target.value } : item
                      )
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addRole}>Add role</button>
    </div>
  );
}
