import { useCallback, type MutableRefObject } from "react";
import { useStore } from "../../../stores/useStore";
import type { Point, Project, ViewportState } from "../../../types";
import { pointDistance } from "../../../types";
import { hitTestEntity, selectEntitiesInRect } from "../hitTest";

interface UseSelectionToolArgs {
  project: Project | null;
  viewport: ViewportState;
  isSelectDragging: MutableRefObject<boolean>;
  selectDragStart: MutableRefObject<Point>;
  selectDragEnd: MutableRefObject<Point>;
  selectEntity: (id: string | null, shiftKey?: boolean) => void;
  setSelectedEntityIds: (ids: string[]) => void;
  setStatus: (text: string) => void;
}

export function useSelectionTool({
  project,
  viewport,
  isSelectDragging,
  selectDragStart,
  selectDragEnd,
  selectEntity,
  setSelectedEntityIds,
  setStatus,
}: UseSelectionToolArgs) {
  const startSelectionDrag = useCallback((world: Point) => {
    isSelectDragging.current = true;
    selectDragStart.current = world;
    selectDragEnd.current = world;
  }, [isSelectDragging, selectDragStart, selectDragEnd]);

  const updateSelectionDrag = useCallback((world: Point): boolean => {
    if (!isSelectDragging.current) return false;
    selectDragEnd.current = world;
    return true;
  }, [isSelectDragging, selectDragEnd]);

  const finishSelectionDrag = useCallback((event: React.MouseEvent): boolean => {
    if (!isSelectDragging.current) return false;

    isSelectDragging.current = false;
    const start = selectDragStart.current;
    const end = selectDragEnd.current;
    const screenDist = pointDistance(start, end) * viewport.zoom;

    if (screenDist < 5) {
      const hitId = project ? hitTestEntity(project.sketch.entities, start, viewport) : null;
      selectEntity(hitId, event.shiftKey || false);
      if (hitId) {
        const nowSelected = useStore.getState().selectedEntityIds;
        if (event.shiftKey) {
          setStatus(nowSelected.includes(hitId) ? "Added to selection" : "Removed from selection");
        } else {
          setStatus(`Selected: ${hitId}`);
        }
      } else {
        setStatus("Nothing selected");
      }
      return true;
    }

    const ids = project ? selectEntitiesInRect(project.sketch.entities, start, end) : [];
    if (event.shiftKey) {
      const current = new Set(useStore.getState().selectedEntityIds);
      for (const id of ids) current.add(id);
      setSelectedEntityIds(Array.from(current));
    } else {
      setSelectedEntityIds(ids);
    }
    setStatus(`${ids.length} entit${ids.length === 1 ? "y" : "ies"} selected by area`);
    return true;
  }, [
    project,
    viewport,
    isSelectDragging,
    selectDragStart,
    selectDragEnd,
    selectEntity,
    setSelectedEntityIds,
    setStatus,
  ]);

  return { startSelectionDrag, updateSelectionDrag, finishSelectionDrag };
}
