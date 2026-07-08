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

export function getSnapStep(zoom: number): number {
  const stepMm = GRID_SIZE / zoom;
  if (stepMm <= 0.5) return 0.5;
  if (stepMm <= 1) return 1;
  if (stepMm <= 2) return 2;
  if (stepMm <= 5) return 5;
  if (stepMm <= 10) return 10;
  if (stepMm <= 20) return 20;
  if (stepMm <= 50) return 50;
  return 100;
}

export function snapToGrid(point: Point, step = GRID_SIZE): Point {
  if (step <= 0) return point;
  return {
    x: Math.round(point.x / step) * step,
    y: Math.round(point.y / step) * step,
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

export function circlePoints(center: Point, edge: Point, segments = 96): Point[] {
  const radius = pointDistance(center, edge);
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  }
  return points;
}
