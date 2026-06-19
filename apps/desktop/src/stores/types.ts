import type {
  Entity,
  Mesh,
  Project,
  SketchImage,
  ToolMode,
  ViewMode,
  ViewportState,
} from "../types";

export type EntityDragTarget =
  | { kind: "point"; entityId: string; pointIndex: number }
  | { kind: "segment"; entityId: string; segIdx: number }
  | { kind: "entity"; entityId: string }
  | { kind: "spline-handle"; entityId: string; anchorIndex: number };

export interface AppStore {
  project: Project | null;
  projectPath: string | null;
  setProject: (project: Project) => void;

  selectedEntityIds: string[];
  selectEntity: (id: string | null, shiftKey?: boolean) => void;
  setSelectedEntityIds: (ids: string[]) => void;
  addEntity: (entity: Entity) => void;
  addImage: (image: SketchImage) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  updateImage: (id: string, updates: Partial<SketchImage>) => void;
  updateImageCommitted: (id: string, updates: Partial<SketchImage>) => void;
  removeSelectedEntities: () => void;

  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  viewport: ViewportState;
  setViewport: (vp: Partial<ViewportState>) => void;

  currentMesh: Mesh | null;
  setCurrentMesh: (mesh: Mesh | null) => void;
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
