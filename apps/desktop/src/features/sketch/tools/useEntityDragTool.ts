import { useCallback, type MutableRefObject } from "react";
import type { Entity, Point, Project, ViewportState } from "../../../types";
import { hitTestEntityWithPoint } from "../hitTest";
import {
  applyEntityMove,
  applyPointMove,
  applySegmentMove,
} from "../entityDrag";
import type { EntityDragTarget } from "../../../stores/types";

type EntityDragMode = "point" | "segment" | "entity";

const DOUBLE_CLICK_MS = 300;

interface UseEntityDragToolArgs {
  project: Project | null;
  viewport: ViewportState;
  selectEntity: (id: string | null, shiftKey?: boolean) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  pushUndo: () => void;
  setEntityDragTarget: (target: EntityDragTarget | null) => void;
  isEntityDragging: MutableRefObject<boolean>;
  dragMode: MutableRefObject<EntityDragMode | null>;
  dragEntityId: MutableRefObject<string | null>;
  dragPointIndex: MutableRefObject<number | null>;
  dragSegIdx: MutableRefObject<number | null>;
  dragStart: MutableRefObject<Point>;
  pushUndoDone: MutableRefObject<boolean>;
  lastClickTime: MutableRefObject<number>;
  lastClickKey: MutableRefObject<string>;
}

export function useEntityDragTool({
  project,
  viewport,
  selectEntity,
  updateEntity,
  pushUndo,
  setEntityDragTarget,
  isEntityDragging,
  dragMode,
  dragEntityId,
  dragPointIndex,
  dragSegIdx,
  dragStart,
  pushUndoDone,
  lastClickTime,
  lastClickKey,
}: UseEntityDragToolArgs) {
  const tryStartEntityDrag = useCallback(
    (world: Point): boolean => {
      const hit = hitTestEntityWithPoint(project?.sketch.entities ?? [], world, viewport);
      if (!hit) {
        dragMode.current = null;
        dragEntityId.current = null;
        dragPointIndex.current = null;
        dragSegIdx.current = null;
        setEntityDragTarget(null);
        lastClickTime.current = 0;
        lastClickKey.current = "";
        return false;
      }

      const now = Date.now();
      const clickKey =
        hit.kind === "point"
          ? `${hit.entityId}:p${hit.pointIndex}`
          : `${hit.entityId}:s${hit.segIdx}`;
      const isDoubleClick =
        now - lastClickTime.current < DOUBLE_CLICK_MS &&
        lastClickKey.current === clickKey;

      selectEntity(hit.entityId);

      if (hit.kind === "point") {
        dragMode.current = "point";
        dragEntityId.current = hit.entityId;
        dragPointIndex.current = hit.pointIndex;
        dragStart.current = world;
        isEntityDragging.current = true;
        pushUndoDone.current = false;
        setEntityDragTarget({
          kind: "point",
          entityId: hit.entityId,
          pointIndex: hit.pointIndex,
        });
        lastClickTime.current = now;
        lastClickKey.current = clickKey;
        return true;
      }

      if (isDoubleClick) {
        dragMode.current = "entity";
        dragEntityId.current = hit.entityId;
        dragStart.current = world;
        isEntityDragging.current = true;
        pushUndoDone.current = false;
        setEntityDragTarget({ kind: "entity", entityId: hit.entityId });
        lastClickTime.current = 0;
        lastClickKey.current = "";
        return true;
      }

      dragMode.current = "segment";
      dragEntityId.current = hit.entityId;
      dragSegIdx.current = hit.segIdx;
      dragStart.current = world;
      isEntityDragging.current = true;
      pushUndoDone.current = false;
      setEntityDragTarget({
        kind: "segment",
        entityId: hit.entityId,
        segIdx: hit.segIdx,
      });
      lastClickTime.current = now;
      lastClickKey.current = clickKey;
      return true;
    },
    [
      project,
      viewport,
      selectEntity,
      setEntityDragTarget,
      dragMode,
      dragEntityId,
      dragPointIndex,
      dragSegIdx,
      dragStart,
      isEntityDragging,
      pushUndoDone,
      lastClickTime,
      lastClickKey,
    ],
  );

  const updateEntityDrag = useCallback(
    (world: Point): boolean => {
      if (!isEntityDragging.current) return false;
      const mode = dragMode.current;
      const entityId = dragEntityId.current;
      if (!mode || !entityId) return false;

      const entity = project?.sketch.entities.find((e) => e.id === entityId);
      if (!entity) return false;

      const dx = world.x - dragStart.current.x;
      const dy = world.y - dragStart.current.y;
      if (dx === 0 && dy === 0) return true;

      let newPoints: Point[] | null = null;
      if (mode === "point" && dragPointIndex.current !== null) {
        newPoints = applyPointMove(
          entity,
          dragPointIndex.current,
          world,
          dragStart.current,
        );
      } else if (mode === "segment" && dragSegIdx.current !== null) {
        newPoints = applySegmentMove(
          entity,
          dragSegIdx.current,
          world,
          dragStart.current,
        );
      } else if (mode === "entity") {
        newPoints = applyEntityMove(entity, world, dragStart.current);
      }
      if (!newPoints) return false;

      if (!pushUndoDone.current) {
        pushUndo();
        pushUndoDone.current = true;
      }
      updateEntity(entity.id, { points: newPoints });
      dragStart.current = world;
      return true;
    },
    [
      project,
      updateEntity,
      pushUndo,
      dragMode,
      dragEntityId,
      dragPointIndex,
      dragSegIdx,
      dragStart,
      isEntityDragging,
      pushUndoDone,
    ],
  );

  const finishEntityDrag = useCallback((): boolean => {
    if (!isEntityDragging.current) return false;
    isEntityDragging.current = false;
    pushUndoDone.current = false;
    return true;
  }, [isEntityDragging, pushUndoDone]);

  return { tryStartEntityDrag, updateEntityDrag, finishEntityDrag };
}
