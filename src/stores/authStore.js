import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: null,
  employee: null,
  setUser: (user) => set({ user }),
  setEmployee: (employee) => set({ employee }),
  clearAuth: () => set({ user: null, employee: null }),
}));

export default useAuthStore;
