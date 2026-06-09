export default function SchemeCard({ scheme, selected, onToggle }) {
  return (
    <label className={`tw-quote-card${selected ? " active" : ""}`}>
      <input type="checkbox" checked={selected} onChange={onToggle} />
      <strong>{scheme.name}</strong>
      <div className="tw-green-text">- INR {Number(scheme.amount || 0).toLocaleString("en-IN")}</div>
      <small>
        {scheme.valid_from || "Any"} - {scheme.valid_to || "Any"}
      </small>
    </label>
  );
}
