import { create } from "zustand";
import type {
  Project,
  Entity,
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
  currentEntityId: string | null;
  selectEntity: (id: string | null) => void;
  addEntity: (entity: Entity) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  removeEntity: (id: string) => void;

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
    set({ project, currentEntityId: null, currentMesh: null });
  },

  // Sketch
  currentEntityId: null,
  selectEntity: (id) => set({ currentEntityId: id }),

  addEntity: (entity) => {
    const project = get().project;
    if (!project) return;
    get().pushUndo();
    project.sketch.entities.push(entity);
    set({ project: { ...project }, currentEntityId: entity.id });
  },

  updateEntity: (id, updates) => {
    const project = get().project;
    if (!project) return;
    const idx = project.sketch.entities.findIndex((e) => e.id === id);
    if (idx === -1) return;
    project.sketch.entities[idx] = { ...project.sketch.entities[idx], ...updates };
    set({ project: { ...project } });
  },

  removeEntity: (id) => {
    const project = get().project;
    if (!project) return;
    get().pushUndo();
    project.sketch.entities = project.sketch.entities.filter((e) => e.id !== id);
    set({ project: { ...project }, currentEntityId: null, currentMesh: null });
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
      currentEntityId: null,
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
      currentEntityId: null,
      currentMesh: null,
    });
  },

  // Status
  statusText: "Pronto",
  errorText: null,
  setStatus: (text) => set({ statusText: text }),
  setError: (text) => set({ errorText: text }),
}));
