export default function Step6Summary({ snapshot, lineItems, pdfPreview, onSaveDraft, onGeneratePdf, onSendWhatsapp }) {
  return (
    <div className="tw-summary-layout">
      <section className="tw-panel">
        <h3>Quote breakdown</h3>
        <div className="tw-pricing-lines">
          {lineItems.map((item) => (
            <div key={item.label} className="tw-pricing-line">
              <span className={item.is_deduction ? "tw-green-text" : ""}>{item.label}</span>
              <strong className={item.is_deduction ? "tw-green-text" : ""}>
                {item.is_deduction ? "- " : ""}INR {Number(item.amount || 0).toLocaleString("en-IN")}
              </strong>
            </div>
          ))}
        </div>
        <div className="tw-pricing-total">INR {Number(snapshot.totals.total || 0).toLocaleString("en-IN")}</div>

        <div className="tw-action-row">
          <button type="button" onClick={onSaveDraft}>Save draft</button>
          <button type="button" onClick={onGeneratePdf}>Generate PDF</button>
          <button type="button" onClick={onSendWhatsapp}>Send on WhatsApp</button>
        </div>
      </section>

      <section className="tw-panel">
        <h3>PDF preview</h3>
        <div className="tw-pdf-preview" dangerouslySetInnerHTML={{ __html: pdfPreview }} />
      </section>
    </div>
  );
}
