export function calculateEsp(orgVariant) {
  return Number(orgVariant?.esp || 0);
}

export function calculateRto(rtoCharge) {
  return Number(rtoCharge || 0);
}

export function calculateInsurance(rates, addons, esp) {
  const tp = Number(rates?.tp_rate || 0);
  const odRate = Number(rates?.od_rate_percent || 0);
  const idvPercent = Number(rates?.idv_percent || 95);
  const idv = (Number(esp || 0) * idvPercent) / 100;
  const od = (Number(esp || 0) * odRate) / 100;
  const addonTotal = (addons || []).reduce((sum, addon) => sum + Number(addon.price || 0), 0);
  const gstOnOd = od * 0.18;
  const total = tp + od + gstOnOd + addonTotal;

  return { tp, od, idv, addonTotal, gstOnOd, total };
}

export function calculateAccessories(selectedAccessories) {
  return (selectedAccessories || []).reduce((sum, row) => sum + Number(row.price || 0), 0);
}

export function calculateSchemes(selectedSchemes) {
  return (selectedSchemes || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

export function calculateTcs(subtotal, tcsThreshold) {
  const threshold = Number(tcsThreshold || 1000000);
  if (Number(subtotal || 0) <= threshold) return 0;
  return Number(subtotal || 0) * 0.01;
}

export function calculateTotal(esp, rto, insurance, accessories, schemes, tcs) {
  return Number(esp || 0) + Number(rto || 0) + Number(insurance || 0) + Number(accessories || 0) - Number(schemes || 0) + Number(tcs || 0);
}
