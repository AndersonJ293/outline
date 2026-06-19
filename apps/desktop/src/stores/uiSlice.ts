import type { AppStore, StoreSlice } from "./types";

type UiSlice = Pick<
  AppStore,
  | "toolMode"
  | "setToolMode"
  | "viewMode"
  | "setViewMode"
  | "viewport"
  | "setViewport"
  | "currentMesh"
  | "setCurrentMesh"
  | "previewWireframe"
  | "setPreviewWireframe"
  | "wallHeight"
  | "setWallHeight"
  | "wallThickness"
  | "setWallThickness"
  | "offsetSide"
  | "setOffsetSide"
  | "imageRefScaleMode"
  | "setImageRefScaleMode"
  | "editingImageId"
  | "setEditingImageId"
  | "snapToGrid"
  | "setSnapToGrid"
  | "statusText"
  | "errorText"
  | "setStatus"
  | "setError"
>;

export const createUiSlice: StoreSlice<UiSlice> = (set) => ({
  toolMode: "polyline",
  setToolMode: (mode) => set({ toolMode: mode }),

  viewMode: "sketch",
  setViewMode: (mode) => set({ viewMode: mode }),
  viewport: { offsetX: 0, offsetY: 0, zoom: 1 },
  setViewport: (vp) =>
    set((state) => ({
      viewport: { ...state.viewport, ...vp },
    })),

  currentMesh: null,
  setCurrentMesh: (mesh) => set({ currentMesh: mesh }),
  previewWireframe: true,
  setPreviewWireframe: (on) => set({ previewWireframe: on }),

  wallHeight: 15,
  setWallHeight: (h) => set({ wallHeight: h }),
  wallThickness: 1.2,
  setWallThickness: (t) => set({ wallThickness: t }),
  offsetSide: "center",
  setOffsetSide: (s) => set({ offsetSide: s }),

  imageRefScaleMode: false,
  setImageRefScaleMode: (active) => set({ imageRefScaleMode: active }),

  editingImageId: null,
  setEditingImageId: (id) => set({ editingImageId: id }),

  snapToGrid: true,
  setSnapToGrid: (on) => set({ snapToGrid: on }),

  statusText: "Pronto",
  errorText: null,
  setStatus: (text) => set({ statusText: text }),
  setError: (text) => set({ errorText: text }),
});
