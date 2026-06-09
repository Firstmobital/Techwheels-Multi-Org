import { describe, expect, it } from "vitest";
import {
  calculateAccessories,
  calculateEsp,
  calculateInsurance,
  calculateRto,
  calculateSchemes,
  calculateTcs,
  calculateTotal,
} from "./quoteCalculations";

describe("quoteCalculations", () => {
  it("calculates ESP and RTO safely", () => {
    expect(calculateEsp({ esp: 890000 })).toBe(890000);
    expect(calculateEsp(null)).toBe(0);
    expect(calculateRto(55000)).toBe(55000);
    expect(calculateRto(undefined)).toBe(0);
  });

  it("calculates insurance totals", () => {
    const result = calculateInsurance(
      { tp_rate: 12000, od_rate_percent: 2.5, idv_percent: 95 },
      [{ price: 3200 }, { price: 1800 }],
      800000
    );

    expect(result.tp).toBe(12000);
    expect(result.od).toBe(20000);
    expect(result.idv).toBe(760000);
    expect(result.addonTotal).toBe(5000);
    expect(result.gstOnOd).toBe(3600);
    expect(result.total).toBe(40600);
  });

  it("calculates accessories, schemes and tcs", () => {
    expect(calculateAccessories([{ price: 1000 }, { price: 500 }])).toBe(1500);
    expect(calculateSchemes([{ amount: 5000 }, { amount: 1500 }])).toBe(6500);
    expect(calculateTcs(950000, 1000000)).toBe(0);
    expect(calculateTcs(1100000, 1000000)).toBe(11000);
  });

  it("calculates final total", () => {
    const total = calculateTotal(900000, 50000, 32000, 10000, 20000, 0);
    expect(total).toBe(972000);
  });
});
