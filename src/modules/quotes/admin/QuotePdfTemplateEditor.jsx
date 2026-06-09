import { useEffect, useState } from "react";
import { getOrgQuoteTemplate, upsertOrgQuoteTemplate } from "../lib/quoteApi";
import { toast } from "../../../stores/toastStore";

const DEFAULTS = {
  show_ndp: false,
  show_esp: true,
  show_rto: true,
  show_insurance: true,
  show_accessories: true,
  show_schemes: true,
  field_labels: {},
  footer_text: "",
  terms_text: "",
};

export default function QuotePdfTemplateEditor() {
  const [form, setForm] = useState(DEFAULTS);

  useEffect(() => {
    getOrgQuoteTemplate()
      .then((tpl) => setForm({ ...DEFAULTS, ...(tpl || {}) }))
      .catch(() => setForm(DEFAULTS));
  }, []);

  async function save() {
    await upsertOrgQuoteTemplate(form);
    toast.success("PDF template saved.");
  }

  return (
    <div className="tw-summary-layout">
      <section className="tw-panel">
        <h3>PDF Template Editor</h3>
        {[
          "show_ndp",
          "show_esp",
          "show_rto",
          "show_insurance",
          "show_accessories",
          "show_schemes",
        ].map((key) => (
          <label key={key} className="tw-toggle-row">
            <input
              type="checkbox"
              checked={Boolean(form[key])}
              onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.checked }))}
            />
            {key}
          </label>
        ))}

        <label>ESP label</label>
        <input
          value={form.field_labels?.esp || "Ex-Showroom Price"}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              field_labels: { ...(prev.field_labels || {}), esp: event.target.value },
            }))
          }
        />

        <label>Footer text</label>
        <textarea
          rows={3}
          value={form.footer_text || ""}
          onChange={(event) => setForm((prev) => ({ ...prev, footer_text: event.target.value }))}
        />

        <label>Terms text</label>
        <textarea
          rows={3}
          value={form.terms_text || ""}
          onChange={(event) => setForm((prev) => ({ ...prev, terms_text: event.target.value }))}
        />

        <button type="button" onClick={save}>Save</button>
      </section>

      <section className="tw-panel">
        <h3>Live preview</h3>
        <div className="tw-pdf-preview">
          {form.show_esp && <div>{form.field_labels?.esp || "Ex-Showroom Price"}: INR 8,90,000</div>}
          {form.show_rto && <div>RTO: INR 55,000</div>}
          {form.show_insurance && <div>Insurance: INR 32,000</div>}
          {form.show_accessories && <div>Accessories: INR 14,000</div>}
          {form.show_schemes && <div className="tw-green-text">Schemes: - INR 20,000</div>}
          <hr />
          <strong>Total: INR 9,71,000</strong>
          <p>{form.footer_text}</p>
          <small>{form.terms_text}</small>
        </div>
      </section>
    </div>
  );
}
