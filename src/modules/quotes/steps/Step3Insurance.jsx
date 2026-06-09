import InsurancePlanCard from "../components/InsurancePlanCard";

export default function Step3Insurance({ bootstrap, insuranceRates, snapshot, setInsurance, calculateInsuranceTotals }) {
  const addons = bootstrap.insuranceAddons || [];

  const selectedCompanyRates = insuranceRates.find(
    (row) => row.insurance_company_id === snapshot.insurance.insurance_company_id
  );

  return (
    <div className="tw-step-grid">
      <h3>Insurance</h3>
      <div className="tw-quote-grid-3">
        {(bootstrap.insuranceCompanies || []).map((company) => {
          const rates = insuranceRates.find((row) => row.insurance_company_id === company.id) || {};
          const totals = calculateInsuranceTotals(rates, [], snapshot.vehicle.esp);

          return (
            <InsurancePlanCard
              key={company.id}
              company={company}
              selected={snapshot.insurance.insurance_company_id === company.id}
              totals={totals}
              onSelect={() =>
                setInsurance({
                  insurance_company_id: company.id,
                  company_name: company.name,
                  rates,
                  totals,
                  addon_ids: [],
                  addon_rows: [],
                })
              }
            />
          );
        })}
      </div>

      {snapshot.insurance.insurance_company_id && (
        <div>
          <h4>Insurance add-ons</h4>
          <div className="tw-quote-grid-3">
            {addons.map((addon) => {
              const selected = snapshot.insurance.addon_ids.includes(addon.id);
              return (
                <label key={addon.id} className={`tw-quote-card${selected ? " active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const nextIds = selected
                        ? snapshot.insurance.addon_ids.filter((id) => id !== addon.id)
                        : [...snapshot.insurance.addon_ids, addon.id];
                      const nextRows = addons.filter((row) => nextIds.includes(row.id));
                      const totals = calculateInsuranceTotals(selectedCompanyRates || {}, nextRows, snapshot.vehicle.esp);

                      setInsurance({ addon_ids: nextIds, addon_rows: nextRows, totals });
                    }}
                  />
                  <strong>{addon.name}</strong>
                  <div>INR {Number(addon.price || 0).toLocaleString("en-IN")}</div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
