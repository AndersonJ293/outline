import { useEffect, useRef, useCallback, type RefObject, type MutableRefObject } from "react";
import type { Point, ToolMode, ViewportState } from "../../types";
import { renderOverlay } from "./renderOverlay";
import type { SplineDrawingState } from "./tools/useSplineTool";
import type { SnapGuide, SnapKind } from "./snapping";

interface UseOverlayRendererArgs {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  viewport: ViewportState;
  toolMode: ToolMode;
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
  snapKind: MutableRefObject<SnapKind>;
  snapGuides: MutableRefObject<SnapGuide[]>;
  snapMarker: MutableRefObject<Point | null>;
  drawLengthInput: MutableRefObject<string>;
  imageRefLineStart: MutableRefObject<Point | null>;
  imageRefLineEnd: MutableRefObject<Point | null>;
  refScalePopup: { screenX: number; screenY: number } | null;
  snapToGridEnabled: boolean;
}

export function useOverlayRenderer(args: UseOverlayRendererArgs): { requestRender: () => void } {
  const {
    canvasRef,
    viewport,
    toolMode,
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
    snapKind,
    snapGuides,
    snapMarker,
    drawLengthInput,
    imageRefLineStart,
    imageRefLineEnd,
    refScalePopup,
    snapToGridEnabled,
  } = args;

  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const scheduledRef = useRef(false);

  const doRender = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    renderOverlay({
      ctx,
      viewport,
      toolMode,
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
      snapKind,
      snapGuides,
      snapMarker,
      drawLengthInput,
      imageRefLineStart,
      imageRefLineEnd,
      refScalePopup,
      snapToGridEnabled,
    });
  }, [
    canvasRef,
    viewport,
    toolMode,
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
    snapKind,
    snapGuides,
    snapMarker,
    drawLengthInput,
    imageRefLineStart,
    imageRefLineEnd,
    refScalePopup,
    snapToGridEnabled,
  ]);

  const requestRender = useCallback(() => {
    if (scheduledRef.current) return;
    scheduledRef.current = true;
    requestAnimationFrame(() => {
      scheduledRef.current = false;
      doRender();
    });
  }, [doRender]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext("2d");
    }
  }, [canvasRef]);

  useEffect(() => {
    requestRender();
  }, [requestRender]);

  return { requestRender };
}
