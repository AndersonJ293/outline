import { useCallback } from "react";
import { useStore } from "../../../stores/useStore";
import type { Entity, Point, Project, ViewportState } from "../../../types";
import { generateId } from "../../../types";
import { hitTestEntityWithPoint } from "../hitTest";
import { reflectEntity } from "../entityDrag";

interface UseMirrorToolArgs {
  project: Project | null;
  viewport: ViewportState;
  setStatus: (text: string) => void;
}

function anchorPoint(entity: Entity, index: number): Point {
  if (entity.type === "spline" && entity.controlPoints) {
    return entity.controlPoints[index].point;
  }
  return entity.points[index];
}

/// Returns the two endpoints of segment `segIdx` of an entity, honoring the
/// closing wrap.
function segmentAxis(entity: Entity, segIdx: number): [Point, Point] | null {
  const len =
    entity.type === "spline" && entity.controlPoints
      ? entity.controlPoints.length
      : entity.points.length;
  const endIdx = entity.closed ? (segIdx + 1) % len : segIdx + 1;
  if (endIdx >= len && !entity.closed) return null;
  return [anchorPoint(entity, segIdx), anchorPoint(entity, endIdx)];
}

export function useMirrorTool({ project, viewport, setStatus }: UseMirrorToolArgs) {
  const handleMirrorMouseDown = useCallback(
    (world: Point): boolean => {
      const entities = project?.sketch.entities ?? [];
      const { selectedEntityIds } = useStore.getState();
      if (selectedEntityIds.length === 0) {
        setStatus("Mirror: select the contours first, then click a line as axis");
        return true;
      }

      const hit = hitTestEntityWithPoint(entities, world, viewport);
      if (!hit || hit.kind !== "segment") {
        setStatus("Mirror: click on an existing line/segment to use as the axis");
        return true;
      }
      const axisEntity = entities.find((e) => e.id === hit.entityId);
      if (!axisEntity) return true;
      const axis = segmentAxis(axisEntity, hit.segIdx);
      if (!axis) return true;
      const [a, b] = axis;

      const toMirror = entities.filter((e) => selectedEntityIds.includes(e.id));
      const mirrored = toMirror.map((e) => reflectEntity(e, a, b, generateId()));

      const store = useStore.getState();
      store.pushUndo();
      const proj = store.project;
      if (!proj) return true;
      proj.sketch.entities.push(...mirrored);
      store.setProject({ ...proj });
      store.setSelectedEntityIds(mirrored.map((e) => e.id));
      setStatus(`Mirrored ${mirrored.length} entit${mirrored.length === 1 ? "y" : "ies"}`);
      return true;
    },
    [project, viewport, setStatus],
  );

  return { handleMirrorMouseDown };
}
