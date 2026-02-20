import { create } from "zustand";

export const usePipelineTrace = create((set) => ({
  logs: [],
  add: (log) => set((state) => ({ logs: [...state.logs, log] })),
  clear: () => set({ logs: [] })
}));

export function addPipelineLog(log) {
  usePipelineTrace.getState().add(log);
}
