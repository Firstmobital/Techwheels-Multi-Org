import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../lib/supabase";
import { toast } from "../../../stores/toastStore";

function emptyRow() {
  return {
    name: "",
    amount: "",
    valid_from: "",
    valid_to: "",
    is_active: true,
    applicable_variants: [],
  };
}

export default function SchemesManagement() {
  const client = getSupabaseClient();
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState(emptyRow());

  async function hydrate() {
    const { data, error } = await client.from("org_schemes").select("*").order("name");
    if (error) throw error;
    setRows(data || []);
  }

  useEffect(() => {
    hydrate().catch(() => toast.error("Failed to load schemes."));
  }, []);

  async function saveNew() {
    const { error } = await client.from("org_schemes").insert({
      ...draft,
      amount: Number(draft.amount || 0),
    });

    if (error) {
      toast.error("Failed to add scheme.");
      return;
    }

    setDraft(emptyRow());
    toast.success("Scheme added.");
    await hydrate();
  }

  async function updateRow(id, patch) {
    const { error } = await client.from("org_schemes").update(patch).eq("id", id);
    if (error) {
      toast.error("Failed to update scheme.");
      return;
    }
    await hydrate();
  }

  async function removeRow(id) {
    const { error } = await client.from("org_schemes").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete scheme.");
      return;
    }
    await hydrate();
  }

  return (
    <section className="tw-panel">
      <h3>Schemes Management</h3>
      <table className="tw-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Amount</th>
            <th>Valid from</th>
            <th>Valid to</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} /></td>
            <td><input type="number" value={draft.amount} onChange={(e) => setDraft((p) => ({ ...p, amount: e.target.value }))} /></td>
            <td><input type="date" value={draft.valid_from} onChange={(e) => setDraft((p) => ({ ...p, valid_from: e.target.value }))} /></td>
            <td><input type="date" value={draft.valid_to} onChange={(e) => setDraft((p) => ({ ...p, valid_to: e.target.value }))} /></td>
            <td><input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft((p) => ({ ...p, is_active: e.target.checked }))} /></td>
            <td><button type="button" onClick={saveNew}>Add</button></td>
          </tr>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>INR {Number(row.amount || 0).toLocaleString("en-IN")}</td>
              <td>{row.valid_from || "-"}</td>
              <td>{row.valid_to || "-"}</td>
              <td>
                <input
                  type="checkbox"
                  checked={row.is_active}
                  onChange={(event) => updateRow(row.id, { is_active: event.target.checked }).catch(() => {})}
                />
              </td>
              <td>
                <button type="button" onClick={() => removeRow(row.id).catch(() => {})}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
