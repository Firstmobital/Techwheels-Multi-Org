import { create } from "zustand";

const initialState = {
  customer: { name: "", phone: "", email: "" },
  vehicle: {
    make: "",
    model: "",
    variant_id: "",
    variant_name: "",
    colour: "",
    esp: 0,
    ndp: 0,
  },
  rto: { rto_type_id: "", rto_name: "", amount: 0 },
  insurance: {
    insurance_company_id: "",
    company_name: "",
    rates: null,
    addon_ids: [],
    addon_rows: [],
    totals: { tp: 0, od: 0, idv: 0, addonTotal: 0, gstOnOd: 0, total: 0 },
  },
  accessories: { ids: [], rows: [], total: 0 },
  schemes: { ids: [], rows: [], total: 0 },
  totals: { tcs: 0, total: 0 },
  meta: { location_id: "", validity_days: 30, valid_until: null, quote_id: null },
};

const useQuoteStore = create((set, get) => ({
  ...initialState,
  setCustomer: (customer) => set((state) => ({ customer: { ...state.customer, ...customer } })),
  setVehicle: (vehicle) => set((state) => ({ vehicle: { ...state.vehicle, ...vehicle } })),
  setRto: (rto) => set((state) => ({ rto: { ...state.rto, ...rto } })),
  setInsurance: (insurance) => set((state) => ({ insurance: { ...state.insurance, ...insurance } })),
  setAccessories: (accessories) => set((state) => ({ accessories: { ...state.accessories, ...accessories } })),
  setSchemes: (schemes) => set((state) => ({ schemes: { ...state.schemes, ...schemes } })),
  setTotals: (totals) => set((state) => ({ totals: { ...state.totals, ...totals } })),
  setMeta: (meta) => set((state) => ({ meta: { ...state.meta, ...meta } })),
  resetQuote: () => set({ ...initialState }),
  getSnapshot: () => {
    const state = get();
    return {
      customer: state.customer,
      vehicle: state.vehicle,
      rto: state.rto,
      insurance: state.insurance,
      accessories: state.accessories,
      schemes: state.schemes,
      totals: state.totals,
      meta: state.meta,
    };
  },
}));

export default useQuoteStore;
