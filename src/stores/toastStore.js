import { create } from "zustand";

const DISMISS_MS = 4000;

const useToastStore = create((set, get) => ({
  items: [],
  push: (type, message) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    set((state) => ({
      items: [...state.items, { id, type, message }],
    }));

    window.setTimeout(() => {
      get().remove(id);
    }, DISMISS_MS);
  },
  remove: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
}));

export const toast = {
  success: (message) => useToastStore.getState().push("success", message),
  error: (message) => useToastStore.getState().push("error", message),
  info: (message) => useToastStore.getState().push("info", message),
};

export default useToastStore;
