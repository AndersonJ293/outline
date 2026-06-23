import { useEffect, useRef, useCallback, type RefObject, type MutableRefObject } from "react";
import type { Point, Project, ToolMode, ViewportState } from "../../types";
import type { EntityDragTarget, Vertex } from "../../stores/types";
import { renderSketch } from "./renderSketch";
import type { SplineDrawingState } from "./tools/useSplineTool";

interface UseSketchRendererArgs {
  canvasRef: RefObject<HTMLCanvasElement>;
  containerRef: RefObject<HTMLDivElement>;
  project: Project | null;
  viewport: ViewportState;
  selectedEntityIds: string[];
  selectedVertices: Vertex[];
  editingImageId: string | null;
  entityDragTarget: EntityDragTarget | null;
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
  splineState: MutableRefObject<SplineDrawingState | null>;
  cursorWorld: MutableRefObject<Point>;
  snapTarget: MutableRefObject<Point>;
  snapActive: MutableRefObject<boolean>;
  snapToGridEnabled: boolean;
}

export function useSketchRenderer(args: UseSketchRendererArgs): { requestRender: () => void } {
  const {
    canvasRef,
    containerRef,
    project,
    viewport,
    selectedEntityIds,
    selectedVertices,
    editingImageId,
    entityDragTarget,
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
    splineState,
    cursorWorld,
    snapTarget,
    snapActive,
    snapToGridEnabled,
  } = args;

  const dirtyRef = useRef(true);
  const scheduledRef = useRef(false);

  const requestRender = useCallback(() => {
    if (scheduledRef.current) return;
    scheduledRef.current = true;
    dirtyRef.current = true;
    requestAnimationFrame(() => {
      scheduledRef.current = false;
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      renderSketch({
        ctx,
        canvas,
        project,
        viewport,
        selectedEntityIds,
        selectedVertices,
        editingImageId,
        entityDragTarget,
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
        splineState,
        cursorWorld,
        snapTarget,
        snapActive,
        snapToGridEnabled,
      });
    });
  }, [
    canvasRef,
    project,
    viewport,
    selectedEntityIds,
    selectedVertices,
    editingImageId,
    entityDragTarget,
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
    splineState,
    cursorWorld,
    snapTarget,
    snapActive,
    snapToGridEnabled,
  ]);

  useEffect(() => {
    requestRender();
  }, [requestRender]);

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
      requestRender();
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    window.addEventListener("resize", resize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef, containerRef, requestRender]);

  return { requestRender };
}
