import { useEffect, type RefObject } from "react";

interface UseSketchViewportResetArgs {
  active: boolean;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  setViewport: (vp: { offsetX: number; offsetY: number; zoom: number }) => void;
}

export function useSketchViewportReset({
  active,
  canvasRef,
  setViewport,
}: UseSketchViewportResetArgs) {
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width || 1;
    const h = canvas.height || 1;
    const zoom = w / 120;
    setViewport({
      offsetX: w / 2,
      offsetY: h / 2,
      zoom,
    });
  }, [active, canvasRef, setViewport]);
}
