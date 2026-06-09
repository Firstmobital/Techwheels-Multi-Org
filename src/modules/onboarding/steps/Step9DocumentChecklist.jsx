import { useEffect, useMemo, useState } from "react";
import { listDocumentTypes, saveDocumentChecklist } from "../../../lib/db/onboarding";

const STAGES = ["booking", "billing", "delivery"];

export default function Step9DocumentChecklist({ orgId, registerSubmit, setStepValid }) {
  const [types, setTypes] = useState([]);
  const [entries, setEntries] = useState({});

  useEffect(() => {
    listDocumentTypes().then(setTypes).catch(() => setTypes([]));
  }, []);

  const flattened = useMemo(() => {
    return Object.entries(entries)
      .filter(([, value]) => value.enabled)
      .map(([key, value]) => {
        const [document_type, stage] = key.split("::");
        return { document_type, stage, is_mandatory: value.mandatory };
      });
  }, [entries]);

  const valid = useMemo(() => {
    return flattened.some((row) => row.stage === "booking" && row.is_mandatory);
  }, [flattened]);

  useEffect(() => {
    setStepValid(9, valid);
  }, [setStepValid, valid]);

  useEffect(() => {
    registerSubmit(async () => {
      if (!orgId || !valid) return { ok: false };
      await saveDocumentChecklist({ orgId, entries: flattened });
      return { ok: true };
    });
  }, [flattened, orgId, registerSubmit, valid]);

  function entryKey(docType, stage) {
    return `${docType}::${stage}`;
  }

  function update(docType, stage, patch) {
    const key = entryKey(docType, stage);
    setEntries((prev) => ({
      ...prev,
      [key]: {
        enabled: prev[key]?.enabled || false,
        mandatory: prev[key]?.mandatory || false,
        ...patch,
      },
    }));
  }

  return (
    <div className="tw-step-grid">
      <h3>Step 9: Document checklist</h3>
      <div className="tw-doc-grid">
        {STAGES.map((stage) => (
          <section key={stage} className="tw-doc-stage">
            <h4>{stage}</h4>
            {types.map((doc) => {
              const key = entryKey(doc.key, stage);
              const state = entries[key] || { enabled: false, mandatory: false };
              return (
                <div key={key} className="tw-doc-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={state.enabled}
                      onChange={(event) =>
                        update(doc.key, stage, {
                          enabled: event.target.checked,
                          mandatory: event.target.checked ? state.mandatory : false,
                        })
                      }
                    />
                    {doc.label}
                  </label>
                  {state.enabled && (
                    <label>
                      <input
                        type="checkbox"
                        checked={state.mandatory}
                        onChange={(event) => update(doc.key, stage, { mandatory: event.target.checked })}
                      />
                      Mandatory
                    </label>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>
      {!valid && <p className="tw-inline-error">At least one booking-stage document must be mandatory.</p>}
    </div>
  );
}
