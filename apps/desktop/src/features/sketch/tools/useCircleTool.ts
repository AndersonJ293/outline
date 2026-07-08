import { useCallback, type MutableRefObject } from "react";
import type { Entity, Point } from "../../../types";
import { generateId, pointDistance } from "../../../types";
import { circlePoints } from "../geometry";

type UseCircleToolArgs = {
  drawingPoints: MutableRefObject<Point[]>;
  isDrawing: MutableRefObject<boolean>;
  addEntity: (entity: Entity) => void;
  setStatus: (text: string) => void;
};

export function useCircleTool({
  drawingPoints,
  isDrawing,
  addEntity,
  setStatus,
}: UseCircleToolArgs) {
  const handleCircleMouseDown = useCallback(
    (snapped: Point): boolean => {
      if (!isDrawing.current) {
        isDrawing.current = true;
        drawingPoints.current = [snapped, snapped];
        setStatus(`Circle: center at (${snapped.x.toFixed(1)}, ${snapped.y.toFixed(1)})`);
        return true;
      }

      const center = drawingPoints.current[0];
      const radius = pointDistance(center, snapped);
      if (radius <= 0) return false;
      addEntity({
        id: generateId(),
        type: "circle",
        center,
        radiusMm: radius,
        points: circlePoints(center, snapped),
        closed: true,
      });
      isDrawing.current = false;
      drawingPoints.current = [];
      setStatus(`Circle created (diameter ${(radius * 2).toFixed(1)} mm)`);
      return true;
    },
    [addEntity, drawingPoints, isDrawing, setStatus],
  );

  const updateCirclePreview = useCallback(
    (snapped: Point): boolean => {
      if (!isDrawing.current || drawingPoints.current.length !== 2) return false;
      drawingPoints.current[1] = snapped;
      return true;
    },
    [drawingPoints, isDrawing],
  );

  const cancelCircle = useCallback((): boolean => {
    if (!isDrawing.current) return false;
    isDrawing.current = false;
    drawingPoints.current = [];
    setStatus("Circle cancelled");
    return true;
  }, [drawingPoints, isDrawing, setStatus]);

  return { handleCircleMouseDown, updateCirclePreview, cancelCircle };
}
