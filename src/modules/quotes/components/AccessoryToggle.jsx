export default function AccessoryToggle({ accessory, selected, onToggle }) {
  return (
    <label className={`tw-quote-card${selected ? " active" : ""}`}>
      <input type="checkbox" checked={selected} onChange={onToggle} />
      <strong>{accessory.name}</strong>
      <small>{accessory.part_number || "No part number"}</small>
      <div>INR {Number(accessory.price || 0).toLocaleString("en-IN")}</div>
    </label>
  );
}
