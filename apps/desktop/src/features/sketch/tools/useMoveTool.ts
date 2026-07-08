import { useCallback, type MutableRefObject } from "react";
import { useStore } from "../../../stores/useStore";
import type { Entity, Point, Project, ViewportState } from "../../../types";
import type { Vertex } from "../../../stores/types";
import { hitTestEntityWithPoint } from "../hitTest";
import { translateEntityVertices, translateEntityWhole } from "../entityDrag";
import { applyConnectionConstraints, dependentOffsetEntityIds, isOffsetResult } from "../dimensions";

/// A snapshot of what the current move drag affects: whole entities translated
/// in full, plus loose vertices grouped per entity.
export interface MovePlan {
  wholeIds: string[];
  vertexMap: Map<string, Set<number>>;
}

interface UseMoveToolArgs {
  project: Project | null;
  viewport: ViewportState;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  pushUndo: () => void;
  setSelectedEntityIds: (ids: string[]) => void;
  toggleVertex: (vertex: Vertex, shiftKey?: boolean) => void;
  setStatus: (text: string) => void;
  isMoving: MutableRefObject<boolean>;
  movePlan: MutableRefObject<MovePlan | null>;
  moveStart: MutableRefObject<Point>;
  movePushUndoDone: MutableRefObject<boolean>;
}

function segmentEndpoints(entity: Entity, segIdx: number): number[] {
  const len =
    entity.type === "spline" && entity.controlPoints
      ? entity.controlPoints.length
      : entity.points.length;
  const endIdx = entity.closed ? (segIdx + 1) % len : segIdx + 1;
  if (!entity.closed && endIdx >= len) return [segIdx];
  return [segIdx, endIdx];
}

export function useMoveTool({
  project,
  viewport,
  updateEntity,
  pushUndo,
  setSelectedEntityIds,
  toggleVertex,
  setStatus,
  isMoving,
  movePlan,
  moveStart,
  movePushUndoDone,
}: UseMoveToolArgs) {
  const tryStartMove = useCallback(
    (world: Point, shiftKey: boolean): boolean => {
      const entities = project?.sketch.entities ?? [];
      const hit = hitTestEntityWithPoint(entities, world, viewport);
      if (!hit) return false;
      // Derived offset curves only move together with their source.
      if (isOffsetResult(project, hit.entityId)) return false;

      const { selectedEntityIds, selectedVertices } = useStore.getState();
      // Builds the per-entity vertex map. When `excludeWhole` is set, vertices
      // whose entity is moved as a whole are skipped to avoid double-moving them.
      const groupVertexMap = (excludeWhole: boolean) => {
        const vertexMap = new Map<string, Set<number>>();
        for (const v of selectedVertices) {
          if (excludeWhole && selectedEntityIds.includes(v.entityId)) continue;
          const set = vertexMap.get(v.entityId) ?? new Set<number>();
          set.add(v.pointIndex);
          vertexMap.set(v.entityId, set);
        }
        return vertexMap;
      };

      let plan: MovePlan;
      if (hit.kind === "point") {
        const hitVertexSelected = selectedVertices.some(
          (v) => v.entityId === hit.entityId && v.pointIndex === hit.pointIndex,
        );
        if (hitVertexSelected) {
          // Grabbing a selected vertex moves the loose vertex selection only —
          // never the whole entity, even if it is also selected.
          plan = { wholeIds: [], vertexMap: groupVertexMap(false) };
        } else if (selectedEntityIds.includes(hit.entityId)) {
          // The entity is selected as a whole; grabbing its anchor moves the group.
          plan = { wholeIds: [...selectedEntityIds], vertexMap: groupVertexMap(true) };
        } else {
          // Fresh single-point grab.
          toggleVertex(
            { entityId: hit.entityId, pointIndex: hit.pointIndex },
            shiftKey,
          );
          plan = {
            wholeIds: [],
            vertexMap: new Map([[hit.entityId, new Set([hit.pointIndex])]]),
          };
        }
      } else if (selectedEntityIds.includes(hit.entityId)) {
        // Grabbing the body of a selected entity moves the whole group.
        plan = { wholeIds: [...selectedEntityIds], vertexMap: groupVertexMap(true) };
      } else {
        // Segment grab: move just its endpoints.
        const entity = entities.find((e) => e.id === hit.entityId);
        if (!entity) return false;
        const indices = segmentEndpoints(entity, hit.segIdx);
        setSelectedEntityIds([hit.entityId]);
        plan = {
          wholeIds: [],
          vertexMap: new Map([[hit.entityId, new Set(indices)]]),
        };
      }

      movePlan.current = plan;
      moveStart.current = world;
      isMoving.current = true;
      movePushUndoDone.current = false;
      return true;
    },
    [
      project,
      viewport,
      toggleVertex,
      setSelectedEntityIds,
      isMoving,
      movePlan,
      moveStart,
      movePushUndoDone,
    ],
  );

  const applyMoveDelta = useCallback(
    (dx: number, dy: number) => {
      const plan = movePlan.current;
      if (!plan) return;
      const liveProject = useStore.getState().project;
      const entities = liveProject?.sketch.entities ?? [];

      for (const id of plan.wholeIds) {
        const entity = entities.find((e) => e.id === id);
        if (!entity) continue;
        const geo = translateEntityWhole(entity, dx, dy);
        if (entity.type !== "circle") {
          geo.points = applyConnectionConstraints(entities, entity, geo.points);
        }
        updateEntity(id, geo);

        for (const depId of dependentOffsetEntityIds(liveProject, id)) {
          if (plan.wholeIds.includes(depId)) continue;
          const dep = entities.find((e) => e.id === depId);
          if (!dep) continue;
          updateEntity(depId, translateEntityWhole(dep, dx, dy));
        }
      }
      for (const [id, indices] of plan.vertexMap) {
        if (plan.wholeIds.includes(id)) continue;
        const entity = entities.find((e) => e.id === id);
        if (!entity) continue;
        const geo = translateEntityVertices(entity, indices, dx, dy);
        if (entity.type !== "circle") {
          geo.points = applyConnectionConstraints(entities, entity, geo.points);
        }
        updateEntity(id, geo);
      }
    },
    [movePlan, updateEntity],
  );

  const updateMove = useCallback(
    (world: Point): boolean => {
      if (!isMoving.current || !movePlan.current) return false;
      const dx = world.x - moveStart.current.x;
      const dy = world.y - moveStart.current.y;
      if (dx === 0 && dy === 0) return true;
      if (!movePushUndoDone.current) {
        pushUndo();
        movePushUndoDone.current = true;
      }
      applyMoveDelta(dx, dy);
      moveStart.current = world;
      return true;
    },
    [isMoving, movePlan, moveStart, movePushUndoDone, pushUndo, applyMoveDelta],
  );

  const finishMove = useCallback((): boolean => {
    if (!isMoving.current) return false;
    isMoving.current = false;
    movePushUndoDone.current = false;
    setStatus("Moved selection");
    return true;
  }, [isMoving, movePushUndoDone, setStatus]);

  return { tryStartMove, updateMove, finishMove };
}
