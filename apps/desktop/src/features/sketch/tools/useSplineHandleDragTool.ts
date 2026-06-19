import { useCallback, type MutableRefObject } from "react";
import type { Entity, Point, Project, SplineControlPoint, ViewportState } from "../../../types";
import { sampleSpline } from "../spline";
import { hitTestSplineHandle } from "../hitTest";

interface UseSplineHandleDragToolArgs {
  project: Project | null;
  viewport: ViewportState;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  pushUndo: () => void;
  setStatus: (text: string) => void;
  isHandleDragging: MutableRefObject<boolean>;
  dragEntityId: MutableRefObject<string | null>;
  dragAnchorIndex: MutableRefObject<number | null>;
  dragStart: MutableRefObject<Point>;
  pushUndoDone: MutableRefObject<boolean>;
}

const HANDLE_LENGTH_LIMIT = 0;

export function useSplineHandleDragTool({
  project,
  viewport,
  updateEntity,
  pushUndo,
  setStatus,
  isHandleDragging,
  dragEntityId,
  dragAnchorIndex,
  dragStart,
  pushUndoDone,
}: UseSplineHandleDragToolArgs) {
  const tryStartHandleDrag = useCallback(
    (world: Point): boolean => {
      if (!project) return false;
      for (const entity of project.sketch.entities) {
        if (entity.type !== "spline" || !entity.controlPoints) continue;
        const hit = hitTestSplineHandle(entity, world, viewport);
        if (hit !== null) {
          dragEntityId.current = entity.id;
          dragAnchorIndex.current = hit.anchorIndex;
          dragStart.current = world;
          isHandleDragging.current = true;
          pushUndoDone.current = false;
          setStatus(
            `Spline handle ${hit.anchorIndex} at (${world.x.toFixed(1)}, ${world.y.toFixed(1)})`,
          );
          return true;
        }
      }
      isHandleDragging.current = false;
      dragEntityId.current = null;
      dragAnchorIndex.current = null;
      return false;
    },
    [project, viewport, dragEntityId, dragAnchorIndex, dragStart, isHandleDragging, pushUndoDone, setStatus],
  );

  const updateHandleDrag = useCallback(
    (world: Point): boolean => {
      if (!isHandleDragging.current) return false;
      const entityId = dragEntityId.current;
      const anchorIndex = dragAnchorIndex.current;
      if (entityId === null || anchorIndex === null) return false;

      const entity = project?.sketch.entities.find((e) => e.id === entityId);
      if (!entity || entity.type !== "spline" || !entity.controlPoints) return false;

      const anchor = entity.controlPoints[anchorIndex];
      const newDx = world.x - anchor.point.x;
      const newDy = world.y - anchor.point.y;
      if (newDx === anchor.handleOut.dx && newDy === anchor.handleOut.dy) return true;

      const newControlPoints: SplineControlPoint[] = entity.controlPoints.map(
        (cp, i) =>
          i === anchorIndex
            ? { point: cp.point, handleOut: clampHandle({ dx: newDx, dy: newDy }) }
            : cp,
      );
      const steps = entity.samplingSteps ?? 64;
      const points = sampleSpline(newControlPoints, steps, entity.closed);

      if (!pushUndoDone.current) {
        pushUndo();
        pushUndoDone.current = true;
      }
      updateEntity(entityId, { controlPoints: newControlPoints, points });
      return true;
    },
    [project, updateEntity, pushUndo, isHandleDragging, dragEntityId, dragAnchorIndex, pushUndoDone],
  );

  const finishHandleDrag = useCallback((): boolean => {
    if (!isHandleDragging.current) return false;
    isHandleDragging.current = false;
    pushUndoDone.current = false;
    return true;
  }, [isHandleDragging, pushUndoDone]);

  return { tryStartHandleDrag, updateHandleDrag, finishHandleDrag };
}

function clampHandle(handle: { dx: number; dy: number }): { dx: number; dy: number } {
  if (HANDLE_LENGTH_LIMIT <= 0) return handle;
  const len = Math.hypot(handle.dx, handle.dy);
  if (len <= HANDLE_LENGTH_LIMIT) return handle;
  const scale = HANDLE_LENGTH_LIMIT / len;
  return { dx: handle.dx * scale, dy: handle.dy * scale };
}
