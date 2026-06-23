import { type MutableRefObject } from "react";
import type { Point, ToolMode, ViewportState } from "../../types";
import {
  drawDrawingPreview,
  drawPendingRectangle,
  drawReferenceLine,
  drawRefScaleConfirm,
  drawSelectionArea,
  drawSnapTarget,
} from "./renderInteraction";
import type { SplineDrawingState } from "./tools/useSplineTool";

export interface RenderOverlayArgs {
  ctx: CanvasRenderingContext2D;
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
  imageRefLineStart: MutableRefObject<Point | null>;
  imageRefLineEnd: MutableRefObject<Point | null>;
  refScalePopup: { screenX: number; screenY: number } | null;
  snapToGridEnabled: boolean;
}

export function renderOverlay({
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
  imageRefLineStart,
  imageRefLineEnd,
  refScalePopup,
  snapToGridEnabled,
}: RenderOverlayArgs): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  ctx.translate(viewport.offsetX, viewport.offsetY);
  ctx.scale(viewport.zoom, viewport.zoom);

  drawReferenceLine(ctx, viewport, imageRefLineStart, imageRefLineEnd);
  drawRefScaleConfirm(ctx, viewport, refScalePopup);
  drawDrawingPreview(
    ctx, viewport, toolMode, isDrawing, drawingPoints, closeToStart, splineState,
  );
  drawSelectionArea(ctx, viewport, isSelectDragging, selectDragStart, selectDragEnd);
  drawPendingRectangle(ctx, viewport, pendingRectangle);
  drawSnapTarget(
    ctx, viewport, cursorWorld.current, snapTarget.current, snapActive.current, snapToGridEnabled,
  );

  ctx.restore();
}
