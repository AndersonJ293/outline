import { useCallback } from "react";
import type { Dimension, Point, Project, ViewportState } from "../../../types";
import { generateId } from "../../../types";
import { hitTestEntityWithPoint } from "../hitTest";
import { angleFromId, hitTestDimension, measureSegment } from "../dimensions";
import type { DimensionPopupState } from "../DimensionPopup";

interface UseDimensionToolArgs {
  project: Project | null;
  viewport: ViewportState;
  addDimension: (dim: Dimension) => void;
  setDimPopup: (popup: DimensionPopupState | null) => void;
  setStatus: (text: string) => void;
}

export function useDimensionTool({
  project,
  viewport,
  addDimension,
  setDimPopup,
  setStatus,
}: UseDimensionToolArgs) {
  /// Returns true if the dimension tool handled the click.
  const handleDimensionMouseDown = useCallback(
    (world: Point, screenX: number, screenY: number): boolean => {
      if (!project) return false;

      // Re-open an existing dimension for editing.
      const existingId = hitTestDimension(project, world, viewport);
      if (existingId) {
        const dim = project.sketch.dimensions?.find((d) => d.id === existingId);
        if (dim) {
          setDimPopup({ dimId: dim.id, current: dim.value, screenX, screenY, nonce: Date.now() });
          return true;
        }
      }

      const hit = hitTestEntityWithPoint(project.sketch.entities, world, viewport);
      if (!hit) {
        setStatus("Click a line segment to add a dimension");
        return true;
      }
      const entity = project.sketch.entities.find((e) => e.id === hit.entityId);
      if (!entity) return true;

      // Circles get a diameter annotation instead of a segment length —
      // reuse the existing one for this circle if it already has one.
      if (entity.type === "circle" && entity.center && entity.radiusMm) {
        const existing = project.sketch.dimensions?.find(
          (d) => d.kind === "diameter" && d.entityId === entity.id,
        );
        if (existing) {
          setDimPopup({ dimId: existing.id, current: existing.value, screenX, screenY, label: "Diâmetro:", nonce: Date.now() });
          return true;
        }
        const angle =
          hit.kind === "segment"
            ? Math.atan2(world.y - entity.center.y, world.x - entity.center.x)
            : angleFromId(entity.id);
        const value = entity.radiusMm * 2;
        const dim: Dimension = {
          id: generateId(),
          kind: "diameter",
          entityId: entity.id,
          value,
          angle,
        };
        addDimension(dim);
        setDimPopup({ dimId: dim.id, current: value, screenX, screenY, label: "Diâmetro:", nonce: Date.now() });
        setStatus(`Diameter ${value.toFixed(1)} mm — type a value to drive it`);
        return true;
      }

      if (hit.kind !== "segment") {
        setStatus("Click a line segment to add a dimension");
        return true;
      }
      const length = measureSegment(entity, hit.segIdx);
      if (length === null) return true;

      const dim: Dimension = {
        id: generateId(),
        kind: "linear",
        entityId: hit.entityId,
        segIdx: hit.segIdx,
        value: length,
        offset: 16 / viewport.zoom,
      };
      addDimension(dim);
      setDimPopup({ dimId: dim.id, current: length, screenX, screenY, nonce: Date.now() });
      setStatus(`Dimension ${length.toFixed(1)} mm — type a value to drive it`);
      return true;
    },
    [project, viewport, addDimension, setDimPopup, setStatus],
  );

  return { handleDimensionMouseDown };
}
