import type { Entity, Point, Project, SketchImage, ViewportState } from "../../types";
import { HANDLE_RADIUS, LINE_HIT_RADIUS } from "./constants";
import { distanceToSegment } from "./geometry";
import { pointDistance } from "../../types";

export type ImageHandleType =
  | "corner-tl"
  | "edge-t"
  | "corner-tr"
  | "edge-r"
  | "corner-br"
  | "edge-b"
  | "edge-l"
  | "corner-bl";

export interface ImageHandleHit {
  imageId: string;
  handleType: ImageHandleType;
}

function displayPoints(entity: Entity): Point[] {
  if (entity.type === "circle" && entity.center) {
    return [entity.center];
  }
  if (entity.type === "spline" && entity.controlPoints) {
    return entity.controlPoints.map((cp) => cp.point);
  }
  return entity.points;
}

function hitCircleOutline(entity: Entity, world: Point, viewport: ViewportState): boolean {
  if (entity.type !== "circle" || !entity.center || !entity.radiusMm) return false;
  const distanceFromOutline = Math.abs(pointDistance(world, entity.center) - entity.radiusMm);
  return distanceFromOutline * viewport.zoom < LINE_HIT_RADIUS;
}

export function hitTestEntity(
  entities: Entity[],
  world: Point,
  viewport: ViewportState,
): string | null {
  return hitTestEntityWithPoint(entities, world, viewport)?.entityId ?? null;
}

export type EntityHit =
  | { kind: "point"; entityId: string; pointIndex: number }
  | { kind: "segment"; entityId: string; segIdx: number };

/// Picks the nearest hit across all entities, not the first one encountered.
/// Curves offset by a small distance sit only a few pixels apart, so
/// first-match-wins would keep grabbing the underlying original curve.
/// Point handles still win over edges at equal distance (easier to grab).
export function hitTestEntityWithPoint(
  entities: Entity[],
  world: Point,
  viewport: ViewportState,
): EntityHit | null {
  const pointRadius = HANDLE_RADIUS * 3;
  let bestPoint: { hit: EntityHit; dist: number } | null = null;
  let bestSegment: { hit: EntityHit; dist: number } | null = null;

  for (const entity of entities) {
    const pts = displayPoints(entity);
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      const dx = (pt.x - world.x) * viewport.zoom;
      const dy = (pt.y - world.y) * viewport.zoom;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < pointRadius && (!bestPoint || dist < bestPoint.dist)) {
        bestPoint = { hit: { kind: "point", entityId: entity.id, pointIndex: i }, dist };
      }
    }

    if (hitCircleOutline(entity, world, viewport)) {
      const dist = Math.abs(
        pointDistance(world, entity.center!) - entity.radiusMm!,
      ) * viewport.zoom;
      if (!bestSegment || dist < bestSegment.dist) {
        bestSegment = { hit: { kind: "segment", entityId: entity.id, segIdx: 0 }, dist };
      }
      continue;
    }

    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[i + 1] ?? (entity.closed ? pts[0] : null);
      if (!b) continue;
      const dist = distanceToSegment(world, a, b) * viewport.zoom;
      if (dist < LINE_HIT_RADIUS && (!bestSegment || dist < bestSegment.dist)) {
        bestSegment = { hit: { kind: "segment", entityId: entity.id, segIdx: i }, dist };
      }
    }
  }

  return (bestPoint ?? bestSegment)?.hit ?? null;
}

export function hitTestImage(images: SketchImage[] | undefined, world: Point): string | null {
  if (!images) return null;

  for (const img of images) {
    const hw = img.widthMm / 2;
    const hh = img.heightMm / 2;
    if (
      world.x >= img.x - hw &&
      world.x <= img.x + hw &&
      world.y >= img.y - hh &&
      world.y <= img.y + hh
    ) {
      return img.id;
    }
  }

  return null;
}

export function hitTestImageHandle(
  image: SketchImage,
  world: Point,
  viewport: ViewportState,
): ImageHandleType | null {
  const hw = image.widthMm / 2;
  const hh = image.heightMm / 2;
  const handleSize = (6 / viewport.zoom) * 3;
  const handles: { dx: number; dy: number; type: ImageHandleType }[] = [
    { dx: -hw, dy: -hh, type: "corner-tl" },
    { dx: 0, dy: -hh, type: "edge-t" },
    { dx: hw, dy: -hh, type: "corner-tr" },
    { dx: hw, dy: 0, type: "edge-r" },
    { dx: hw, dy: hh, type: "corner-br" },
    { dx: 0, dy: hh, type: "edge-b" },
    { dx: -hw, dy: 0, type: "edge-l" },
    { dx: -hw, dy: hh, type: "corner-bl" },
  ];

  return (
    handles.find(
      (handle) =>
        Math.abs(world.x - (image.x + handle.dx)) < handleSize &&
        Math.abs(world.y - (image.y + handle.dy)) < handleSize,
    )?.type ?? null
  );
}

export function getHitId(project: Project | null, world: Point, viewport: ViewportState): string | null {
  if (!project) return null;
  return (
    hitTestEntity(project.sketch.entities, world, viewport) ??
    hitTestImage(project.sketch.images, world)
  );
}

export interface SplineHandleHit {
  entityId: string;
  anchorIndex: number;
}

export function hitTestSplineHandle(
  entity: Entity,
  world: Point,
  viewport: ViewportState,
): SplineHandleHit | null {
  if (entity.type !== "spline" || !entity.controlPoints) return null;
  const radiusScreen = HANDLE_RADIUS * 3;
  const radiusWorld = radiusScreen / viewport.zoom;

  for (let i = 0; i < entity.controlPoints.length; i++) {
    const anchor = entity.controlPoints[i].point;
    const handleEnd = {
      x: anchor.x + entity.controlPoints[i].handleOut.dx,
      y: anchor.y + entity.controlPoints[i].handleOut.dy,
    };
    const dx = (handleEnd.x - world.x) * viewport.zoom;
    const dy = (handleEnd.y - world.y) * viewport.zoom;
    if (Math.sqrt(dx * dx + dy * dy) < radiusScreen) {
      return { entityId: entity.id, anchorIndex: i };
    }
    if (
      Math.hypot(anchor.x - world.x, anchor.y - world.y) < radiusWorld * 0.5
    ) {
      // skip anchor centers; the entity drag tool owns those
    }
  }
  return null;
}

export function selectEntitiesInRect(entities: Entity[], start: Point, end: Point): string[] {
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  const ids: string[] = [];

  for (const entity of entities) {
    const pts = displayPoints(entity);
    for (const pt of pts) {
      if (pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY) {
        ids.push(entity.id);
        break;
      }
    }
  }

  return ids;
}
