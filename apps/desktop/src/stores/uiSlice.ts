import type { AppStore, EntityDragTarget, StoreSlice } from "./types";

type UiSlice = Pick<
  AppStore,
  | "toolMode"
  | "setToolMode"
  | "viewMode"
  | "setViewMode"
  | "viewport"
  | "setViewport"
  | "bodies"
  | "bodyErrors"
  | "setBodies"
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
  | "entityDragTarget"
  | "setEntityDragTarget"
  | "snapToGrid"
  | "setSnapToGrid"
  | "statusText"
  | "errorText"
  | "setStatus"
  | "setError"
  | "isSketching"
  | "setIsSketching"
  | "workingPlane"
  | "setWorkingPlane"
  | "faceSelectionActive"
  | "setFaceSelectionActive"
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

  bodies: {},
  bodyErrors: {},
  setBodies: (bodies, errors) => set({ bodies, bodyErrors: errors }),
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

  entityDragTarget: null,
  setEntityDragTarget: (target: EntityDragTarget | null) => set({ entityDragTarget: target }),

  snapToGrid: true,
  setSnapToGrid: (on) => set({ snapToGrid: on }),

  statusText: "Pronto",
  errorText: null,
  setStatus: (text) => set({ statusText: text }),
  setError: (text) => set({ errorText: text }),

  isSketching: false,
  setIsSketching: (on) => set({ isSketching: on }),
  workingPlane: { origin: [0, 0, 0], normal: [0, 0, 1] },
  setWorkingPlane: (plane) => set({ workingPlane: plane }),
  faceSelectionActive: false,
  setFaceSelectionActive: (on) => set({ faceSelectionActive: on }),
});
