import type { MutableRefObject } from "react";
import type { Point, ToolMode, ViewportState } from "../../types";
import { pointDistance } from "../../types";
import { CLOSE_THRESHOLD, HANDLE_RADIUS } from "./constants";
import { rectanglePoints } from "./geometry";
import { autoHandleFor, sampleSpline } from "./spline";
import type { SplineDrawingState } from "./tools/useSplineTool";

export function drawReferenceLine(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  imageRefLineStart: MutableRefObject<Point | null>,
  imageRefLineEnd: MutableRefObject<Point | null>,
): void {
  if (!imageRefLineStart.current || !imageRefLineEnd.current) return;

  ctx.strokeStyle = "#ff9800";
  ctx.lineWidth = 2 / viewport.zoom;
  ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);
  ctx.beginPath();
  ctx.moveTo(imageRefLineStart.current.x, imageRefLineStart.current.y);
  ctx.lineTo(imageRefLineEnd.current.x, imageRefLineEnd.current.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const len = pointDistance(imageRefLineStart.current, imageRefLineEnd.current);
  ctx.fillStyle = "#ff9800";
  ctx.font = `bold ${13 / viewport.zoom}px monospace`;
  const midX = (imageRefLineStart.current.x + imageRefLineEnd.current.x) / 2;
  const midY = (imageRefLineStart.current.y + imageRefLineEnd.current.y) / 2;
  ctx.fillText(`${len.toFixed(1)} mm`, midX + 4 / viewport.zoom, midY - 4 / viewport.zoom);
}

export function drawRefScaleConfirm(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  refScalePopup: { screenX: number; screenY: number } | null,
): void {
  if (!refScalePopup) return;

  const confirmPoint = {
    x: (refScalePopup.screenX - viewport.offsetX) / viewport.zoom,
    y: (refScalePopup.screenY - viewport.offsetY) / viewport.zoom,
  };
  ctx.fillStyle = "#4caf50";
  ctx.beginPath();
  ctx.arc(confirmPoint.x, confirmPoint.y, 8 / viewport.zoom, 0, Math.PI * 2);
  ctx.fill();
}

export function drawDrawingPreview(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  toolMode: ToolMode,
  isDrawing: MutableRefObject<boolean>,
  drawingPoints: MutableRefObject<Point[]>,
  closeToStart: MutableRefObject<boolean>,
  splineState: MutableRefObject<SplineDrawingState | null> | null = null,
): void {
  if (!isDrawing.current) return;

  if (toolMode === "spline" && splineState?.current && splineState.current.anchors.length > 0) {
    drawSplinePreview(ctx, viewport, splineState.current);
    drawClosePreview(ctx, viewport, splineState.current.anchors);
    return;
  }

  if (drawingPoints.current.length === 0) return;

  ctx.strokeStyle = "rgba(79, 195, 247, 0.6)";
  ctx.lineWidth = 2 / viewport.zoom;
  ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);

  if (toolMode === "rectangle" && drawingPoints.current.length === 2) {
    drawRectanglePreview(ctx, viewport, drawingPoints.current[0], drawingPoints.current[1]);
  } else {
    drawPolylinePreview(ctx, drawingPoints.current, closeToStart.current);
  }

  for (const pt of drawingPoints.current) {
    ctx.fillStyle = "rgba(79, 195, 247, 0.8)";
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, HANDLE_RADIUS / viewport.zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  drawClosePreview(ctx, viewport, drawingPoints.current);
}

export function drawSelectionArea(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  isSelectDragging: MutableRefObject<boolean>,
  selectDragStart: MutableRefObject<Point>,
  selectDragEnd: MutableRefObject<Point>,
): void {
  if (!isSelectDragging.current) return;

  const [a, b, c, d] = rectanglePoints(selectDragStart.current, selectDragEnd.current);
  ctx.strokeStyle = "rgba(79, 195, 247, 0.8)";
  ctx.fillStyle = "rgba(79, 195, 247, 0.08)";
  ctx.lineWidth = 1.5 / viewport.zoom;
  ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawPendingRectangle(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  pendingRectangle: MutableRefObject<{ points: Point[]; confirmPoint: Point } | null>,
): void {
  if (!pendingRectangle.current) return;

  const { points, confirmPoint } = pendingRectangle.current;
  ctx.strokeStyle = "#4fc3f7";
  ctx.fillStyle = "rgba(79, 195, 247, 0.1)";
  ctx.lineWidth = 2 / viewport.zoom;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#4caf50";
  ctx.beginPath();
  ctx.arc(confirmPoint.x, confirmPoint.y, 8 / viewport.zoom, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5 / viewport.zoom;
  ctx.beginPath();
  ctx.moveTo(confirmPoint.x - 4 / viewport.zoom, confirmPoint.y);
  ctx.lineTo(confirmPoint.x - 1 / viewport.zoom, confirmPoint.y + 3 / viewport.zoom);
  ctx.lineTo(confirmPoint.x + 5 / viewport.zoom, confirmPoint.y - 4 / viewport.zoom);
  ctx.stroke();
}

function drawRectanglePreview(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  p0: Point,
  p1: Point,
): void {
  const [a, b, c, d] = rectanglePoints(p0, p1);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fillStyle = "rgba(79, 195, 247, 0.08)";
  ctx.fill();
  ctx.stroke();

  const width = Math.abs(p1.x - p0.x).toFixed(1);
  const height = Math.abs(p1.y - p0.y).toFixed(1);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `${12 / viewport.zoom}px monospace`;
  ctx.fillText(`${width} x ${height} mm`, p1.x + 8 / viewport.zoom, p1.y - 8 / viewport.zoom);
}

function drawPolylinePreview(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  closeToStart: boolean,
): void {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  if (closeToStart) {
    ctx.closePath();
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSplinePreview(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  state: SplineDrawingState,
): void {
  const anchors = state.anchors;
  const handles = anchors.map((anchor, i) =>
    autoHandleFor(anchors[i - 1] ?? null, anchor, anchors[i + 1] ?? null),
  );
  const cps = anchors.map((point, i) => ({ point, handleOut: handles[i] }));
  const samples = sampleSpline(cps, 16, false);

  ctx.strokeStyle = "rgba(79, 195, 247, 0.6)";
  ctx.lineWidth = 2 / viewport.zoom;
  ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);
  ctx.beginPath();
  ctx.moveTo(samples[0].x, samples[0].y);
  for (let i = 1; i < samples.length; i++) {
    ctx.lineTo(samples[i].x, samples[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  for (const cp of cps) {
    ctx.fillStyle = "rgba(79, 195, 247, 0.8)";
    ctx.beginPath();
    ctx.arc(cp.point.x, cp.point.y, HANDLE_RADIUS / viewport.zoom, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawClosePreview(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  points: Point[],
): void {
  if (points.length < 2) return;

  const first = points[0];
  const last = points[points.length - 1];
  const dist = pointDistance(last, first);
  const distScreen = dist * viewport.zoom;
  if (distScreen >= CLOSE_THRESHOLD) return;

  ctx.strokeStyle = "#4caf50";
  ctx.lineWidth = 2 / viewport.zoom;
  ctx.setLineDash([2 / viewport.zoom, 4 / viewport.zoom]);
  ctx.beginPath();
  ctx.moveTo(last.x, last.y);
  ctx.lineTo(first.x, first.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#4caf50";
  ctx.beginPath();
  ctx.arc(first.x, first.y, (HANDLE_RADIUS + 4) / viewport.zoom, 0, Math.PI * 2);
  ctx.fill();
}

export function drawSnapTarget(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  cursorWorld: Point,
  snapPoint: Point,
  active: boolean,
  snapEnabled: boolean,
): void {
  const dx = snapPoint.x - cursorWorld.x;
  const dy = snapPoint.y - cursorWorld.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const distScreen = dist * viewport.zoom;

  if (snapEnabled) {
    if (!active) return;
    if (distScreen < 1) return;
  }

  const color = snapEnabled ? "#4fc3f7" : "#ff9800";

  if (distScreen >= 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 / viewport.zoom;
    ctx.setLineDash([4 / viewport.zoom, 3 / viewport.zoom]);
    ctx.beginPath();
    ctx.moveTo(cursorWorld.x, cursorWorld.y);
    ctx.lineTo(snapPoint.x, snapPoint.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const crossSize = 5 / viewport.zoom;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5 / viewport.zoom;
  ctx.beginPath();
  ctx.moveTo(snapPoint.x - crossSize, snapPoint.y);
  ctx.lineTo(snapPoint.x + crossSize, snapPoint.y);
  ctx.moveTo(snapPoint.x, snapPoint.y - crossSize);
  ctx.lineTo(snapPoint.x, snapPoint.y + crossSize);
  ctx.stroke();
}
