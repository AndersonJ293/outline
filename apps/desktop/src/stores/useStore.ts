import { create } from "zustand";
import { createHistorySlice } from "./historySlice";
import { createProjectSlice } from "./projectSlice";
import type { AppStore } from "./types";
import { createUiSlice } from "./uiSlice";

export const useStore = create<AppStore>((set, get) => ({
  ...createProjectSlice(set, get),
  ...createUiSlice(set, get),
  ...createHistorySlice(set, get),
}));
