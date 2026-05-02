import type { Entity, Point, Project, SketchImage, ViewportState } from "../../types";
import { HANDLE_RADIUS, LINE_HIT_RADIUS } from "./constants";
import { distanceToSegment } from "./geometry";

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

export function hitTestEntity(
  entities: Entity[],
  world: Point,
  viewport: ViewportState,
): string | null {
  for (const entity of entities) {
    for (const pt of entity.points) {
      const dx = (pt.x - world.x) * viewport.zoom;
      const dy = (pt.y - world.y) * viewport.zoom;
      if (Math.sqrt(dx * dx + dy * dy) < HANDLE_RADIUS * 3) {
        return entity.id;
      }
    }

    for (let i = 0; i < entity.points.length; i++) {
      const a = entity.points[i];
      const b = entity.points[i + 1] ?? (entity.closed ? entity.points[0] : null);
      if (!b) continue;
      if (distanceToSegment(world, a, b) * viewport.zoom < LINE_HIT_RADIUS) {
        return entity.id;
      }
    }
  }

  return null;
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

export function selectEntitiesInRect(entities: Entity[], start: Point, end: Point): string[] {
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  const ids: string[] = [];

  for (const entity of entities) {
    for (const pt of entity.points) {
      if (pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY) {
        ids.push(entity.id);
        break;
      }
    }
  }

  return ids;
}
