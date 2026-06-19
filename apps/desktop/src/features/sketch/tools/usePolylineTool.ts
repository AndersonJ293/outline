import { useCallback, type MutableRefObject } from "react";
import type { Entity, Point, ViewportState } from "../../../types";
import { generateId, pointDistance } from "../../../types";
import { CLOSE_THRESHOLD } from "../constants";

interface UsePolylineToolArgs {
  viewport: ViewportState;
  drawingPoints: MutableRefObject<Point[]>;
  isDrawing: MutableRefObject<boolean>;
  closeToStart: MutableRefObject<boolean>;
  addEntity: (entity: Entity) => void;
  setStatus: (text: string) => void;
}

export function usePolylineTool({
  viewport,
  drawingPoints,
  isDrawing,
  closeToStart,
  addEntity,
  setStatus,
}: UsePolylineToolArgs) {
  const handlePolylineMouseDown = useCallback((snapped: Point): boolean => {
    if (!isDrawing.current) {
      isDrawing.current = true;
      closeToStart.current = false;
      drawingPoints.current = [snapped];
      setStatus(`Polyline: point 1 at (${snapped.x.toFixed(1)}, ${snapped.y.toFixed(1)})`);
      return true;
    }

    const first = drawingPoints.current[0];
    const dist = pointDistance(snapped, first);
    const distScreen = dist * viewport.zoom;

    if (distScreen < CLOSE_THRESHOLD && drawingPoints.current.length >= 2) {
      closeToStart.current = true;
      addEntity({
        id: generateId(),
        type: "polyline",
        points: drawingPoints.current,
        closed: true,
      });
      isDrawing.current = false;
      setStatus(`Polyline closed: ${drawingPoints.current.length} points`);
      return true;
    }

    drawingPoints.current = [...drawingPoints.current, snapped];
    setStatus(
      `Polyline: point ${drawingPoints.current.length} at (${snapped.x.toFixed(1)}, ${snapped.y.toFixed(1)})`,
    );
    return true;
  }, [addEntity, closeToStart, drawingPoints, isDrawing, setStatus, viewport]);

  const cancelPolyline = useCallback((): boolean => {
    if (!isDrawing.current && drawingPoints.current.length === 0) return false;
    isDrawing.current = false;
    closeToStart.current = false;
    drawingPoints.current = [];
    return true;
  }, [closeToStart, drawingPoints, isDrawing]);

  const popPolylinePoint = useCallback((): boolean => {
    if (drawingPoints.current.length === 0) return false;
    if (drawingPoints.current.length === 1) {
      isDrawing.current = false;
      closeToStart.current = false;
      drawingPoints.current = [];
      setStatus("Polyline cancelled");
      return true;
    }
    drawingPoints.current = drawingPoints.current.slice(0, -1);
    const last = drawingPoints.current[drawingPoints.current.length - 1];
    setStatus(
      `Polyline: point ${drawingPoints.current.length} at (${last.x.toFixed(1)}, ${last.y.toFixed(1)})`,
    );
    return true;
  }, [closeToStart, drawingPoints, isDrawing, setStatus]);

  return { handlePolylineMouseDown, cancelPolyline, popPolylinePoint };
}
