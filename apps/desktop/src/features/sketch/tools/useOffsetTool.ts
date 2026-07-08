import { useCallback, useRef, useState } from "react";
import type { Dimension, Entity, Point, Project, ViewportState } from "../../../types";
import { generateId } from "../../../types";
import { offsetSketchEntity } from "../../../commands";
import { hitTestEntityWithPoint } from "../hitTest";
import { hitTestDimension } from "../dimensions";
import { circlePoints } from "../geometry";
import type { OffsetPopupState } from "../OffsetPopup";

type UseOffsetToolArgs = {
  project: Project | null;
  viewport: ViewportState;
  addEntity: (entity: Entity) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  addDimension: (dim: Dimension) => void;
  updateDimensionValue: (id: string, value: number) => void;
  pushUndo: () => void;
  setStatus: (text: string) => void;
  setError: (text: string | null) => void;
};

/// Offsetting a circle is exact: same center, radius shrunk/grown by the
/// distance. Positive distance grows the curve outward (matches Fusion);
/// the underlying Rust polygon offset uses the opposite sign, so callers
/// negate `distance` before reaching it.
function offsetCircle(entity: Entity, distance: number): Partial<Entity> | null {
  if (!entity.center || !entity.radiusMm) return null;
  const radiusMm = entity.radiusMm + distance;
  if (radiusMm <= 0) return null;
  const center = entity.center;
  return {
    center,
    radiusMm,
    points: circlePoints(center, { x: center.x + radiusMm, y: center.y }),
  };
}

export function useOffsetTool({
  project,
  viewport,
  addEntity,
  updateEntity,
  addDimension,
  updateDimensionValue,
  pushUndo,
  setStatus,
  setError,
}: UseOffsetToolArgs) {
  const lastDistanceRef = useRef("1");
  const popupNonceRef = useRef(0);
  const [offsetPopup, setOffsetPopup] = useState<OffsetPopupState | null>(null);

  const handleOffsetMouseDown = useCallback(
    (world: Point): boolean => {
      if (!project) return false;

      // Re-open an existing offset annotation for editing.
      const existingDimId = hitTestDimension(project, world, viewport);
      if (existingDimId) {
        const dim = project.sketch.dimensions?.find((d) => d.id === existingDimId);
        if (dim && dim.kind === "offset") {
          setOffsetPopup({
            entityId: dim.entityId,
            dimId: dim.id,
            current: dim.value,
            screenX: world.x * viewport.zoom + viewport.offsetX,
            screenY: world.y * viewport.zoom + viewport.offsetY,
            nonce: ++popupNonceRef.current,
          });
          setStatus("Offset: enter distance");
          return true;
        }
      }

      const hit = hitTestEntityWithPoint(project.sketch.entities, world, viewport);
      if (!hit) {
        setStatus("Offset: click a curve");
        return false;
      }

      const entity = project.sketch.entities.find((item) => item.id === hit.entityId);
      if (!entity) return false;

      const current = Number(lastDistanceRef.current.replace(",", "."));
      setOffsetPopup({
        entityId: entity.id,
        current: Number.isFinite(current) && current !== 0 ? current : 1,
        screenX: world.x * viewport.zoom + viewport.offsetX,
        screenY: world.y * viewport.zoom + viewport.offsetY,
        nonce: ++popupNonceRef.current,
      });
      setStatus("Offset: enter distance");
      return true;
    },
    [project, viewport, setStatus],
  );

  const confirmOffset = useCallback(
    async (distance: number): Promise<void> => {
      if (!project || !offsetPopup) return;
      if (!Number.isFinite(distance) || distance === 0) {
        setError("Offset distance must be a non-zero number.");
        return;
      }

      const entity = project.sketch.entities.find((item) => item.id === offsetPopup.entityId);
      if (!entity) {
        setOffsetPopup(null);
        setError("Could not find selected curve for offset.");
        return;
      }
      lastDistanceRef.current = String(distance);

      // Editing an existing offset: recompute the target curve in place.
      if (offsetPopup.dimId) {
        const dimId = offsetPopup.dimId;
        const dim = project.sketch.dimensions?.find((d) => d.id === dimId);
        const targetEntity = dim && dim.kind === "offset"
          ? project.sketch.entities.find((e) => e.id === dim.offsetEntityId)
          : undefined;
        if (!dim || !targetEntity) {
          setOffsetPopup(null);
          setError("Could not find offset curve to edit.");
          return;
        }
        setOffsetPopup(null);
        const updates = await recomputeOffset(entity, distance);
        if (!updates) {
          setError("Could not update offset. Check the distance.");
          return;
        }
        pushUndo();
        updateEntity(targetEntity.id, updates);
        updateDimensionValue(dim.id, distance);
        setError(null);
        setStatus(`Offset updated (${distance} mm)`);
        return;
      }

      setOffsetPopup(null);
      setStatus(`Offset: creating ${distance} mm offset`);
      const newEntity = await createOffsetEntity(entity, distance);
      if (!newEntity) {
        setError("Could not create offset. Check the profile and distance.");
        return;
      }

      addEntity(newEntity);
      addDimension({
        id: generateId(),
        kind: "offset",
        entityId: entity.id,
        offsetEntityId: newEntity.id,
        value: distance,
      });
      setError(null);
      setStatus(`Offset created (${distance} mm)`);
    },
    [
      project,
      offsetPopup,
      addEntity,
      updateEntity,
      addDimension,
      updateDimensionValue,
      pushUndo,
      setStatus,
      setError,
    ],
  );

  const cancelOffset = useCallback(() => {
    setOffsetPopup(null);
    setStatus("Offset canceled");
  }, [setStatus]);

  return { handleOffsetMouseDown, offsetPopup, confirmOffset, cancelOffset };
}

async function createOffsetEntity(entity: Entity, distance: number): Promise<Entity | null> {
  if (entity.type === "circle") {
    const updates = offsetCircle(entity, distance);
    return updates ? { ...entity, id: generateId(), ...updates } : null;
  }
  const result = await offsetSketchEntity(entity, -distance, generateId());
  return result.ok && result.entity ? result.entity : null;
}

async function recomputeOffset(source: Entity, distance: number): Promise<Partial<Entity> | null> {
  if (source.type === "circle") {
    return offsetCircle(source, distance);
  }
  const result = await offsetSketchEntity(source, -distance, generateId());
  if (!result.ok || !result.entity) return null;
  return { points: result.entity.points, closed: result.entity.closed };
}
