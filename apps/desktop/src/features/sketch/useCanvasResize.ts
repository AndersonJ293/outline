import { useEffect, useCallback, type RefObject, type MutableRefObject } from "react";

type CanvasRef = RefObject<HTMLCanvasElement>;

export function useCanvasResize(
  containerRef: RefObject<HTMLDivElement>,
  canvases: CanvasRef[],
  onResize: () => void,
) {
  const resize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const width = Math.max(1, Math.floor(container.clientWidth));
    const height = Math.max(1, Math.floor(container.clientHeight));
    for (const canvasRef of canvases) {
      const canvas = canvasRef.current;
      if (!canvas) continue;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    }
    onResize();
  }, [containerRef, canvases, onResize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    window.addEventListener("resize", resize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [containerRef, resize]);
}
