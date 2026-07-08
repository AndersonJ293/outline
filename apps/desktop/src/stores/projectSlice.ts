import type { Dimension, Entity, Operation } from "../types";
import { generateId } from "../types";
import { sampleSpline } from "../features/sketch/spline";
import { applyLinearDimension } from "../features/sketch/dimensions";
import type { AppStore, StoreSlice } from "./types";

type ProjectSlice = Pick<
  AppStore,
  | "project"
  | "projectPath"
  | "setProject"
  | "selectedEntityIds"
  | "selectEntity"
  | "setSelectedEntityIds"
  | "selectedOperationId"
  | "selectOperation"
  | "selectedVertices"
  | "setSelectedVertices"
  | "toggleVertex"
  | "clipboard"
  | "copySelection"
  | "pasteAtPoint"
  | "addEntity"
  | "addOperation"
  | "updateOperation"
  | "removeOperation"
  | "addImage"
  | "updateEntity"
  | "translateEntity"
  | "updateImage"
  | "updateImageCommitted"
  | "removeSelectedEntities"
  | "removeSelectedVertices"
  | "addDimension"
  | "updateDimensionValue"
  | "removeDimension"
>;

function cloneEntity(entity: Entity): Entity {
  return JSON.parse(JSON.stringify(entity)) as Entity;
}

export const createProjectSlice: StoreSlice<ProjectSlice> = (set, get) => ({
  project: null,
  projectPath: null,
  setProject: (project) => {
    set({
      project,
      selectedEntityIds: [],
      selectedVertices: [],
      bodies: {},
      bodyErrors: {},
      editingImageId: null,
      entityDragTarget: null,
    });
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
      set({ selectedEntityIds: Array.from(current), selectedOperationId: null });
    } else {
      set({ selectedEntityIds: [id], selectedOperationId: null });
    }
  },
  setSelectedEntityIds: (ids) => set({ selectedEntityIds: ids }),
  selectedOperationId: null,
  selectOperation: (id) => set({ selectedOperationId: id, selectedEntityIds: [] }),

  selectedVertices: [],
  setSelectedVertices: (vertices) => set({ selectedVertices: vertices }),
  toggleVertex: (vertex, shiftKey) => {
    const sameVertex = (a: { entityId: string; pointIndex: number }) =>
      a.entityId === vertex.entityId && a.pointIndex === vertex.pointIndex;
    if (shiftKey) {
      const current = get().selectedVertices;
      const exists = current.some(sameVertex);
      set({
        selectedVertices: exists
          ? current.filter((v) => !sameVertex(v))
          : [...current, vertex],
      });
    } else {
      set({ selectedVertices: [vertex] });
    }
  },

  clipboard: [],
  copySelection: () => {
    const project = get().project;
    const ids = get().selectedEntityIds;
    if (!project || ids.length === 0) return;
    const clipboard = project.sketch.entities
      .filter((e) => ids.includes(e.id))
      .map(cloneEntity);
    set({ clipboard });
  },
  pasteAtPoint: (world) => {
    const project = get().project;
    const clipboard = get().clipboard;
    if (!project || clipboard.length === 0) return [];

    // Centroid of the clipboard bounding box, so the paste lands at the cursor.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const entity of clipboard) {
      for (const p of entity.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const dx = world.x - cx;
    const dy = world.y - cy;

    const newIds: string[] = [];
    const pasted = clipboard.map((entity) => {
      const clone = cloneEntity(entity);
      clone.id = generateId();
      clone.points = clone.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      if (clone.center) {
        clone.center = { x: clone.center.x + dx, y: clone.center.y + dy };
      }
      if (clone.controlPoints) {
        clone.controlPoints = clone.controlPoints.map((cp) => ({
          point: { x: cp.point.x + dx, y: cp.point.y + dy },
          handleOut: { ...cp.handleOut },
        }));
      }
      newIds.push(clone.id);
      return clone;
    });

    get().pushUndo();
    project.sketch.entities.push(...pasted);
    set({
      project: { ...project },
      selectedEntityIds: newIds,
      selectedVertices: [],
    });
    return newIds;
  },

  addEntity: (entity) => {
    const project = get().project;
    if (!project) return;
    get().pushUndo();
    project.sketch.entities.push(entity);
    set({ project: { ...project }, selectedEntityIds: [entity.id] });
  },

  addOperation: (op) => {
    const project = get().project;
    if (!project) return;
    get().pushUndo();
    project.operations.push(op);
    set({ project: { ...project } });
  },

  updateOperation: (id, updates) => {
    const project = get().project;
    if (!project) return;
    const idx = project.operations.findIndex((op) => op.id === id);
    if (idx === -1) return;
    get().pushUndo();
    const nextOperations = [...project.operations];
    nextOperations[idx] = { ...nextOperations[idx], ...updates };
    set({ project: { ...project, operations: nextOperations } });
  },

  removeOperation: (id) => {
    const project = get().project;
    if (!project) return;
    get().pushUndo();
    const nextOperations = project.operations.filter((op) => op.id !== id);
    const selectedOperationId = get().selectedOperationId;
    set({
      project: { ...project, operations: nextOperations },
      selectedOperationId: selectedOperationId === id ? null : selectedOperationId,
    });
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

  updateImageCommitted: (id, updates) => {
    const project = get().project;
    if (!project) return;
    get().pushUndo();
    get().updateImage(id, updates);
  },

  updateEntity: (id, updates) => {
    const project = get().project;
    if (!project) return;
    const idx = project.sketch.entities.findIndex((e) => e.id === id);
    if (idx === -1) return;
    project.sketch.entities[idx] = { ...project.sketch.entities[idx], ...updates };
    set({ project: { ...project } });
  },

  translateEntity: (id, dx, dy, options) => {
    const project = get().project;
    if (!project) return;
    const idx = project.sketch.entities.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const entity = project.sketch.entities[idx];
    if (options?.pushUndo && !options.alreadyPushed) {
      get().pushUndo();
    }
    const nextPoints = entity.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    const nextControlPoints = entity.controlPoints?.map((cp) => ({
      point: { x: cp.point.x + dx, y: cp.point.y + dy },
      handleOut: cp.handleOut,
    }));
    const nextCenter = entity.center
      ? { x: entity.center.x + dx, y: entity.center.y + dy }
      : undefined;
    // New array/sketch references so identity-based consumers (the 3D sketch
    // wireframe effect) re-run on every move, not only on event-driven renders.
    const nextEntities = [...project.sketch.entities];
    nextEntities[idx] = {
      ...entity,
      points: nextPoints,
      center: nextCenter,
      controlPoints: nextControlPoints,
    };
    set({
      project: { ...project, sketch: { ...project.sketch, entities: nextEntities } },
    });
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
    project.sketch.dimensions = (project.sketch.dimensions ?? []).filter(
      (d) => !ids.includes(d.entityId) && !(d.kind === "offset" && ids.includes(d.offsetEntityId)),
    );
    const editingImageId = get().editingImageId;
    const nextEditingImageId =
      editingImageId && ids.includes(editingImageId) ? null : editingImageId;
    const entityDragTarget = get().entityDragTarget;
    const nextEntityDragTarget =
      entityDragTarget && ids.includes(entityDragTarget.entityId)
        ? null
        : entityDragTarget;
    set({
      project: { ...project },
      selectedEntityIds: [],
      selectedVertices: get().selectedVertices.filter(
        (v) => !ids.includes(v.entityId),
      ),
      bodies: {},
      bodyErrors: {},
      editingImageId: nextEditingImageId,
      entityDragTarget: nextEntityDragTarget,
    });
  },

  addDimension: (dim: Dimension) => {
    const project = get().project;
    if (!project) return;
    get().pushUndo();
    project.sketch.dimensions = [...(project.sketch.dimensions ?? []), dim];
    set({ project: { ...project } });
  },

  updateDimensionValue: (id: string, value: number) => {
    const project = get().project;
    if (!project) return;
    const dims = project.sketch.dimensions ?? [];
    const dim = dims.find((d) => d.id === id);
    if (!dim) return;

    if (dim.kind === "offset") {
      // Geometry for offset curves is recomputed by useOffsetTool (it may
      // need an async backend call); this just records the new value.
      if (!Number.isFinite(value) || value === 0) return;
      project.sketch.dimensions = dims.map((d) => (d.id === id ? { ...d, value } : d));
      set({ project: { ...project }, bodies: {}, bodyErrors: {} });
      return;
    }

    if (value <= 0) return;
    const idx = project.sketch.entities.findIndex((e) => e.id === dim.entityId);
    if (idx === -1) return;
    const updates = applyLinearDimension(project.sketch.entities[idx], dim.segIdx, value);
    if (!updates) return;
    get().pushUndo();
    project.sketch.entities[idx] = { ...project.sketch.entities[idx], ...updates };
    project.sketch.dimensions = dims.map((d) => (d.id === id ? { ...d, value } : d));
    set({ project: { ...project }, bodies: {}, bodyErrors: {} });
  },

  removeDimension: (id: string) => {
    const project = get().project;
    if (!project) return;
    get().pushUndo();
    project.sketch.dimensions = (project.sketch.dimensions ?? []).filter((d) => d.id !== id);
    set({ project: { ...project } });
  },

  removeSelectedVertices: () => {
    const project = get().project;
    const verts = get().selectedVertices;
    if (!project || verts.length === 0) return;
    get().pushUndo();

    const byEntity = new Map<string, Set<number>>();
    for (const v of verts) {
      const set = byEntity.get(v.entityId) ?? new Set<number>();
      set.add(v.pointIndex);
      byEntity.set(v.entityId, set);
    }

    const remaining: Entity[] = [];
    for (const entity of project.sketch.entities) {
      const idxs = byEntity.get(entity.id);
      if (!idxs) {
        remaining.push(entity);
        continue;
      }
      if (entity.type === "circle") {
        if (!idxs.has(0)) remaining.push(entity);
        continue;
      }
      if (entity.type === "spline" && entity.controlPoints) {
        const controlPoints = entity.controlPoints.filter((_, i) => !idxs.has(i));
        // A spline needs at least two anchors to remain a curve.
        if (controlPoints.length < 2) continue;
        remaining.push({
          ...entity,
          controlPoints,
          points: sampleSpline(controlPoints, entity.samplingSteps ?? 64, entity.closed),
        });
      } else {
        const points = entity.points.filter((_, i) => !idxs.has(i));
        if (points.length < 2) continue;
        remaining.push({
          ...entity,
          // A rectangle that lost a corner is no longer a rectangle.
          type: entity.type === "rectangle" ? "polyline" : entity.type,
          points,
        });
      }
    }

    project.sketch.entities = remaining;
    set({
      project: { ...project },
      selectedVertices: [],
      bodies: {},
      bodyErrors: {},
    });
  },
});
