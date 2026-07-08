import type { Dimension, Entity, Operation } from "../types";
import { generateId } from "../types";
import { sampleSpline } from "../features/sketch/spline";
import { circlePoints } from "../features/sketch/geometry";
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
  | "rotateDiameterDimension"
  | "updateLinearDimensionOffset"
  | "selectedDimensionId"
  | "setSelectedDimensionId"
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
      set({
        selectedEntityIds: Array.from(current),
        selectedOperationId: null,
        selectedDimensionId: null,
      });
    } else {
      set({ selectedEntityIds: [id], selectedOperationId: null, selectedDimensionId: null });
    }
  },
  setSelectedEntityIds: (ids) =>
    set({ selectedEntityIds: ids, selectedDimensionId: ids.length > 0 ? null : get().selectedDimensionId }),
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
    const nextEntities = [...project.sketch.entities, ...pasted];
    set({
      project: { ...project, sketch: { ...project.sketch, entities: nextEntities } },
      selectedEntityIds: newIds,
      selectedVertices: [],
    });
    return newIds;
  },

  addEntity: (entity) => {
    const project = get().project;
    if (!project) return;
    get().pushUndo();
    const nextEntities = [...project.sketch.entities, entity];
    set({
      project: { ...project, sketch: { ...project.sketch, entities: nextEntities } },
      selectedEntityIds: [entity.id],
    });
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
    const nextImages = [...(project.sketch.images ?? []), image];
    set({
      project: { ...project, sketch: { ...project.sketch, images: nextImages } },
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
    const nextEntities = [...project.sketch.entities];
    nextEntities[idx] = { ...nextEntities[idx], ...updates };
    set({ project: { ...project, sketch: { ...project.sketch, entities: nextEntities } } });
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
    const nextImages = [...images];
    nextImages[idx] = { ...nextImages[idx], ...updates };
    set({ project: { ...project, sketch: { ...project.sketch, images: nextImages } } });
  },

  removeSelectedEntities: () => {
    const project = get().project;
    const ids = get().selectedEntityIds;
    if (!project || ids.length === 0) return;
    get().pushUndo();
    const nextEntities = project.sketch.entities.filter((e) => !ids.includes(e.id));
    const nextImages = (project.sketch.images ?? []).filter((img) => !ids.includes(img.id));
    const nextDimensions = (project.sketch.dimensions ?? []).filter(
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
      project: {
        ...project,
        sketch: {
          ...project.sketch,
          entities: nextEntities,
          images: nextImages,
          dimensions: nextDimensions,
        },
      },
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
    const nextDimensions = [...(project.sketch.dimensions ?? []), dim];
    set({ project: { ...project, sketch: { ...project.sketch, dimensions: nextDimensions } } });
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
      const nextDimensions = dims.map((d) => (d.id === id ? { ...d, value } : d));
      set({
        project: { ...project, sketch: { ...project.sketch, dimensions: nextDimensions } },
        bodies: {},
        bodyErrors: {},
      });
      return;
    }

    if (value <= 0) return;
    const idx = project.sketch.entities.findIndex((e) => e.id === dim.entityId);
    if (idx === -1) return;

    if (dim.kind === "diameter") {
      const entity = project.sketch.entities[idx];
      if (entity.type !== "circle" || !entity.center) return;
      const radiusMm = value / 2;
      const edge = { x: entity.center.x + radiusMm, y: entity.center.y };
      get().pushUndo();
      const nextEntities = [...project.sketch.entities];
      nextEntities[idx] = {
        ...entity,
        radiusMm,
        points: circlePoints(entity.center, edge, entity.samplingSteps ?? (entity.points.length || 96)),
      };
      const nextDimensions = dims.map((d) => (d.id === id ? { ...d, value } : d));
      set({
        project: {
          ...project,
          sketch: { ...project.sketch, entities: nextEntities, dimensions: nextDimensions },
        },
        bodies: {},
        bodyErrors: {},
      });
      return;
    }

    if (dim.kind !== "linear") return;
    const updates = applyLinearDimension(project.sketch.entities[idx], dim.segIdx, value);
    if (!updates) return;
    get().pushUndo();
    const nextEntities = [...project.sketch.entities];
    nextEntities[idx] = { ...nextEntities[idx], ...updates };
    const nextDimensions = dims.map((d) => (d.id === id ? { ...d, value } : d));
    set({
      project: {
        ...project,
        sketch: { ...project.sketch, entities: nextEntities, dimensions: nextDimensions },
      },
      bodies: {},
      bodyErrors: {},
    });
  },

  removeDimension: (id: string) => {
    const project = get().project;
    if (!project) return;
    get().pushUndo();
    const nextDimensions = (project.sketch.dimensions ?? []).filter((d) => d.id !== id);
    const selectedDimensionId = get().selectedDimensionId;
    set({
      project: { ...project, sketch: { ...project.sketch, dimensions: nextDimensions } },
      selectedDimensionId: selectedDimensionId === id ? null : selectedDimensionId,
    });
  },

  // No pushUndo here — the drag tool that calls these pushes once at drag
  // start, matching the pattern used by entity/move drag tools.
  rotateDiameterDimension: (id: string, angle: number) => {
    const project = get().project;
    if (!project) return;
    const dims = project.sketch.dimensions ?? [];
    const nextDimensions = dims.map((d) =>
      d.id === id && d.kind === "diameter" ? { ...d, angle } : d,
    );
    set({ project: { ...project, sketch: { ...project.sketch, dimensions: nextDimensions } } });
  },

  updateLinearDimensionOffset: (id: string, offset: number) => {
    const project = get().project;
    if (!project) return;
    const dims = project.sketch.dimensions ?? [];
    const nextDimensions = dims.map((d) =>
      d.id === id && d.kind === "linear" ? { ...d, offset } : d,
    );
    set({ project: { ...project, sketch: { ...project.sketch, dimensions: nextDimensions } } });
  },

  selectedDimensionId: null,
  setSelectedDimensionId: (id: string | null) => {
    if (id === null) {
      set({ selectedDimensionId: null });
      return;
    }
    set({
      selectedDimensionId: id,
      selectedEntityIds: [],
      selectedVertices: [],
      selectedOperationId: null,
    });
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

    set({
      project: { ...project, sketch: { ...project.sketch, entities: remaining } },
      selectedVertices: [],
      bodies: {},
      bodyErrors: {},
    });
  },
});
