import { useEffect, type MutableRefObject } from "react";
import type { ToolMode } from "../../types";
import type { RefScalePopupState } from "./tools/useImageRefScaleTool";
import type { SplineDrawingState } from "./tools/useSplineTool";

interface UseCanvasKeyboardShortcutsArgs {
  pendingRectangle: MutableRefObject<{ points: unknown[]; confirmPoint: unknown } | null>;
  splineState: MutableRefObject<SplineDrawingState | null>;
  drawingPoints: MutableRefObject<unknown[]>;
  refScalePopup: RefScalePopupState | null;
  confirmPendingRectangle: () => boolean;
  cancelPendingRectangle: () => boolean;
  cancelRefScale: () => void;
  cancelPolyline: () => boolean;
  popPolylinePoint: () => boolean;
  finishPolyline: (close: boolean) => boolean;
  cancelSpline: () => boolean;
  popSplineAnchor: () => boolean;
  finishSpline: (close: boolean) => boolean;
  finishCircle: () => boolean;
  cancelReferenceLine: () => void;
  setToolMode: (mode: ToolMode) => void;
  toolMode: ToolMode;
  setEditingImageId: (id: string | null) => void;
  setEntityDragTarget: (target: null) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function useCanvasKeyboardShortcuts({
  pendingRectangle,
  splineState,
  drawingPoints,
  refScalePopup,
  confirmPendingRectangle,
  cancelPendingRectangle,
  cancelRefScale,
  cancelPolyline,
  popPolylinePoint,
  finishPolyline,
  cancelSpline,
  popSplineAnchor,
  finishSpline,
  finishCircle,
  cancelReferenceLine,
  setToolMode,
  toolMode,
  setEditingImageId,
  setEntityDragTarget,
}: UseCanvasKeyboardShortcutsArgs): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // `drawingPoints` is shared with the circle/rectangle tools too — only
      // treat it as an in-progress polyline when that tool is actually active.
      const isPolylineDrawing = toolMode === "polyline" && drawingPoints.current.length > 0;
      const isCircleDrawing = toolMode === "circle" && drawingPoints.current.length === 2;
      if (
        (splineState.current || isPolylineDrawing) &&
        ((event.ctrlKey && event.key.toLowerCase() === "z") ||
          event.key === "Backspace")
      ) {
        event.preventDefault();
        if (splineState.current) {
          popSplineAnchor();
        } else if (isPolylineDrawing) {
          popPolylinePoint();
        }
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        if (pendingRectangle.current) {
          event.preventDefault();
          confirmPendingRectangle();
        }
        if (splineState.current) {
          event.preventDefault();
          finishSpline(false);
          setToolMode("select");
        }
        if (isPolylineDrawing) {
          event.preventDefault();
          finishPolyline(false);
          setToolMode("select");
        }
        if (isCircleDrawing) {
          event.preventDefault();
          finishCircle();
          setToolMode("select");
        }
        return;
      }
      if (event.key !== "Escape") return;

      if (refScalePopup) {
        event.preventDefault();
        cancelRefScale();
        return;
      }
      if (pendingRectangle.current) {
        event.preventDefault();
        cancelPendingRectangle();
        setToolMode("select");
        return;
      }
      if (splineState.current) {
        event.preventDefault();
        cancelSpline();
        setToolMode("select");
        return;
      }
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      cancelPolyline();
      cancelReferenceLine();
      setToolMode("select");
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    confirmPendingRectangle,
    cancelPendingRectangle,
    refScalePopup,
    cancelRefScale,
    cancelPolyline,
    popPolylinePoint,
    finishPolyline,
    cancelSpline,
    popSplineAnchor,
    finishSpline,
    finishCircle,
    cancelReferenceLine,
    setToolMode,
    pendingRectangle,
    splineState,
    drawingPoints,
    toolMode,
  ]);

  useEffect(() => {
    cancelPolyline();
    cancelPendingRectangle();
    cancelSpline();
    cancelReferenceLine();
    setEditingImageId(null);
    setEntityDragTarget(null);
  }, [
    toolMode,
    cancelPolyline,
    cancelPendingRectangle,
    cancelSpline,
    cancelReferenceLine,
    setEditingImageId,
    setEntityDragTarget,
  ]);
}
