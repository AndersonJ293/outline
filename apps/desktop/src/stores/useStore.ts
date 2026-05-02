import { create } from "zustand";
import type {
  Project,
  Entity,
  SketchImage,
  Mesh,
  Operation,
  ToolMode,
  ViewMode,
  ViewportState,
  Point,
} from "../types";
import { generateId } from "../types";

interface AppStore {
  // Projeto
  project: Project | null;
  projectPath: string | null;
  setProject: (project: Project) => void;

  // Sketch
  selectedEntityIds: string[];
  selectEntity: (id: string | null, shiftKey?: boolean) => void;
  setSelectedEntityIds: (ids: string[]) => void;
  addEntity: (entity: Entity) => void;
  addImage: (image: SketchImage) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  updateImage: (id: string, updates: Partial<SketchImage>) => void;
  removeSelectedEntities: () => void;

  // Tool
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;

  // View
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  viewport: ViewportState;
  setViewport: (vp: Partial<ViewportState>) => void;

  // 3D
  currentMesh: Mesh | null;
  setCurrentMesh: (mesh: Mesh | null) => void;
  previewWireframe: boolean;
  setPreviewWireframe: (on: boolean) => void;

  // Wall generation params
  wallHeight: number;
  setWallHeight: (h: number) => void;
  wallThickness: number;
  setWallThickness: (t: number) => void;
  offsetSide: "center" | "inside" | "outside";
  setOffsetSide: (s: "center" | "inside" | "outside") => void;

  // Undo/Redo
  undoStack: Project[];
  redoStack: Project[];
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;

  // Imagem
  imageRefScaleMode: boolean;
  setImageRefScaleMode: (active: boolean) => void;

  // Status
  statusText: string;
  errorText: string | null;
  setStatus: (text: string) => void;
  setError: (text: string | null) => void;
}

function cloneProject(p: Project | null): Project | null {
  if (!p) return null;
  return JSON.parse(JSON.stringify(p));
}

export const useStore = create<AppStore>((set, get) => ({
  // Projeto
  project: null,
  projectPath: null,
  setProject: (project) => {
    set({ project, selectedEntityIds: [], currentMesh: null });
  },

  // Sketch
  selectedEntityIds: [],
  selectEntity: (id, shiftKey) => {
    if (id === null) {
      set({ selectedEntityIds: [] });
      return;
    }
    if (shiftKey) {
      const current = new Set(get().selectedEntityIds);
      if (current.has(id)) current.delete(id);
      else current.add(id);
      set({ selectedEntityIds: Array.from(current) });
    } else {
      set({ selectedEntityIds: [id] });
    }
  },
  setSelectedEntityIds: (ids) => set({ selectedEntityIds: ids }),

  addEntity: (entity) => {
    const project = get().project;
    if (!project) return;
    get().pushUndo();
    project.sketch.entities.push(entity);
    set({ project: { ...project }, selectedEntityIds: [entity.id] });
  },

  addImage: (image) => {
    const project = get().project;
    if (!project) return;
    get().pushUndo();
    project.sketch.images = [...(project.sketch.images ?? []), image];
    set({ project: { ...project }, selectedEntityIds: [image.id] });
  },

  updateEntity: (id, updates) => {
    const project = get().project;
    if (!project) return;
    const idx = project.sketch.entities.findIndex((e) => e.id === id);
    if (idx === -1) return;
    project.sketch.entities[idx] = { ...project.sketch.entities[idx], ...updates };
    set({ project: { ...project } });
  },

  updateImage: (id, updates) => {
    const project = get().project;
    if (!project) return;
    const images = project.sketch.images;
    if (!images) return;
    const idx = images.findIndex((img) => img.id === id);
    if (idx === -1) return;
    images[idx] = { ...images[idx], ...updates };
    set({ project: { ...project } });
  },

  removeSelectedEntities: () => {
    const project = get().project;
    const ids = get().selectedEntityIds;
    if (!project || ids.length === 0) return;
    get().pushUndo();
    project.sketch.entities = project.sketch.entities.filter((e) => !ids.includes(e.id));
    project.sketch.images = (project.sketch.images ?? []).filter((img) => !ids.includes(img.id));
    set({ project: { ...project }, selectedEntityIds: [], currentMesh: null });
  },

  // Tool
  toolMode: "polyline",
  setToolMode: (mode) => set({ toolMode: mode }),

  // View
  viewMode: "sketch",
  setViewMode: (mode) => set({ viewMode: mode }),
  viewport: { offsetX: 0, offsetY: 0, zoom: 1 },
  setViewport: (vp) =>
    set((state) => ({
      viewport: { ...state.viewport, ...vp },
    })),

  // 3D
  currentMesh: null,
  setCurrentMesh: (mesh) => set({ currentMesh: mesh }),
  previewWireframe: true,
  setPreviewWireframe: (on) => set({ previewWireframe: on }),

  // Wall params
  wallHeight: 15,
  setWallHeight: (h) => set({ wallHeight: h }),
  wallThickness: 1.2,
  setWallThickness: (t) => set({ wallThickness: t }),
  offsetSide: "center",
  setOffsetSide: (s) => set({ offsetSide: s }),

  // Undo
  undoStack: [],
  redoStack: [],
  pushUndo: () => {
    const project = get().project;
    if (!project) return;
    set((state) => ({
      undoStack: [...state.undoStack.slice(-50), cloneProject(project)!],
      redoStack: [],
    }));
  },
  undo: () => {
    const { undoStack, project } = get();
    if (undoStack.length === 0 || !project) return;
    const prev = undoStack[undoStack.length - 1];
    set({
      project: prev,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, cloneProject(project)!],
      selectedEntityIds: [],
      currentMesh: null,
    });
  },
  redo: () => {
    const { redoStack, project } = get();
    if (redoStack.length === 0 || !project) return;
    const next = redoStack[redoStack.length - 1];
    set({
      project: next,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, cloneProject(project)!],
      selectedEntityIds: [],
      currentMesh: null,
    });
  },

  // Imagem
  imageRefScaleMode: false,
  setImageRefScaleMode: (active) => set({ imageRefScaleMode: active }),

  // Status
  statusText: "Pronto",
  errorText: null,
  setStatus: (text) => set({ statusText: text }),
  setError: (text) => set({ errorText: text }),
}));
