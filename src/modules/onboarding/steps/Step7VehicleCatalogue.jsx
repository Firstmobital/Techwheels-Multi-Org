import { useEffect, useMemo, useState } from "react";
import { listMasterVehicles, saveOrgVariants } from "../../../lib/db/onboarding";

export default function Step7VehicleCatalogue({ orgId, registerSubmit, setStepValid }) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState({});

  useEffect(() => {
    listMasterVehicles().then(setRows).catch(() => setRows([]));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const needle = search.toLowerCase();
    return rows.filter((row) => `${row.make} ${row.model} ${row.variant}`.toLowerCase().includes(needle));
  }, [rows, search]);

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const valid = selectedList.length > 0;

  useEffect(() => {
    setStepValid(7, valid);
  }, [setStepValid, valid]);

  useEffect(() => {
    registerSubmit(async () => {
      if (!orgId || !valid) return { ok: false };
      await saveOrgVariants({ orgId, variants: selectedList });
      return { ok: true };
    });
  }, [orgId, registerSubmit, selectedList, valid]);

  function toggleVariant(row) {
    setSelected((prev) => {
      if (prev[row.id]) {
        const next = { ...prev };
        delete next[row.id];
        return next;
      }

      return {
        ...prev,
        [row.id]: {
          master_variant_id: row.id,
          display_name: `${row.make} ${row.model} ${row.variant}`,
          ndp: "",
          esp: "",
        },
      };
    });
  }

  function updateSelected(id, key, value) {
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  return (
    <div className="tw-step-grid">
      <h3>Step 7: Vehicle catalogue</h3>
      <input
        placeholder="Search make/model/variant"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="tw-vehicle-grid">
        {filtered.map((row) => {
          const checked = Boolean(selected[row.id]);
          return (
            <label key={row.id} className={`tw-vehicle-card${checked ? " active" : ""}`}>
              <input type="checkbox" checked={checked} onChange={() => toggleVariant(row)} />
              <span>{row.make}</span>
              <strong>{row.model} {row.variant}</strong>
              <small>{row.fuel_type} - {row.transmission}</small>
            </label>
          );
        })}
      </div>

      {selectedList.length > 0 && (
        <table className="tw-table">
          <thead>
            <tr>
              <th>Variant</th>
              <th>Display name</th>
              <th>NDP</th>
              <th>ESP</th>
            </tr>
          </thead>
          <tbody>
            {selectedList.map((variant) => (
              <tr key={variant.master_variant_id}>
                <td>{variant.display_name}</td>
                <td>
                  <input
                    value={variant.display_name}
                    onChange={(event) =>
                      updateSelected(variant.master_variant_id, "display_name", event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={variant.ndp}
                    onChange={(event) => updateSelected(variant.master_variant_id, "ndp", event.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={variant.esp}
                    onChange={(event) => updateSelected(variant.master_variant_id, "esp", event.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!valid && <p className="tw-inline-error">Select at least one vehicle variant to continue.</p>}
    </div>
  );
}
