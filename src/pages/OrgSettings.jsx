import { useState } from "react";
import { useOrg } from "../context/OrgContext";
import { upsertOrgTheme } from "../lib/db/orgs";
import { toast } from "../stores/toastStore";

export default function OrgSettings() {
  const { org, orgTheme, refreshOrgContext } = useOrg();
  const [primaryColor, setPrimaryColor] = useState(orgTheme?.primary_color ?? "#2563EB");
  const [logoUrl, setLogoUrl] = useState(orgTheme?.logo_url ?? "");
  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    if (!org?.id) {
      toast.error("Organisation is not available in this session.");
      return;
    }

    setSaving(true);
    const payload = {
      org_id: org.id,
      primary_color: primaryColor,
      logo_url: logoUrl || null,
    };

    try {
      await upsertOrgTheme(payload);
    } catch (_error) {
      setSaving(false);
      toast.error("Unable to save org settings.");
      return;
    }

    setSaving(false);
    toast.success("Org settings updated.");
    refreshOrgContext();
  }

  return (
    <div className="tw-panel">
      <h2>Organisation Settings</h2>
      <div className="tw-form-grid">
        <label>Org name</label>
        <input value={org?.name ?? ""} readOnly />

        <label>Primary colour</label>
        <input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />

        <label>Logo URL</label>
        <input
          type="url"
          value={logoUrl}
          onChange={(event) => setLogoUrl(event.target.value)}
          placeholder="https://example.com/logo.png"
        />
      </div>
      <button type="button" onClick={saveSettings} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
