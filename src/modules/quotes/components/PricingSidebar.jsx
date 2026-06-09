import useQuoteStore from "../stores/quoteStore";

export default function PricingSidebar({ lineItems, canGeneratePdf, onGeneratePdf }) {
  const snapshot = useQuoteStore((state) => state.getSnapshot());

  return (
    <aside className="tw-pricing-sidebar">
      <h4>Live pricing</h4>
      <p className="tw-muted-text">
        {snapshot.vehicle.variant_name || "No vehicle selected"}
        {snapshot.vehicle.colour ? ` - ${snapshot.vehicle.colour}` : ""}
      </p>

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
      <small className="tw-muted-text">
        Valid until: {snapshot.meta.valid_until ? new Date(snapshot.meta.valid_until).toLocaleDateString() : "-"}
      </small>

      <button type="button" disabled={!canGeneratePdf} onClick={onGeneratePdf}>
        Generate PDF
      </button>
    </aside>
  );
}
