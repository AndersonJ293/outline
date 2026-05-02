import type { Point, ViewportState } from "../../types";
import { pointDistance } from "../../types";
import { GRID_SIZE } from "./constants";

export function screenToWorld(
  sx: number,
  sy: number,
  rect: DOMRect,
  viewport: ViewportState,
): Point {
  return {
    x: (sx - rect.left - viewport.offsetX) / viewport.zoom,
    y: (sy - rect.top - viewport.offsetY) / viewport.zoom,
  };
}

export function worldToScreen(point: Point, viewport: ViewportState): Point {
  return {
    x: point.x * viewport.zoom + viewport.offsetX,
    y: point.y * viewport.zoom + viewport.offsetY,
  };
}

export function snapToGrid(point: Point, gridSize = GRID_SIZE): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

export function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return pointDistance(point, a);

  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq),
  );

  return pointDistance(point, {
    x: a.x + t * dx,
    y: a.y + t * dy,
  });
}

export function rectanglePoints(p0: Point, p1: Point): Point[] {
  return [
    { x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y) },
    { x: Math.max(p0.x, p1.x), y: Math.min(p0.y, p1.y) },
    { x: Math.max(p0.x, p1.x), y: Math.max(p0.y, p1.y) },
    { x: Math.min(p0.x, p1.x), y: Math.max(p0.y, p1.y) },
  ];
}
