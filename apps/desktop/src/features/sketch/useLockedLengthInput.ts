import { useCallback, useEffect, type MutableRefObject } from "react";
import type { Point, ToolMode } from "../../types";

type UseLockedLengthInputArgs = {
  active: boolean;
  toolMode: ToolMode;
  drawLengthInput: MutableRefObject<string>;
  snapTarget: MutableRefObject<Point>;
  drawingAnchor: () => Point | null;
  handlePolylineMouseDown: (point: Point) => boolean;
  handleSplineMouseDown: (point: Point) => boolean;
  handleCircleMouseDown: (point: Point) => boolean;
  updateCirclePreview: (point: Point) => boolean;
  requestRender: () => void;
};

/// For a circle, the typed value is the diameter (matches the "Ø" label
/// shown while drawing); every other tool treats it as a direct distance.
function lengthToDistance(toolMode: ToolMode, len: number): number {
  return toolMode === "circle" ? len / 2 : len;
}

export function useLockedLengthInput({
  active,
  toolMode,
  drawLengthInput,
  snapTarget,
  drawingAnchor,
  handlePolylineMouseDown,
  handleSplineMouseDown,
  handleCircleMouseDown,
  updateCirclePreview,
  requestRender,
}: UseLockedLengthInputArgs) {
  const applyLockedLength = useCallback(() => {
    const anchor = drawingAnchor();
    const len = parseFloat(drawLengthInput.current);
    if (!anchor || !(len > 0)) return;
    const dx = snapTarget.current.x - anchor.x;
    const dy = snapTarget.current.y - anchor.y;
    const d = Math.hypot(dx, dy);
    if (d > 1e-6) {
      const dist = lengthToDistance(toolMode, len);
      const point = { x: anchor.x + (dx / d) * dist, y: anchor.y + (dy / d) * dist };
      snapTarget.current = point;
      if (toolMode === "circle") updateCirclePreview(point);
    }
  }, [drawingAnchor, drawLengthInput, snapTarget, toolMode, updateCirclePreview]);

  const commitLockedLength = useCallback((): boolean => {
    const anchor = drawingAnchor();
    const len = parseFloat(drawLengthInput.current);
    if (!anchor || !(len > 0)) return false;
    const dx = snapTarget.current.x - anchor.x;
    const dy = snapTarget.current.y - anchor.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) return false;
    const dist = lengthToDistance(toolMode, len);
    const point = { x: anchor.x + (dx / d) * dist, y: anchor.y + (dy / d) * dist };
    if (toolMode === "polyline") handlePolylineMouseDown(point);
    else if (toolMode === "spline") handleSplineMouseDown(point);
    else if (toolMode === "circle") handleCircleMouseDown(point);
    else return false;
    drawLengthInput.current = "";
    requestRender();
    return true;
  }, [
    drawingAnchor,
    snapTarget,
    drawLengthInput,
    toolMode,
    handlePolylineMouseDown,
    handleSplineMouseDown,
    handleCircleMouseDown,
    requestRender,
  ]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!active) return;
      if (toolMode !== "polyline" && toolMode !== "spline" && toolMode !== "circle") return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const focused = document.activeElement;
      if (
        focused instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(focused.tagName)
      ) {
        return;
      }
      if (!drawingAnchor()) return;

      const key = event.key;
      if ((key >= "0" && key <= "9") || key === ".") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (key === "." && drawLengthInput.current.includes(".")) return;
        drawLengthInput.current += key;
        applyLockedLength();
        requestRender();
      } else if (key === "Backspace" && drawLengthInput.current.length > 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        drawLengthInput.current = drawLengthInput.current.slice(0, -1);
        applyLockedLength();
        requestRender();
      } else if ((key === "Enter" || key === "Tab") && drawLengthInput.current.length > 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        commitLockedLength();
      } else if (key === "Escape" && drawLengthInput.current.length > 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        drawLengthInput.current = "";
        requestRender();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [
    active,
    toolMode,
    drawingAnchor,
    drawLengthInput,
    applyLockedLength,
    commitLockedLength,
    requestRender,
  ]);

  useEffect(() => {
    drawLengthInput.current = "";
  }, [toolMode, drawLengthInput]);

  return { applyLockedLength, commitLockedLength };
}
