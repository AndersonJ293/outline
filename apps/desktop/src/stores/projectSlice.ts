import type { AppStore, StoreSlice } from "./types";

type ProjectSlice = Pick<
  AppStore,
  | "project"
  | "projectPath"
  | "setProject"
  | "selectedEntityIds"
  | "selectEntity"
  | "setSelectedEntityIds"
  | "addEntity"
  | "addImage"
  | "updateEntity"
  | "updateImage"
  | "removeSelectedEntities"
>;

export const createProjectSlice: StoreSlice<ProjectSlice> = (set, get) => ({
  project: null,
  projectPath: null,
  setProject: (project) => {
    set({ project, selectedEntityIds: [], currentMesh: null, editingImageId: null });
  },

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
    set({
      project: { ...project },
      selectedEntityIds: [image.id],
      editingImageId: image.id,
    });
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
    const editingImageId = get().editingImageId;
    const nextEditingImageId =
      editingImageId && ids.includes(editingImageId) ? null : editingImageId;
    set({
      project: { ...project },
      selectedEntityIds: [],
      currentMesh: null,
      editingImageId: nextEditingImageId,
    });
  },
});
