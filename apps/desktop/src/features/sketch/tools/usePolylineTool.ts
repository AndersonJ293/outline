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
      setStatus(`Polyline: ponto 1 em (${snapped.x.toFixed(1)}, ${snapped.y.toFixed(1)})`);
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
      setStatus(`Polyline fechada: ${drawingPoints.current.length} pontos`);
      return true;
    }

    drawingPoints.current = [...drawingPoints.current, snapped];
    setStatus(
      `Polyline: ponto ${drawingPoints.current.length} em (${snapped.x.toFixed(1)}, ${snapped.y.toFixed(1)})`,
    );
    return true;
  }, [addEntity, closeToStart, drawingPoints, isDrawing, setStatus, viewport]);

  return { handlePolylineMouseDown };
}
