import { useEffect, useRef, useState } from "react";
import { getWhatsappTemplate, upsertWhatsappTemplate } from "../lib/quoteApi";
import { toast } from "../../../stores/toastStore";

const TOKENS = [
  "{customer_name}",
  "{car_model}",
  "{variant}",
  "{colour}",
  "{total_price}",
  "{validity_date}",
  "{salesperson_name}",
  "{org_name}",
];

const SAMPLE = {
  customer_name: "Aarav Sharma",
  car_model: "Swift",
  variant: "VXi",
  colour: "Silky Silver",
  total_price: "9,71,000",
  validity_date: "30/06/2026",
  salesperson_name: "Riya",
  org_name: "TechWheels Motors",
};

export default function WhatsappTemplateEditor() {
  const [body, setBody] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    getWhatsappTemplate()
      .then((row) => setBody(row?.template_body || ""))
      .catch(() => setBody(""));
  }, []);

  async function save() {
    await upsertWhatsappTemplate(body);
    toast.success("WhatsApp template saved.");
  }

  function insertToken(token) {
    const input = ref.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const next = `${body.slice(0, start)}${token}${body.slice(end)}`;
    setBody(next);

    requestAnimationFrame(() => {
      input.focus();
      input.selectionStart = input.selectionEnd = start + token.length;
    });
  }

  const preview = TOKENS.reduce((msg, token) => {
    const key = token.replace(/[{}]/g, "");
    return msg.replaceAll(token, SAMPLE[key] || "");
  }, body);

  return (
    <section className="tw-panel">
      <h3>WhatsApp Template Editor</h3>
      <div className="tw-chip-wrap">
        {TOKENS.map((token) => (
          <button key={token} type="button" onClick={() => insertToken(token)}>
            {token}
          </button>
        ))}
      </div>
      <textarea ref={ref} rows={7} value={body} onChange={(event) => setBody(event.target.value)} />
      <button type="button" onClick={save}>Save</button>
      <h4>Live preview</h4>
      <div className="tw-pdf-preview">{preview}</div>
    </section>
  );
}
