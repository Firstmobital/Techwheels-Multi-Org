import SchemeCard from "../components/SchemeCard";

function isSchemeValidToday(scheme) {
  const today = new Date();
  const start = scheme.valid_from ? new Date(scheme.valid_from) : null;
  const end = scheme.valid_to ? new Date(scheme.valid_to) : null;

  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

export default function Step5Schemes({ bootstrap, snapshot, setSchemes, calculateSchemesTotal }) {
  const schemes = (bootstrap.schemes || []).filter((scheme) => {
    const applicable = !scheme.applicable_variants?.length || scheme.applicable_variants.includes(snapshot.vehicle.variant_id);
    return applicable && isSchemeValidToday(scheme);
  });

  return (
    <div className="tw-step-grid">
      <h3>Schemes</h3>
      <div className="tw-quote-grid-3">
        {schemes.map((scheme) => {
          const selected = snapshot.schemes.ids.includes(scheme.id);
          return (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              selected={selected}
              onToggle={() => {
                const ids = selected
                  ? snapshot.schemes.ids.filter((id) => id !== scheme.id)
                  : [...snapshot.schemes.ids, scheme.id];
                const rows = schemes.filter((row) => ids.includes(row.id));
                setSchemes({ ids, rows, total: calculateSchemesTotal(rows) });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
