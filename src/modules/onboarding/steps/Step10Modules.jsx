import { useEffect, useMemo, useState } from "react";
import { listModules, saveOrgModules } from "../../../lib/db/onboarding";
import { toast } from "../../../stores/toastStore";

export default function Step10Modules({ orgId, registerSubmit, setStepValid }) {
  const [modules, setModules] = useState([]);
  const [selected, setSelected] = useState({});

  useEffect(() => {
    listModules()
      .then((rows) => {
        setModules(rows);
        const defaults = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.key === "core_crm" }), {});
        setSelected(defaults);
      })
      .catch(() => setModules([]));
  }, []);

  const valid = useMemo(() => Boolean(orgId), [orgId]);

  useEffect(() => {
    setStepValid(10, valid);
  }, [setStepValid, valid]);

  useEffect(() => {
    registerSubmit(async () => {
      if (!orgId) return { ok: false };

      const payload = modules.map((moduleRow) => ({
        module_key: moduleRow.key,
        enabled: Boolean(selected[moduleRow.key]),
      }));

      await saveOrgModules({ orgId, modules: payload });
      return { ok: true };
    });
  }, [modules, orgId, registerSubmit, selected]);

  function onAddon(moduleKey) {
    console.log("Razorpay checkout stub", moduleKey);
    setSelected((prev) => ({ ...prev, [moduleKey]: true }));
    toast.success("Addon simulated as purchased.");
  }

  return (
    <div className="tw-step-grid">
      <h3>Step 10: Choose modules</h3>
      <div className="tw-template-grid">
        {modules.map((moduleRow) => {
          const active = Boolean(selected[moduleRow.key]);
          return (
            <div key={moduleRow.key} className={`tw-template-card${active ? " active" : ""}`}>
              <strong>{moduleRow.label}</strong>
              <p>{moduleRow.description}</p>
              <span className={`tw-status-pill ${moduleRow.is_addon ? "addon" : "included"}`}>
                {moduleRow.is_addon ? "Available as add-on" : "Included in plan"}
              </span>
              {moduleRow.is_addon ? (
                <button type="button" onClick={() => onAddon(moduleRow.key)}>
                  {active ? "Added" : "Add to plan"}
                </button>
              ) : (
                <button type="button" disabled>
                  Included
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
