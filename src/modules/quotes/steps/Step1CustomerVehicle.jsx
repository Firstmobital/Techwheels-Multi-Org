const PHONE_REGEX = /^[6-9][0-9]{9}$/;

export default function Step1CustomerVehicle({ bootstrap, snapshot, setCustomer, setVehicle }) {
  const activeVariants = bootstrap.variants || [];
  const makeOptions = [...new Set(activeVariants.map((v) => v.vehicles_master?.make).filter(Boolean))];
  const modelOptions = [...new Set(activeVariants.filter((v) => v.vehicles_master?.make === snapshot.vehicle.make).map((v) => v.vehicles_master?.model).filter(Boolean))];
  const variantOptions = activeVariants.filter(
    (v) => v.vehicles_master?.make === snapshot.vehicle.make && v.vehicles_master?.model === snapshot.vehicle.model
  );
  const selectedVariant = variantOptions.find((v) => v.id === snapshot.vehicle.variant_id) || null;

  const colourOptions = selectedVariant?.vehicles_master?.colour_name
    ? [selectedVariant.vehicles_master.colour_name]
    : [];

  return (
    <div className="tw-step-grid">
      <h3>Customer & Vehicle</h3>
      <label>Customer name</label>
      <input
        value={snapshot.customer.name}
        onChange={(event) => setCustomer({ name: event.target.value })}
      />

      <label>Mobile</label>
      <input
        value={snapshot.customer.phone}
        onChange={(event) => setCustomer({ phone: event.target.value })}
      />
      {snapshot.customer.phone && !PHONE_REGEX.test(snapshot.customer.phone) && (
        <small className="tw-inline-error">Enter a valid 10-digit Indian mobile number.</small>
      )}

      <label>Email</label>
      <input
        type="email"
        value={snapshot.customer.email}
        onChange={(event) => setCustomer({ email: event.target.value })}
      />

      <label>Make</label>
      <select
        value={snapshot.vehicle.make}
        onChange={(event) =>
          setVehicle({ make: event.target.value, model: "", variant_id: "", variant_name: "", colour: "", esp: 0, ndp: 0 })
        }
      >
        <option value="">Select make</option>
        {makeOptions.map((make) => (
          <option key={make} value={make}>{make}</option>
        ))}
      </select>

      <label>Model</label>
      <select
        value={snapshot.vehicle.model}
        onChange={(event) => setVehicle({ model: event.target.value, variant_id: "", variant_name: "", colour: "", esp: 0, ndp: 0 })}
      >
        <option value="">Select model</option>
        {modelOptions.map((model) => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>

      <label>Variant</label>
      <select
        value={snapshot.vehicle.variant_id}
        onChange={(event) => {
          const variant = variantOptions.find((v) => v.id === event.target.value);
          setVehicle({
            variant_id: variant?.id || "",
            variant_name: variant?.display_name || "",
            esp: Number(variant?.esp || 0),
            ndp: Number(variant?.ndp || 0),
            colour: "",
          });
        }}
      >
        <option value="">Select variant</option>
        {variantOptions.map((variant) => (
          <option key={variant.id} value={variant.id}>
            {variant.display_name} - INR {Number(variant.esp || 0).toLocaleString("en-IN")}
          </option>
        ))}
      </select>

      <label>Colour</label>
      <select value={snapshot.vehicle.colour} onChange={(event) => setVehicle({ colour: event.target.value })}>
        <option value="">Select colour</option>
        {colourOptions.map((colour) => (
          <option key={colour} value={colour}>{colour}</option>
        ))}
      </select>
    </div>
  );
}
