import type { Entity, Point } from "../../types";

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

export function applyEntityMove(
  entity: Entity,
  world: Point,
  start: Point,
): Point[] {
  const dx = world.x - start.x;
  const dy = world.y - start.y;
  return entity.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}
