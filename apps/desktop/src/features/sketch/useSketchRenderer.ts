import { useEffect, type RefObject, type MutableRefObject } from "react";
import type { Point, Project, ToolMode, ViewportState } from "../../types";
import { renderSketch } from "./renderSketch";

interface UseSketchRendererArgs {
  canvasRef: RefObject<HTMLCanvasElement>;
  containerRef: RefObject<HTMLDivElement>;
  project: Project | null;
  viewport: ViewportState;
  selectedEntityIds: string[];
  editingImageId: string | null;
  toolMode: ToolMode;
  imageCache: MutableRefObject<Map<string, HTMLImageElement>>;
  isImageResizing: MutableRefObject<boolean>;
  imageResizeId: MutableRefObject<string | null>;
  imageRefLineStart: MutableRefObject<Point | null>;
  imageRefLineEnd: MutableRefObject<Point | null>;
  refScalePopup: { screenX: number; screenY: number } | null;
  isDrawing: MutableRefObject<boolean>;
  drawingPoints: MutableRefObject<Point[]>;
  closeToStart: MutableRefObject<boolean>;
  isSelectDragging: MutableRefObject<boolean>;
  selectDragStart: MutableRefObject<Point>;
  selectDragEnd: MutableRefObject<Point>;
  pendingRectangle: MutableRefObject<{ points: Point[]; confirmPoint: Point } | null>;
  cursorWorld: MutableRefObject<Point>;
  snapTarget: MutableRefObject<Point>;
  snapActive: MutableRefObject<boolean>;
  snapToGridEnabled: boolean;
}

export function useSketchRenderer({
  canvasRef,
  containerRef,
  project,
  viewport,
  selectedEntityIds,
  editingImageId,
  toolMode,
  imageCache,
  isImageResizing,
  imageResizeId,
  imageRefLineStart,
  imageRefLineEnd,
  refScalePopup,
  isDrawing,
  drawingPoints,
  closeToStart,
  isSelectDragging,
  selectDragStart,
  selectDragEnd,
  pendingRectangle,
  cursorWorld,
  snapTarget,
  snapActive,
  snapToGridEnabled,
}: UseSketchRendererArgs): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const width = Math.max(1, Math.floor(container.clientWidth));
      const height = Math.max(1, Math.floor(container.clientHeight));

      if (canvas.width !== width) {
        canvas.width = width;
      }
      if (canvas.height !== height) {
        canvas.height = height;
      }
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const loop = () => {
      renderSketch({
        ctx,
        canvas,
        project,
        viewport,
        selectedEntityIds,
        editingImageId,
        toolMode,
        imageCache,
        isImageResizing,
        imageResizeId,
        imageRefLineStart,
        imageRefLineEnd,
        refScalePopup,
        isDrawing,
        drawingPoints,
        closeToStart,
        isSelectDragging,
        selectDragStart,
        selectDragEnd,
        pendingRectangle,
        cursorWorld,
        snapTarget,
        snapActive,
        snapToGridEnabled,
      });
      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, [project, viewport, selectedEntityIds, editingImageId, toolMode, refScalePopup, snapToGridEnabled]);
}
