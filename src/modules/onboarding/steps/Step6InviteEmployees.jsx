import { useEffect, useMemo, useState } from "react";
import { listOrgLocations, listOrgRoles, listEmployeeInvites, sendEmployeeInvite } from "../../../lib/db/onboarding";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "../../../stores/toastStore";

export default function Step6InviteEmployees({ orgId, registerSubmit, setStepValid }) {
  const { employee } = useAuth();
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [invites, setInvites] = useState([]);
  const [form, setForm] = useState({ email: "", roleId: "", locationIds: [] });

  useEffect(() => {
    if (!orgId) return;

    Promise.all([listOrgRoles(), listOrgLocations(), listEmployeeInvites()])
      .then(([roleRows, locationRows, inviteRows]) => {
        setRoles(roleRows);
        setLocations(locationRows);
        setInvites(inviteRows);
      })
      .catch(() => {
        setRoles([]);
        setLocations([]);
        setInvites([]);
      });
  }, [orgId]);

  const valid = useMemo(() => Boolean(orgId), [orgId]);

  useEffect(() => {
    setStepValid(6, valid);
  }, [setStepValid, valid]);

  useEffect(() => {
    registerSubmit(async () => ({ ok: true }));
  }, [registerSubmit]);

  async function sendInvite() {
    if (!form.email || !form.roleId) {
      toast.error("Email and role are required.");
      return;
    }

    const response = await sendEmployeeInvite({
      orgId,
      email: form.email,
      roleId: form.roleId,
      locationIds: form.locationIds,
      invitedBy: employee?.id,
    });

    setInvites((prev) => [response.invite, ...prev]);
    setForm({ email: "", roleId: "", locationIds: [] });

    if (response.warning) {
      toast.info("Invite saved. Email provider not configured, copy the link manually.");
    } else {
      toast.success("Invite sent.");
    }
  }

  function toggleLocation(id) {
    setForm((prev) => ({
      ...prev,
      locationIds: prev.locationIds.includes(id)
        ? prev.locationIds.filter((item) => item !== id)
        : [...prev.locationIds, id],
    }));
  }

  return (
    <div className="tw-step-grid">
      <h3>Step 6: Invite employees</h3>
      <div className="tw-inline-grid">
        <input
          type="email"
          placeholder="Employee email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        />
        <select
          value={form.roleId}
          onChange={(event) => setForm((prev) => ({ ...prev, roleId: event.target.value }))}
        >
          <option value="">Select role</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <div className="tw-chip-wrap">
          {locations.map((location) => (
            <label key={location.id} className="tw-chip-checkbox">
              <input
                type="checkbox"
                checked={form.locationIds.includes(location.id)}
                onChange={() => toggleLocation(location.id)}
              />
              {location.name}
            </label>
          ))}
        </div>
        <button type="button" onClick={sendInvite}>Send invite</button>
      </div>

      <table className="tw-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Invite link</th>
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => {
            const link = `${window.location.origin}/accept-invite?token=${invite.token}`;
            return (
              <tr key={invite.id}>
                <td>{invite.email}</td>
                <td>{invite.org_roles?.name || "-"}</td>
                <td>{invite.accepted_at ? "Accepted" : "Pending"}</td>
                <td>
                  <button type="button" onClick={() => navigator.clipboard.writeText(link)}>
                    Copy invite link
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
