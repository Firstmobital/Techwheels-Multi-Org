import { useEffect, useMemo, useState } from "react";
import { saveBranding, uploadOrgLogo } from "../../../lib/db/onboarding";

export default function Step2Branding({ orgId, registerSubmit, setStepValid }) {
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563EB");
  const [fontChoice, setFontChoice] = useState("system");
  const [uploadError, setUploadError] = useState("");

  const valid = useMemo(() => Boolean(orgId), [orgId]);

  useEffect(() => {
    setStepValid(2, valid);
  }, [setStepValid, valid]);

  useEffect(() => {
    document.documentElement.style.setProperty("--brand", primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    registerSubmit(async () => {
      if (!orgId) return { ok: false };
      await saveBranding({ orgId, logoUrl, primaryColor, fontChoice });
      return { ok: true };
    });
  }, [fontChoice, logoUrl, orgId, primaryColor, registerSubmit]);

  async function onFileChange(event) {
    const file = event.target.files?.[0];
    if (!file || !orgId) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Maximum file size is 2MB.");
      return;
    }

    const typeOk = ["image/png", "image/jpeg", "image/svg+xml"].includes(file.type);
    if (!typeOk) {
      setUploadError("Only PNG, JPG, SVG are supported.");
      return;
    }

    setUploadError("");
    const url = await uploadOrgLogo({ orgId, file });
    setLogoUrl(url);
  }

  return (
    <div className="tw-step-grid">
      <h3>Step 2: Branding</h3>
      <label>Logo upload</label>
      <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={onFileChange} />
      {uploadError && <p className="tw-inline-error">{uploadError}</p>}
      {logoUrl ? <img src={logoUrl} alt="Logo preview" className="tw-logo-preview" /> : null}

      <label>Primary colour</label>
      <input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />

      <label>Font choice</label>
      <select value={fontChoice} onChange={(event) => setFontChoice(event.target.value)}>
        <option value="system">System default</option>
        <option value="Inter">Inter</option>
        <option value="Roboto">Roboto</option>
      </select>

      <div className="tw-brand-preview">
        <div className="tw-brand-preview-nav" style={{ background: primaryColor }} />
        <button type="button" style={{ background: primaryColor }}>Primary CTA</button>
      </div>
    </div>
  );
}
