import { useEffect, useMemo, useState } from "react";
import { listOrgVariants, savePricingConfig } from "../../../lib/db/onboarding";

function emptyAccessory() {
  return { id: crypto.randomUUID(), name: "", price: "", part_number: "" };
}

function emptyScheme() {
  return {
    id: crypto.randomUUID(),
    name: "",
    amount: "",
    applicable_variants: [],
    valid_from: "",
    valid_to: "",
  };
}

function emptyRtoType() {
  return { id: crypto.randomUUID(), name: "", description: "" };
}

function emptyRtoCharge() {
  return { id: crypto.randomUUID(), rto_type_name: "", variant_id: "", amount: "" };
}

const DEFAULT_CHARGES = [
  { charge_key: "handling_charge", label: "Handling & Logistics", amount: "" },
  { charge_key: "documentation_fee", label: "Documentation Fee", amount: "" },
  { charge_key: "rto_agent_fee", label: "RTO Agent Fee", amount: "" },
];

export default function Step8ConfigurePricing({ orgId, registerSubmit, setStepValid }) {
  const [variants, setVariants] = useState([]);
  const [accessories, setAccessories] = useState([emptyAccessory()]);
  const [schemes, setSchemes] = useState([emptyScheme()]);
  const [rtoTypes, setRtoTypes] = useState([emptyRtoType()]);
  const [rtoCharges, setRtoCharges] = useState([emptyRtoCharge()]);
  const [orgCharges, setOrgCharges] = useState(DEFAULT_CHARGES);

  useEffect(() => {
    listOrgVariants().then(setVariants).catch(() => setVariants([]));
  }, []);

  const valid = useMemo(() => {
    return rtoTypes.some((typeRow) => typeRow.name.trim());
  }, [rtoTypes]);

  useEffect(() => {
    setStepValid(8, valid);
  }, [setStepValid, valid]);

  useEffect(() => {
    registerSubmit(async () => {
      if (!orgId || !valid) return { ok: false };

      await savePricingConfig({
        orgId,
        accessories: accessories.filter((row) => row.name.trim()),
        schemes: schemes.filter((row) => row.name.trim()),
        rtoTypes: rtoTypes.filter((row) => row.name.trim()),
        rtoCharges: rtoCharges.filter((row) => row.rto_type_name && row.amount !== ""),
        orgCharges,
      });

      return { ok: true };
    });
  }, [accessories, orgCharges, orgId, registerSubmit, rtoCharges, rtoTypes, schemes, valid]);

  return (
    <div className="tw-step-grid">
      <h3>Step 8: Configure pricing</h3>

      <section>
        <h4>Accessories</h4>
        <SimpleEditableTable
          rows={accessories}
          setRows={setAccessories}
          columns={[
            { key: "name", label: "Name" },
            { key: "price", label: "Price" },
            { key: "part_number", label: "Part number" },
          ]}
          createRow={emptyAccessory}
        />
      </section>

      <section>
        <h4>Schemes</h4>
        <SimpleEditableTable
          rows={schemes}
          setRows={setSchemes}
          columns={[
            { key: "name", label: "Name" },
            { key: "amount", label: "Amount" },
            { key: "valid_from", label: "Valid from", type: "date" },
            { key: "valid_to", label: "Valid to", type: "date" },
          ]}
          createRow={emptyScheme}
        />
      </section>

      <section>
        <h4>RTO types</h4>
        <SimpleEditableTable
          rows={rtoTypes}
          setRows={setRtoTypes}
          columns={[
            { key: "name", label: "Registration type" },
            { key: "description", label: "Description" },
          ]}
          createRow={emptyRtoType}
        />
        {!valid && <p className="tw-inline-error">Add at least one RTO type to continue.</p>}
      </section>

      <section>
        <h4>RTO charges</h4>
        <table className="tw-table">
          <thead>
            <tr>
              <th>RTO type</th>
              <th>Variant</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rtoCharges.map((row, index) => (
              <tr key={row.id}>
                <td>
                  <input
                    value={row.rto_type_name}
                    onChange={(event) =>
                      setRtoCharges((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, rto_type_name: event.target.value } : item
                        )
                      )
                    }
                  />
                </td>
                <td>
                  <select
                    value={row.variant_id}
                    onChange={(event) =>
                      setRtoCharges((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, variant_id: event.target.value } : item
                        )
                      )
                    }
                  >
                    <option value="">All variants</option>
                    {variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.display_name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    value={row.amount}
                    onChange={(event) =>
                      setRtoCharges((prev) =>
                        prev.map((item, idx) => (idx === index ? { ...item, amount: event.target.value } : item))
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={() => setRtoCharges((prev) => [...prev, emptyRtoCharge()])}>
          Add RTO charge row
        </button>
      </section>

      <section>
        <h4>Org charges</h4>
        <table className="tw-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {orgCharges.map((charge, index) => (
              <tr key={charge.charge_key}>
                <td>{charge.label}</td>
                <td>
                  <input
                    type="number"
                    value={charge.amount}
                    onChange={(event) =>
                      setOrgCharges((prev) =>
                        prev.map((item, idx) => (idx === index ? { ...item, amount: event.target.value } : item))
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function SimpleEditableTable({ rows, setRows, columns, createRow }) {
  return (
    <div>
      <table className="tw-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map((column) => (
                <td key={column.key}>
                  <input
                    type={column.type || "text"}
                    value={row[column.key] || ""}
                    onChange={(event) =>
                      setRows((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, [column.key]: event.target.value } : item
                        )
                      )
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={() => setRows((prev) => [...prev, createRow()])}>
        Add row
      </button>
    </div>
  );
}
