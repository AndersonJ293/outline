import type { Dimension, Entity, Point, Project, ViewportState } from "../../types";
import { pointDistance } from "../../types";
import { distanceToSegment } from "./geometry";
import { LINE_HIT_RADIUS } from "./constants";

/// Resolve the two endpoints of the segment a linear dimension references.
/// Returns null when the segment index is no longer valid (e.g. the entity
/// lost vertices after the dimension was created).
export function segmentEndpoints(
  entity: Entity,
  segIdx: number,
): [Point, Point] | null {
  const pts = entity.points;
  if (segIdx < 0 || segIdx >= pts.length) return null;
  const a = pts[segIdx];
  const b = pts[segIdx + 1] ?? (entity.closed ? pts[0] : null);
  if (!b) return null;
  return [a, b];
}

/// Measured length of the dimensioned segment, or null if invalid.
export function measureSegment(entity: Entity, segIdx: number): number | null {
  const ends = segmentEndpoints(entity, segIdx);
  if (!ends) return null;
  return pointDistance(ends[0], ends[1]);
}

/// Drive the geometry so the dimensioned segment reaches `value` mm.
/// The first endpoint stays put; the second slides along the segment
/// direction. A rectangle becomes a polyline because moving one corner
/// breaks its right angles — keeping the type honest.
export function applyLinearDimension(
  entity: Entity,
  segIdx: number,
  value: number,
): Partial<Entity> | null {
  const ends = segmentEndpoints(entity, segIdx);
  if (!ends || value <= 0) return null;
  const [a, b] = ends;
  const current = pointDistance(a, b);
  if (current < 1e-6) return null;

  const ux = (b.x - a.x) / current;
  const uy = (b.y - a.y) / current;
  const movedIdx = segIdx + 1 < entity.points.length ? segIdx + 1 : 0;
  const newB: Point = { x: a.x + ux * value, y: a.y + uy * value };

  const points = entity.points.map((p, i) => (i === movedIdx ? newB : { ...p }));
  const updates: Partial<Entity> = { points };
  if (entity.type === "rectangle") updates.type = "polyline";
  return updates;
}

export interface DimensionLayout {
  /// Endpoints of the measured segment.
  a: Point;
  b: Point;
  /// Endpoints of the offset dimension line (parallel to the segment).
  da: Point;
  db: Point;
  /// Midpoint of the dimension line, where the label sits.
  mid: Point;
  length: number;
}

/// Geometry needed to draw a linear dimension: the offset line and label
/// position, computed perpendicular to the segment.
export function dimensionLayout(
  entity: Entity,
  dim: Dimension,
): DimensionLayout | null {
  const ends = segmentEndpoints(entity, dim.segIdx);
  if (!ends) return null;
  const [a, b] = ends;
  const len = pointDistance(a, b);
  if (len < 1e-6) return null;
  // Perpendicular unit vector (rotate direction by 90°).
  const nx = -(b.y - a.y) / len;
  const ny = (b.x - a.x) / len;
  const da: Point = { x: a.x + nx * dim.offset, y: a.y + ny * dim.offset };
  const db: Point = { x: b.x + nx * dim.offset, y: b.y + ny * dim.offset };
  const mid: Point = { x: (da.x + db.x) / 2, y: (da.y + db.y) / 2 };
  return { a, b, da, db, mid, length: len };
}

/// Return the id of the dimension whose line/label is under the cursor.
export function hitTestDimension(
  project: Project | null,
  world: Point,
  viewport: ViewportState,
): string | null {
  const dims = project?.sketch.dimensions;
  if (!dims) return null;
  for (const dim of dims) {
    const entity = project!.sketch.entities.find((e) => e.id === dim.entityId);
    if (!entity) continue;
    const layout = dimensionLayout(entity, dim);
    if (!layout) continue;
    if (distanceToSegment(world, layout.da, layout.db) * viewport.zoom < LINE_HIT_RADIUS * 1.5) {
      return dim.id;
    }
  }
  return null;
}
