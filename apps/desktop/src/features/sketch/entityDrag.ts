import type { Entity, Point, SplineControlPoint } from "../../types";
import { sampleSpline } from "./spline";

export interface SplineMove {
  points: Point[];
  controlPoints: SplineControlPoint[];
}

function clampIndex(i: number, n: number): number {
  if (i < 0) return 0;
  if (i >= n) return n - 1;
  return i;
}

function resampleSpline(
  entity: Entity,
  controlPoints: SplineControlPoint[],
): Point[] {
  if (!entity.controlPoints) return entity.points;
  return sampleSpline(
    controlPoints,
    entity.samplingSteps ?? 64,
    entity.closed,
  );
}

export function applyPointMove(
  entity: Entity,
  pointIndex: number,
  world: Point,
  start: Point,
): Point[] {
  if (pointIndex < 0 || pointIndex >= entity.points.length) return entity.points;
  const dx = world.x - start.x;
  const dy = world.y - start.y;
  return entity.points.map((p, i) =>
    i === pointIndex ? { x: p.x + dx, y: p.y + dy } : p,
  );
}

export function applySplinePointMove(
  entity: Entity,
  anchorIndex: number,
  world: Point,
  start: Point,
): SplineMove | null {
  if (!entity.controlPoints) return null;
  const n = entity.controlPoints.length;
  const idx = clampIndex(anchorIndex, n);
  const dx = world.x - start.x;
  const dy = world.y - start.y;
  const controlPoints = entity.controlPoints.map((cp, i) =>
    i === idx
      ? { point: { x: cp.point.x + dx, y: cp.point.y + dy }, handleOut: cp.handleOut }
      : cp,
  );
  return { points: resampleSpline(entity, controlPoints), controlPoints };
}

export function applySegmentMove(
  entity: Entity,
  segIdx: number,
  world: Point,
  start: Point,
): Point[] {
  if (segIdx < 0 || segIdx >= entity.points.length) return entity.points;
  const dx = world.x - start.x;
  const dy = world.y - start.y;
  const len = entity.points.length;
  const endIdx = entity.closed ? (segIdx + 1) % len : segIdx + 1;
  if (!entity.closed && endIdx >= len) return entity.points;
  return entity.points.map((p, i) =>
    i === segIdx || i === endIdx ? { x: p.x + dx, y: p.y + dy } : p,
  );
}

export function applySplineSegmentMove(
  entity: Entity,
  segIdx: number,
  world: Point,
  start: Point,
): SplineMove | null {
  if (!entity.controlPoints) return null;
  const n = entity.controlPoints.length;
  if (n < 2) return null;
  const idx = clampIndex(segIdx, n);
  const dx = world.x - start.x;
  const dy = world.y - start.y;
  const endIdx = entity.closed ? (idx + 1) % n : idx + 1;
  if (!entity.closed && endIdx >= n) return null;
  const controlPoints = entity.controlPoints.map((cp, i) =>
    i === idx || i === endIdx
      ? { point: { x: cp.point.x + dx, y: cp.point.y + dy }, handleOut: cp.handleOut }
      : cp,
  );
  return { points: resampleSpline(entity, controlPoints), controlPoints };
}

export function applyEntityMove(
  entity: Entity,
  world: Point,
  start: Point,
): Point[] {
  const dx = world.x - start.x;
  const dy = world.y - start.y;
  return entity.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

export function applySplineEntityMove(
  entity: Entity,
  world: Point,
  start: Point,
): SplineMove | null {
  if (!entity.controlPoints) return null;
  const dx = world.x - start.x;
  const dy = world.y - start.y;
  const controlPoints = entity.controlPoints.map((cp) => ({
    point: { x: cp.point.x + dx, y: cp.point.y + dy },
    handleOut: cp.handleOut,
  }));
  return { points: resampleSpline(entity, controlPoints), controlPoints };
}
