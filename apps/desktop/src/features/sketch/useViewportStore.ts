import { useStore } from "../../stores/useStore";
import type { Operation, Project, SketchImage, Tool3DMode, ToolMode, WorkingPlane } from "../../types";
import type { EntityDragTarget, Vertex } from "../../stores/types";

export interface ViewportStoreSelectors {
  project: Project | null;
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  viewport: { offsetX: number; offsetY: number; zoom: number };
  setViewport: (vp: Partial<{ offsetX: number; offsetY: number; zoom: number }>) => void;
  selectedEntityIds: string[];
  selectedVertices: Vertex[];
  selectEntity: (id: string | null, shiftKey?: boolean) => void;
  setSelectedEntityIds: (ids: string[]) => void;
  toggleVertex: (vertex: Vertex, shiftKey?: boolean) => void;
  copySelection: () => void;
  pasteAtPoint: (world: { x: number; y: number }) => string[];
  undo: () => void;
  addEntity: (entity: import("../../types").Entity) => void;
  updateImage: (id: string, updates: Partial<SketchImage>) => void;
  setStatus: (text: string) => void;
  setError: (text: string | null) => void;
  imageRefScaleMode: boolean;
  setImageRefScaleMode: (active: boolean) => void;
  editingImageId: string | null;
  setEditingImageId: (id: string | null) => void;
  entityDragTarget: EntityDragTarget | null;
  setEntityDragTarget: (target: EntityDragTarget | null) => void;
  pushUndo: () => void;
  snapToGrid: boolean;
  updateEntity: (id: string, updates: Partial<import("../../types").Entity>) => void;
  setSnapToGrid: (on: boolean) => void;
  bodies: Record<string, import("../../types").Mesh>;
  previewWireframe: boolean;
  isSketching: boolean;
  workingPlane: WorkingPlane;
  faceSelectionActive: boolean;
  setFaceSelectionActive: (on: boolean) => void;
  planePickerActive: boolean;
  setPlanePickerActive: (on: boolean) => void;
  setIsSketching: (on: boolean) => void;
  setWorkingPlane: (plane: WorkingPlane) => void;
  tool3DMode: Tool3DMode;
  setTool3DMode: (mode: Tool3DMode) => void;
  extrudeMode: "normal" | "thin";
  wallHeight: number;
  wallThickness: number;
  offsetSide: "center" | "inside" | "outside";
  addOperation: (op: Operation) => void;
  removeOperation: (id: string) => void;
  selectedOperationId: string | null;
  selectOperation: (id: string | null) => void;
  translateEntity: (
    id: string,
    dx: number,
    dy: number,
    options?: { pushUndo?: boolean; alreadyPushed?: boolean },
  ) => void;
  addDimension: (dim: import("../../types").Dimension) => void;
  updateDimensionValue: (id: string, value: number) => void;
  removeDimension: (id: string) => void;
}

export function useViewportStore(): ViewportStoreSelectors {
  return {
    project: useStore((s) => s.project),
    toolMode: useStore((s) => s.toolMode),
    setToolMode: useStore((s) => s.setToolMode),
    viewport: useStore((s) => s.viewport),
    setViewport: useStore((s) => s.setViewport),
    selectedEntityIds: useStore((s) => s.selectedEntityIds),
    selectedVertices: useStore((s) => s.selectedVertices),
    selectEntity: useStore((s) => s.selectEntity),
    setSelectedEntityIds: useStore((s) => s.setSelectedEntityIds),
    toggleVertex: useStore((s) => s.toggleVertex),
    copySelection: useStore((s) => s.copySelection),
    pasteAtPoint: useStore((s) => s.pasteAtPoint),
    undo: useStore((s) => s.undo),
    addEntity: useStore((s) => s.addEntity),
    updateImage: useStore((s) => s.updateImage),
    setStatus: useStore((s) => s.setStatus),
    setError: useStore((s) => s.setError),
    imageRefScaleMode: useStore((s) => s.imageRefScaleMode),
    setImageRefScaleMode: useStore((s) => s.setImageRefScaleMode),
    editingImageId: useStore((s) => s.editingImageId),
    setEditingImageId: useStore((s) => s.setEditingImageId),
    entityDragTarget: useStore((s) => s.entityDragTarget),
    setEntityDragTarget: useStore((s) => s.setEntityDragTarget),
    pushUndo: useStore((s) => s.pushUndo),
    snapToGrid: useStore((s) => s.snapToGrid),
    updateEntity: useStore((s) => s.updateEntity),
    setSnapToGrid: useStore((s) => s.setSnapToGrid),
    bodies: useStore((s) => s.bodies),
    previewWireframe: useStore((s) => s.previewWireframe),
    isSketching: useStore((s) => s.isSketching),
    workingPlane: useStore((s) => s.workingPlane),
    faceSelectionActive: useStore((s) => s.faceSelectionActive),
    setFaceSelectionActive: useStore((s) => s.setFaceSelectionActive),
    planePickerActive: useStore((s) => s.planePickerActive),
    setPlanePickerActive: useStore((s) => s.setPlanePickerActive),
    setIsSketching: useStore((s) => s.setIsSketching),
    setWorkingPlane: useStore((s) => s.setWorkingPlane),
    tool3DMode: useStore((s) => s.tool3DMode),
    setTool3DMode: useStore((s) => s.setTool3DMode),
    extrudeMode: useStore((s) => s.extrudeMode),
    wallHeight: useStore((s) => s.wallHeight),
    wallThickness: useStore((s) => s.wallThickness),
    offsetSide: useStore((s) => s.offsetSide),
    addOperation: useStore((s) => s.addOperation),
    removeOperation: useStore((s) => s.removeOperation),
    selectedOperationId: useStore((s) => s.selectedOperationId),
    selectOperation: useStore((s) => s.selectOperation),
    translateEntity: useStore((s) => s.translateEntity),
    addDimension: useStore((s) => s.addDimension),
    updateDimensionValue: useStore((s) => s.updateDimensionValue),
    removeDimension: useStore((s) => s.removeDimension),
  };
}
