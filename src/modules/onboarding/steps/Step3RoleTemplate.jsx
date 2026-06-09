import { useEffect, useMemo, useState } from "react";
import { applyRoleTemplate, listRoleTemplates } from "../../../lib/db/onboarding";

export default function Step3RoleTemplate({ orgId, registerSubmit, setStepValid }) {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    listRoleTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const valid = useMemo(() => Boolean(orgId && selected), [orgId, selected]);

  useEffect(() => {
    setStepValid(3, valid);
  }, [setStepValid, valid]);

  useEffect(() => {
    registerSubmit(async () => {
      if (!valid) return { ok: false };
      await applyRoleTemplate({ orgId, templateKey: selected });
      return { ok: true };
    });
  }, [orgId, registerSubmit, selected, valid]);

  return (
    <div className="tw-step-grid">
      <h3>Step 3: Role template</h3>
      <div className="tw-template-grid">
        {templates.map((template) => (
          <button
            type="button"
            key={template.key}
            className={`tw-template-card${selected === template.key ? " active" : ""}`}
            onClick={() => setSelected(template.key)}
          >
            <strong>{template.label}</strong>
            <p>{template.description}</p>
            <ul>
              {template.roles.map((role) => (
                <li key={`${template.key}-${role.role_name}`}>{role.role_name}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
      {!valid && <p className="tw-inline-error">Select a role template to continue.</p>}
    </div>
  );
}
