import { useCallback, type MutableRefObject, type RefObject } from "react";
import type { ViewportState } from "../../../types";

interface UsePanToolArgs {
  canvasRef: RefObject<HTMLCanvasElement>;
  viewport: ViewportState;
  setViewport: (viewport: Partial<ViewportState>) => void;
  isPanning: MutableRefObject<boolean>;
  panStart: MutableRefObject<{ x: number; y: number }>;
}

export function usePanTool({
  canvasRef,
  viewport,
  setViewport,
  isPanning,
  panStart,
}: UsePanToolArgs) {
  const startPan = useCallback((event: React.MouseEvent): boolean => {
    if (event.button !== 1 && event.button !== 2) return false;

    isPanning.current = true;
    panStart.current = {
      x: event.clientX - viewport.offsetX,
      y: event.clientY - viewport.offsetY,
    };
    return true;
  }, [isPanning, panStart, viewport]);

  const updatePan = useCallback((event: React.MouseEvent): boolean => {
    if (!isPanning.current) return false;

    setViewport({
      offsetX: event.clientX - panStart.current.x,
      offsetY: event.clientY - panStart.current.y,
    });
    return true;
  }, [isPanning, panStart, setViewport]);

  const stopPan = useCallback((): boolean => {
    if (!isPanning.current) return false;
    isPanning.current = false;
    return true;
  }, [isPanning]);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(10, Math.max(0.1, viewport.zoom * factor));

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;

      setViewport({
        zoom: newZoom,
        offsetX: mx - (mx - viewport.offsetX) * (newZoom / viewport.zoom),
        offsetY: my - (my - viewport.offsetY) * (newZoom / viewport.zoom),
      });
    },
    [canvasRef, viewport, setViewport],
  );

  return { startPan, updatePan, stopPan, handleWheel };
}
