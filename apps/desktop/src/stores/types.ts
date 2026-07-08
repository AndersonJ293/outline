import type {
  Dimension,
  Entity,
  ExtrudeMode,
  Mesh,
  Operation,
  Point,
  Project,
  SketchImage,
  Tool3DMode,
  ToolMode,
  ViewportState,
  WorkingPlane,
} from "../types";

export type EntityDragTarget =
  | { kind: "point"; entityId: string; pointIndex: number }
  | { kind: "segment"; entityId: string; segIdx: number }
  | { kind: "entity"; entityId: string }
  | { kind: "spline-handle"; entityId: string; anchorIndex: number };

/// A single vertex selection: `pointIndex` indexes `entity.points` for
/// polyline/rectangle and `entity.controlPoints` for splines.
export interface Vertex {
  entityId: string;
  pointIndex: number;
}

export interface AppStore {
  project: Project | null;
  projectPath: string | null;
  setProject: (project: Project) => void;

  selectedEntityIds: string[];
  selectEntity: (id: string | null, shiftKey?: boolean) => void;
  setSelectedEntityIds: (ids: string[]) => void;

  selectedVertices: Vertex[];
  setSelectedVertices: (vertices: Vertex[]) => void;
  toggleVertex: (vertex: Vertex, shiftKey?: boolean) => void;

  clipboard: Entity[];
  copySelection: () => void;
  pasteAtPoint: (world: Point) => string[];

  addEntity: (entity: Entity) => void;
  addOperation: (op: Operation) => void;
  updateOperation: (id: string, updates: Partial<Operation>) => void;
  removeOperation: (id: string) => void;
  selectedOperationId: string | null;
  selectOperation: (id: string | null) => void;
  addImage: (image: SketchImage) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  translateEntity: (
    id: string,
    dx: number,
    dy: number,
    options?: { pushUndo?: boolean; alreadyPushed?: boolean },
  ) => void;
  updateImage: (id: string, updates: Partial<SketchImage>) => void;
  updateImageCommitted: (id: string, updates: Partial<SketchImage>) => void;
  removeSelectedEntities: () => void;
  removeSelectedVertices: () => void;

  addDimension: (dim: Dimension) => void;
  updateDimensionValue: (id: string, value: number) => void;
  removeDimension: (id: string) => void;
  rotateDiameterDimension: (id: string, angle: number) => void;
  updateLinearDimensionOffset: (id: string, offset: number) => void;

  selectedDimensionId: string | null;
  setSelectedDimensionId: (id: string | null) => void;

  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;

  tool3DMode: Tool3DMode;
  setTool3DMode: (mode: Tool3DMode) => void;
  extrudeMode: ExtrudeMode;
  setExtrudeMode: (mode: ExtrudeMode) => void;

  viewport: ViewportState;
  setViewport: (vp: Partial<ViewportState>) => void;

  bodies: Record<string, Mesh>;
  bodyErrors: Record<string, string>;
  setBodies: (bodies: Record<string, Mesh>, errors: Record<string, string>) => void;
  previewWireframe: boolean;
  setPreviewWireframe: (on: boolean) => void;

  wallHeight: number;
  setWallHeight: (h: number) => void;
  wallThickness: number;
  setWallThickness: (t: number) => void;
  offsetSide: "center" | "inside" | "outside";
  setOffsetSide: (s: "center" | "inside" | "outside") => void;

  undoStack: Project[];
  redoStack: Project[];
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;

  imageRefScaleMode: boolean;
  setImageRefScaleMode: (active: boolean) => void;

  editingImageId: string | null;
  setEditingImageId: (id: string | null) => void;

  entityDragTarget: EntityDragTarget | null;
  setEntityDragTarget: (target: EntityDragTarget | null) => void;

  snapToGrid: boolean;
  setSnapToGrid: (on: boolean) => void;

  statusText: string;
  errorText: string | null;
  setStatus: (text: string) => void;
  setError: (text: string | null) => void;

  isSketching: boolean;
  setIsSketching: (on: boolean) => void;
  workingPlane: WorkingPlane;
  setWorkingPlane: (plane: WorkingPlane) => void;
  faceSelectionActive: boolean;
  setFaceSelectionActive: (on: boolean) => void;
  planePickerActive: boolean;
  setPlanePickerActive: (on: boolean) => void;
}

export type StoreSlice<T> = (
  set: (
    partial:
      | Partial<AppStore>
      | AppStore
      | ((state: AppStore) => Partial<AppStore> | AppStore),
    replace?: false,
  ) => void,
  get: () => AppStore,
) => T;
