export default function Step2RTO({ bootstrap, snapshot, setRto, getRtoCharge }) {
  return (
    <div className="tw-step-grid">
      <h3>RTO</h3>
      {(bootstrap.rtoTypes || []).map((rtoType) => (
        <label key={rtoType.id} className={`tw-quote-card${snapshot.rto.rto_type_id === rtoType.id ? " active" : ""}`}>
          <input
            type="radio"
            name="rto_type"
            checked={snapshot.rto.rto_type_id === rtoType.id}
            onChange={async () => {
              const amount = await getRtoCharge(rtoType.id, snapshot.vehicle.variant_id);
              setRto({ rto_type_id: rtoType.id, rto_name: rtoType.name, amount });
            }}
          />
          <strong>{rtoType.name}</strong>
          <small>{rtoType.description || "Registration charge"}</small>
          <div>INR {Number(snapshot.rto.rto_type_id === rtoType.id ? snapshot.rto.amount : 0).toLocaleString("en-IN")}</div>
        </label>
      ))}
    </div>
  );
}
