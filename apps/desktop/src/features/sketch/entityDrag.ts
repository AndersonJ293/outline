import type { Entity, Point, SplineControlPoint } from "../../types";
import { circlePoints } from "./geometry";
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
  if (entity.type === "circle" && entity.center) {
    return applyEntityMove(entity, world, start);
  }
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
  if (entity.type === "circle") {
    return applyEntityMove(entity, world, start);
  }
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

export interface EntityGeometry {
  points: Point[];
  center?: Point;
  radiusMm?: number;
  controlPoints?: SplineControlPoint[];
}

function translateCircle(
  entity: Entity,
  dx: number,
  dy: number,
): EntityGeometry | null {
  if (entity.type !== "circle" || !entity.center || !entity.radiusMm) return null;
  const center = { x: entity.center.x + dx, y: entity.center.y + dy };
  const edge = { x: center.x + entity.radiusMm, y: center.y };
  const segments = entity.samplingSteps ?? (entity.points.length || 96);
  return {
    center,
    radiusMm: entity.radiusMm,
    points: circlePoints(center, edge, segments),
  };
}

/// Translates every point of an entity by (dx, dy).
export function translateEntityWhole(
  entity: Entity,
  dx: number,
  dy: number,
): EntityGeometry {
  const circle = translateCircle(entity, dx, dy);
  if (circle) return circle;
  if (entity.type === "spline" && entity.controlPoints) {
    const controlPoints = entity.controlPoints.map((cp) => ({
      point: { x: cp.point.x + dx, y: cp.point.y + dy },
      handleOut: { ...cp.handleOut },
    }));
    return { points: resampleSpline(entity, controlPoints), controlPoints };
  }
  return { points: entity.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
}

/// Translates only the given vertex indices by (dx, dy). For splines the
/// indices address `controlPoints`; for everything else, `points`.
export function translateEntityVertices(
  entity: Entity,
  indices: Set<number>,
  dx: number,
  dy: number,
): EntityGeometry {
  const circle = translateCircle(entity, dx, dy);
  if (circle && indices.has(0)) return circle;
  if (entity.type === "spline" && entity.controlPoints) {
    const controlPoints = entity.controlPoints.map((cp, i) =>
      indices.has(i)
        ? { point: { x: cp.point.x + dx, y: cp.point.y + dy }, handleOut: { ...cp.handleOut } }
        : { point: { ...cp.point }, handleOut: { ...cp.handleOut } },
    );
    return { points: resampleSpline(entity, controlPoints), controlPoints };
  }
  return {
    points: entity.points.map((p, i) =>
      indices.has(i) ? { x: p.x + dx, y: p.y + dy } : p,
    ),
  };
}

/// Reflects a point across the infinite line through `a` and `b`.
export function reflectPointAcrossLine(p: Point, a: Point, b: Point): Point {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return { x: p.x, y: p.y };
  // Projection factor of (p - a) onto the line direction.
  const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
  const projX = a.x + t * abx;
  const projY = a.y + t * aby;
  return { x: 2 * projX - p.x, y: 2 * projY - p.y };
}

/// Returns a mirrored copy of `entity` across the line through `a` and `b`,
/// with a fresh id. Spline handles are reflected as direction vectors.
export function reflectEntity(
  entity: Entity,
  a: Point,
  b: Point,
  newId: string,
): Entity {
  const points = entity.points.map((p) => reflectPointAcrossLine(p, a, b));
  if (entity.type === "circle" && entity.center && entity.radiusMm) {
    const center = reflectPointAcrossLine(entity.center, a, b);
    return {
      ...entity,
      id: newId,
      center,
      radiusMm: entity.radiusMm,
      points: circlePoints(
        center,
        { x: center.x + entity.radiusMm, y: center.y },
        entity.samplingSteps ?? (entity.points.length || 96),
      ),
    };
  }
  if (entity.type === "spline" && entity.controlPoints) {
    const controlPoints = entity.controlPoints.map((cp) => {
      const point = reflectPointAcrossLine(cp.point, a, b);
      const tip = reflectPointAcrossLine(
        { x: cp.point.x + cp.handleOut.dx, y: cp.point.y + cp.handleOut.dy },
        a,
        b,
      );
      return { point, handleOut: { dx: tip.x - point.x, dy: tip.y - point.y } };
    });
    return {
      ...entity,
      id: newId,
      controlPoints,
      points: sampleSpline(controlPoints, entity.samplingSteps ?? 64, entity.closed),
    };
  }
  return { ...entity, id: newId, points };
}
