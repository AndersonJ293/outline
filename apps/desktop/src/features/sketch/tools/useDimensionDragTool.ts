import { useCallback, type MutableRefObject } from "react";
import type { Point, Project, ViewportState } from "../../../types";
import { pointDistance } from "../../../types";
import { hitTestDimension, segmentEndpoints } from "../dimensions";
import type { DimensionPopupState } from "../DimensionPopup";

const DOUBLE_CLICK_MS = 300;

interface UseDimensionDragToolArgs {
  project: Project | null;
  viewport: ViewportState;
  rotateDiameterDimension: (id: string, angle: number) => void;
  updateLinearDimensionOffset: (id: string, offset: number) => void;
  pushUndo: () => void;
  setSelectedDimensionId: (id: string | null) => void;
  setDimPopup: (popup: DimensionPopupState | null) => void;
  isDraggingDim: MutableRefObject<boolean>;
  dragDimId: MutableRefObject<string | null>;
  pushUndoDone: MutableRefObject<boolean>;
  lastClickTime: MutableRefObject<number>;
  lastClickId: MutableRefObject<string>;
}

/// Selecting, dragging (rotate the diameter line / offset the linear line),
/// and double-click-to-edit for an existing dimension annotation — the
/// "select" tool's counterpart to entity dragging.
export function useDimensionDragTool({
  project,
  viewport,
  rotateDiameterDimension,
  updateLinearDimensionOffset,
  pushUndo,
  setSelectedDimensionId,
  setDimPopup,
  isDraggingDim,
  dragDimId,
  pushUndoDone,
  lastClickTime,
  lastClickId,
}: UseDimensionDragToolArgs) {
  const tryStartDimensionDrag = useCallback(
    (world: Point, screenX: number, screenY: number): boolean => {
      const hit = hitTestDimension(project, world, viewport);
      if (!hit) return false;

      const now = Date.now();
      const isDoubleClick =
        now - lastClickTime.current < DOUBLE_CLICK_MS && lastClickId.current === hit;
      lastClickTime.current = now;
      lastClickId.current = hit;

      setSelectedDimensionId(hit);

      if (isDoubleClick) {
        const dim = project?.sketch.dimensions?.find((d) => d.id === hit);
        if (dim) {
          setDimPopup({
            dimId: dim.id,
            current: dim.value,
            screenX,
            screenY,
            label: dim.kind === "diameter" ? "Diâmetro:" : "Comprimento:",
          });
        }
        return true;
      }

      dragDimId.current = hit;
      isDraggingDim.current = true;
      pushUndoDone.current = false;
      return true;
    },
    [
      project,
      viewport,
      setSelectedDimensionId,
      setDimPopup,
      dragDimId,
      isDraggingDim,
      pushUndoDone,
      lastClickTime,
      lastClickId,
    ],
  );

  const updateDimensionDrag = useCallback(
    (world: Point): boolean => {
      if (!isDraggingDim.current || !dragDimId.current) return false;
      const dim = project?.sketch.dimensions?.find((d) => d.id === dragDimId.current);
      if (!dim) return false;
      const entity = project?.sketch.entities.find((e) => e.id === dim.entityId);
      if (!entity) return false;

      if (dim.kind === "diameter" && entity.center) {
        if (!pushUndoDone.current) {
          pushUndo();
          pushUndoDone.current = true;
        }
        const angle = Math.atan2(world.y - entity.center.y, world.x - entity.center.x);
        rotateDiameterDimension(dim.id, angle);
        return true;
      }

      if (dim.kind === "linear") {
        const ends = segmentEndpoints(entity, dim.segIdx);
        if (!ends) return false;
        const [a, b] = ends;
        const len = pointDistance(a, b);
        if (len < 1e-6) return false;
        if (!pushUndoDone.current) {
          pushUndo();
          pushUndoDone.current = true;
        }
        const nx = -(b.y - a.y) / len;
        const ny = (b.x - a.x) / len;
        const offset = (world.x - a.x) * nx + (world.y - a.y) * ny;
        updateLinearDimensionOffset(dim.id, offset);
        return true;
      }

      return false;
    },
    [
      project,
      rotateDiameterDimension,
      updateLinearDimensionOffset,
      pushUndo,
      dragDimId,
      isDraggingDim,
      pushUndoDone,
    ],
  );

  const finishDimensionDrag = useCallback((): boolean => {
    if (!isDraggingDim.current) return false;
    isDraggingDim.current = false;
    dragDimId.current = null;
    pushUndoDone.current = false;
    return true;
  }, [isDraggingDim, dragDimId, pushUndoDone]);

  return { tryStartDimensionDrag, updateDimensionDrag, finishDimensionDrag };
}
