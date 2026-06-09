export default function InsurancePlanCard({ company, selected, totals, onSelect }) {
  return (
    <button type="button" className={`tw-quote-card tw-insurance-card${selected ? " active" : ""}`} onClick={onSelect}>
      <strong>{company.name}</strong>
      <div>TP: INR {Number(totals.tp || 0).toLocaleString("en-IN")}</div>
      <div>OD: INR {Number(totals.od || 0).toLocaleString("en-IN")}</div>
      <div>IDV: INR {Number(totals.idv || 0).toLocaleString("en-IN")}</div>
      <div>GST on OD: INR {Number(totals.gstOnOd || 0).toLocaleString("en-IN")}</div>
      <div className="tw-blue-text">Premium: INR {Number(totals.total || 0).toLocaleString("en-IN")}</div>
    </button>
  );
}
