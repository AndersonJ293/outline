import { useCallback, type MutableRefObject } from "react";
import type { Entity, Point } from "../../../types";
import { generateId } from "../../../types";
import { rectanglePoints } from "../geometry";

interface UseRectangleToolArgs {
  drawingPoints: MutableRefObject<Point[]>;
  isDrawing: MutableRefObject<boolean>;
  pendingRectangle: MutableRefObject<{ points: Point[]; confirmPoint: Point } | null>;
  addEntity: (entity: Entity) => void;
  setStatus: (text: string) => void;
}

export function useRectangleTool({
  drawingPoints,
  isDrawing,
  pendingRectangle,
  addEntity,
  setStatus,
}: UseRectangleToolArgs) {
  const confirmPendingRectangle = useCallback(() => {
    const pending = pendingRectangle.current;
    if (!pending) return false;

    addEntity({
      id: generateId(),
      type: "rectangle",
      points: pending.points,
      closed: true,
    });
    pendingRectangle.current = null;
    setStatus("Rectangle confirmed");
    return true;
  }, [addEntity, pendingRectangle, setStatus]);

  const handlePendingRectangleClick = useCallback((world: Point, zoom: number): boolean => {
    if (!pendingRectangle.current) return false;

    const confirm = pendingRectangle.current.confirmPoint;
    const dx = (confirm.x - world.x) * zoom;
    const dy = (confirm.y - world.y) * zoom;
    if (Math.sqrt(dx * dx + dy * dy) < 18) {
      confirmPendingRectangle();
      return true;
    }
    pendingRectangle.current = null;
    return false;
  }, [confirmPendingRectangle, pendingRectangle]);

  const startRectangle = useCallback((snapped: Point): boolean => {
    isDrawing.current = true;
    drawingPoints.current = [snapped, snapped];
    return true;
  }, [drawingPoints, isDrawing]);

  const updateRectanglePreview = useCallback((snapped: Point): boolean => {
    if (!isDrawing.current || drawingPoints.current.length !== 2) return false;
    drawingPoints.current[1] = snapped;
    return true;
  }, [drawingPoints, isDrawing]);

  const finishRectangle = useCallback((): boolean => {
    if (!isDrawing.current) return false;

    const points = drawingPoints.current;
    if (points.length === 2) {
      const p0 = points[0];
      const p1 = points[1];
      const width = Math.abs(p1.x - p0.x);
      const height = Math.abs(p1.y - p0.y);
      if (width > 0 && height > 0) {
        pendingRectangle.current = {
          points: rectanglePoints(p0, p1),
          confirmPoint: p1,
        };
        setStatus(
          `Rectangle pending: ${width.toFixed(1)} x ${height.toFixed(1)} mm. Click the green dot or press Enter.`,
        );
      }
    }
    isDrawing.current = false;
    return true;
  }, [drawingPoints, isDrawing, pendingRectangle, setStatus]);

  const cancelPendingRectangle = useCallback(() => {
    if (!pendingRectangle.current) return false;
    pendingRectangle.current = null;
    setStatus("Rectangle cancelled");
    return true;
  }, [pendingRectangle, setStatus]);

  return {
    confirmPendingRectangle,
    handlePendingRectangleClick,
    startRectangle,
    updateRectanglePreview,
    finishRectangle,
    cancelPendingRectangle,
  };
}
