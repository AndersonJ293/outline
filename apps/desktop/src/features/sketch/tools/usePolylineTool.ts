import { useCallback, type MutableRefObject } from "react";
import type { Entity, Point, Project, ViewportState } from "../../../types";
import { generateId, pointDistance } from "../../../types";
import { CLOSE_THRESHOLD } from "../constants";
import { findOpenEndpointAt } from "../chains";

interface UsePolylineToolArgs {
  viewport: ViewportState;
  project: Project | null;
  drawingPoints: MutableRefObject<Point[]>;
  isDrawing: MutableRefObject<boolean>;
  closeToStart: MutableRefObject<boolean>;
  addEntity: (entity: Entity) => void;
  setStatus: (text: string) => void;
}

export function usePolylineTool({
  viewport,
  project,
  drawingPoints,
  isDrawing,
  closeToStart,
  addEntity,
  setStatus,
}: UsePolylineToolArgs) {
  const handlePolylineMouseDown = useCallback(
    (snapped: Point): boolean => {
      if (!isDrawing.current) {
        const endpoint = findOpenEndpointAt(snapped, project, viewport.zoom);
        const firstPoint = endpoint?.point ?? snapped;
        isDrawing.current = true;
        closeToStart.current = false;
        drawingPoints.current = [firstPoint];
        if (endpoint) {
          setStatus(
            `Polyline: continuing from ${endpoint.end}, point 1 at (${firstPoint.x.toFixed(1)}, ${firstPoint.y.toFixed(1)})`,
          );
        } else {
          setStatus(
            `Polyline: point 1 at (${firstPoint.x.toFixed(1)}, ${firstPoint.y.toFixed(1)})`,
          );
        }
        return true;
      }

      if (drawingPoints.current.length >= 2) {
        const first = drawingPoints.current[0];
        const threshold = CLOSE_THRESHOLD / viewport.zoom;
        if (pointDistance(snapped, first) < threshold) {
          addEntity({
            id: generateId(),
            type: "polyline",
            points: [...drawingPoints.current, first],
            closed: true,
          });
          isDrawing.current = false;
          closeToStart.current = false;
          drawingPoints.current = [];
          setStatus("Polyline closed");
          return true;
        }

        const endpoint = findOpenEndpointAt(snapped, project, viewport.zoom);
        if (endpoint) {
          addEntity({
            id: generateId(),
            type: "polyline",
            points: [...drawingPoints.current, endpoint.point],
            closed: false,
          });
          isDrawing.current = false;
          closeToStart.current = false;
          drawingPoints.current = [];
          setStatus("Polyline chain closed");
          return true;
        }
      }

      drawingPoints.current = [...drawingPoints.current, snapped];
      setStatus(
        `Polyline: point ${drawingPoints.current.length} at (${snapped.x.toFixed(1)}, ${snapped.y.toFixed(1)})`,
      );
      return true;
    },
    [
      addEntity,
      closeToStart,
      drawingPoints,
      isDrawing,
      project,
      setStatus,
      viewport.zoom,
    ],
  );

  const finishPolyline = useCallback(
    (close: boolean): boolean => {
      if (!isDrawing.current) return false;
      if (drawingPoints.current.length < 2) {
        isDrawing.current = false;
        closeToStart.current = false;
        drawingPoints.current = [];
        return false;
      }
      addEntity({
        id: generateId(),
        type: "polyline",
        points: drawingPoints.current,
        closed: close,
      });
      isDrawing.current = false;
      closeToStart.current = false;
      drawingPoints.current = [];
      setStatus(
        `Polyline ${close ? "closed" : "open"}: ${drawingPoints.current.length} points`,
      );
      return true;
    },
    [addEntity, closeToStart, drawingPoints, isDrawing, setStatus],
  );

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

  return {
    handlePolylineMouseDown,
    finishPolyline,
    cancelPolyline,
    popPolylinePoint,
  };
}
