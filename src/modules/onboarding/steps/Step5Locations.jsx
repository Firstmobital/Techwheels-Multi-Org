import { useEffect, useMemo, useState } from "react";
import { addOrgLocation, listOrgLocations } from "../../../lib/db/onboarding";
import { toast } from "../../../stores/toastStore";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Delhi",
  "Gujarat",
  "Karnataka",
  "Maharashtra",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
];

export default function Step5Locations({ orgId, registerSubmit, setStepValid }) {
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ name: "", city: "", state: "Maharashtra", is_active: true });

  useEffect(() => {
    if (!orgId) return;
    listOrgLocations().then(setLocations).catch(() => setLocations([]));
  }, [orgId]);

  const valid = useMemo(() => locations.length > 0, [locations.length]);

  useEffect(() => {
    setStepValid(5, valid);
  }, [setStepValid, valid]);

  useEffect(() => {
    registerSubmit(async () => ({ ok: valid }));
  }, [registerSubmit, valid]);

  async function addLocation() {
    if (!orgId || !form.name.trim() || !form.city.trim() || !form.state) {
      toast.error("Enter location name, city, and state.");
      return;
    }

    const row = await addOrgLocation({ orgId, location: form });
    setLocations((prev) => [...prev, row]);
    setForm({ name: "", city: "", state: "Maharashtra", is_active: true });
  }

  return (
    <div className="tw-step-grid">
      <h3>Step 5: Add locations</h3>
      <div className="tw-inline-grid">
        <input
          placeholder="Location name"
          value={form.name}
          onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))}
        />
        <input
          placeholder="City"
          value={form.city}
          onChange={(event) => setForm((p) => ({ ...p, city: event.target.value }))}
        />
        <select value={form.state} onChange={(event) => setForm((p) => ({ ...p, state: event.target.value }))}>
          {INDIAN_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <label className="tw-toggle-row">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => setForm((p) => ({ ...p, is_active: event.target.checked }))}
          />
          Active
        </label>
        <button type="button" onClick={addLocation}>Add location</button>
      </div>

      <ul className="tw-list">
        {locations.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong> - {item.city}, {item.state}
          </li>
        ))}
      </ul>

      {!valid && <p className="tw-inline-error">Add at least one location to continue.</p>}
    </div>
  );
}
