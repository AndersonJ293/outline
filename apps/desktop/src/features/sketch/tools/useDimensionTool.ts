import { useCallback } from "react";
import type { Dimension, Point, Project, ViewportState } from "../../../types";
import { generateId } from "../../../types";
import { hitTestEntityWithPoint } from "../hitTest";
import { hitTestDimension, measureSegment } from "../dimensions";
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
          setDimPopup({ dimId: dim.id, current: dim.value, screenX, screenY });
          return true;
        }
      }

      // Dimension a segment of an entity.
      const hit = hitTestEntityWithPoint(project.sketch.entities, world, viewport);
      if (!hit || hit.kind !== "segment") {
        setStatus("Click a line segment to add a dimension");
        return true;
      }
      const entity = project.sketch.entities.find((e) => e.id === hit.entityId);
      if (!entity) return true;
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
      setDimPopup({ dimId: dim.id, current: length, screenX, screenY });
      setStatus(`Dimension ${length.toFixed(1)} mm — type a value to drive it`);
      return true;
    },
    [project, viewport, addDimension, setDimPopup, setStatus],
  );

  return { handleDimensionMouseDown };
}
