import type { MutableRefObject } from "react";
import type { Point, Project, ToolMode, ViewportState } from "../../types";
import { drawEntities } from "./renderEntities";
import { drawGrid, drawGridLabel } from "./renderGrid";
import { drawImages } from "./renderImages";
import {
  drawDrawingPreview,
  drawPendingRectangle,
  drawReferenceLine,
  drawRefScaleConfirm,
  drawSelectionArea,
} from "./renderInteraction";

export interface RenderSketchArgs {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  project: Project | null;
  viewport: ViewportState;
  selectedEntityIds: string[];
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
}

export function renderSketch({
  ctx,
  canvas,
  project,
  viewport,
  selectedEntityIds,
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
}: RenderSketchArgs): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(viewport.offsetX, viewport.offsetY);
  ctx.scale(viewport.zoom, viewport.zoom);

  drawGrid(ctx, canvas, viewport);
  drawImages(ctx, project, viewport, selectedEntityIds, imageCache, isImageResizing, imageResizeId);
  drawReferenceLine(ctx, viewport, imageRefLineStart, imageRefLineEnd);
  drawRefScaleConfirm(ctx, viewport, refScalePopup);
  drawEntities(ctx, project, viewport, selectedEntityIds);
  drawDrawingPreview(ctx, viewport, toolMode, isDrawing, drawingPoints, closeToStart);
  drawSelectionArea(ctx, viewport, isSelectDragging, selectDragStart, selectDragEnd);
  drawPendingRectangle(ctx, viewport, pendingRectangle);
  drawGridLabel(ctx, viewport);

  ctx.restore();
}
