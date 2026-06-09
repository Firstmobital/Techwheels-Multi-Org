import AccessoryToggle from "../components/AccessoryToggle";

export default function Step4Accessories({ bootstrap, snapshot, setAccessories, calculateAccessoriesTotal }) {
  const accessories = bootstrap.accessories || [];

  return (
    <div className="tw-step-grid">
      <h3>Accessories</h3>
      <div className="tw-quote-grid-3">
        {accessories.map((accessory) => {
          const selected = snapshot.accessories.ids.includes(accessory.id);

          return (
            <AccessoryToggle
              key={accessory.id}
              accessory={accessory}
              selected={selected}
              onToggle={() => {
                const ids = selected
                  ? snapshot.accessories.ids.filter((id) => id !== accessory.id)
                  : [...snapshot.accessories.ids, accessory.id];
                const rows = accessories.filter((row) => ids.includes(row.id));
                setAccessories({ ids, rows, total: calculateAccessoriesTotal(rows) });
              }}
            />
          );
        })}
      </div>
      <div className="tw-summary-bar">Accessories subtotal: INR {Number(snapshot.accessories.total || 0).toLocaleString("en-IN")}</div>
    </div>
  );
}
