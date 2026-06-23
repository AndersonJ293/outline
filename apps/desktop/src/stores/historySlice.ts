import type { Project } from "../types";
import type { AppStore, StoreSlice } from "./types";

type HistorySlice = Pick<AppStore, "undoStack" | "redoStack" | "pushUndo" | "undo" | "redo">;

function cloneProject(p: Project | null): Project | null {
  if (!p) return null;
  return JSON.parse(JSON.stringify(p));
}

export const createHistorySlice: StoreSlice<HistorySlice> = (set, get) => ({
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
      bodies: {},
      bodyErrors: {},
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
      bodies: {},
      bodyErrors: {},
    });
  },
});
