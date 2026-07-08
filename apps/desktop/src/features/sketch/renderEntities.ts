import type { EntityDragTarget, Vertex } from "../../stores/types";
import type { Entity, Project, ViewportState } from "../../types";
import { HANDLE_RADIUS } from "./constants";
import { chainContour, computeChainsMemo } from "./chains";

const CULL_MARGIN = 50;

function entityBounds(entity: Entity): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (entity.type === "circle" && entity.center && entity.radiusMm) {
    return {
      minX: entity.center.x - entity.radiusMm,
      minY: entity.center.y - entity.radiusMm,
      maxX: entity.center.x + entity.radiusMm,
      maxY: entity.center.y + entity.radiusMm,
    };
  }
  if (entity.points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of entity.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (entity.controlPoints) {
    for (const cp of entity.controlPoints) {
      const hx = cp.point.x + cp.handleOut.dx;
      const hy = cp.point.y + cp.handleOut.dy;
      if (cp.point.x < minX) minX = cp.point.x;
      if (cp.point.y < minY) minY = cp.point.y;
      if (cp.point.x > maxX) maxX = cp.point.x;
      if (cp.point.y > maxY) maxY = cp.point.y;
      if (hx < minX) minX = hx;
      if (hy < minY) minY = hy;
      if (hx > maxX) maxX = hx;
      if (hy > maxY) maxY = hy;
    }
  }
  return { minX, minY, maxX, maxY };
}

function isVisibleInViewport(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  canvas: HTMLCanvasElement,
  viewport: ViewportState,
): boolean {
  const worldLeft = (-viewport.offsetX - CULL_MARGIN) / viewport.zoom;
  const worldTop = (-viewport.offsetY - CULL_MARGIN) / viewport.zoom;
  const worldRight = (canvas.width - viewport.offsetX + CULL_MARGIN) / viewport.zoom;
  const worldBottom = (canvas.height - viewport.offsetY + CULL_MARGIN) / viewport.zoom;
  return !(
    bounds.maxX < worldLeft ||
    bounds.minX > worldRight ||
    bounds.maxY < worldTop ||
    bounds.minY > worldBottom
  );
}

function drawClosedChainFills(
  ctx: CanvasRenderingContext2D,
  project: Project,
): void {
  ctx.save();
  ctx.fillStyle = "rgba(79, 195, 247, 0.08)";
  for (const chain of computeChainsMemo(project)) {
    const contour = chainContour(chain, project);
    if (!contour || !contour.closed || contour.points.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(contour.points[0].x, contour.points[0].y);
    for (let i = 1; i < contour.points.length; i++) {
      ctx.lineTo(contour.points[i].x, contour.points[i].y);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawEntities(
  ctx: CanvasRenderingContext2D,
  project: Project | null,
  viewport: ViewportState,
  selectedEntityIds: string[],
  entityDragTarget: EntityDragTarget | null,
  selectedVertices: Vertex[] = [],
): void {
  if (!project) return;

  drawClosedChainFills(ctx, project);

  const highlightedSegment =
    entityDragTarget?.kind === "segment" ? entityDragTarget : null;
  const highlightedPoint =
    entityDragTarget?.kind === "point" ? entityDragTarget : null;
  const entityTarget =
    entityDragTarget?.kind === "entity" ? entityDragTarget : null;

  for (const entity of project.sketch.entities) {
    if (entity.points.length === 0 && entity.type !== "circle") continue;

    const bounds = entityBounds(entity);
    if (bounds && !isVisibleInViewport(bounds, ctx.canvas, viewport)) continue;

    const isSelected = selectedEntityIds.includes(entity.id);
    const isEntityMoveable =
      isSelected || (entityTarget?.entityId === entity.id);
    ctx.strokeStyle = isSelected ? "#4fc3f7" : "#ffffff";
    ctx.lineWidth = isSelected ? 3 / viewport.zoom : 2 / viewport.zoom;
    ctx.fillStyle = "rgba(79, 195, 247, 0.1)";

    drawEntityPath(ctx, entity);
    if (entity.closed) {
      ctx.fillStyle = "rgba(79, 195, 247, 0.08)";
      ctx.fill();
    }
    ctx.stroke();

    if (isSelected && entity.type === "spline" && entity.controlPoints) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 152, 0, 0.7)";
      ctx.fillStyle = "rgba(255, 152, 0, 0.9)";
      ctx.lineWidth = 1 / viewport.zoom;
      for (const cp of entity.controlPoints) {
        const endX = cp.point.x + cp.handleOut.dx;
        const endY = cp.point.y + cp.handleOut.dy;
        ctx.beginPath();
        ctx.moveTo(cp.point.x, cp.point.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(endX, endY, HANDLE_RADIUS / viewport.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (
      highlightedSegment &&
      highlightedSegment.entityId === entity.id
    ) {
      if (entity.type === "circle" && entity.center && entity.radiusMm) {
        ctx.save();
        ctx.strokeStyle = "#ff9800";
        ctx.lineWidth = 4 / viewport.zoom;
        drawEntityPath(ctx, entity);
        ctx.stroke();
        ctx.restore();
      } else {
        const i = highlightedSegment.segIdx;
        const a = entity.points[i];
        const b = entity.points[i + 1] ?? (entity.closed ? entity.points[0] : null);
        if (b) {
          ctx.save();
          ctx.strokeStyle = "#ff9800";
          ctx.lineWidth = 4 / viewport.zoom;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    if (entityTarget && entityTarget.entityId === entity.id) {
      ctx.save();
      ctx.strokeStyle = "#ff9800";
      ctx.lineWidth = 2.5 / viewport.zoom;
      ctx.setLineDash([8 / viewport.zoom, 4 / viewport.zoom]);
      drawEntityPath(ctx, entity);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    const displayPoints =
      entity.type === "circle" && entity.center
        ? [entity.center]
        : entity.type === "spline" && entity.controlPoints
        ? entity.controlPoints.map((cp) => cp.point)
        : entity.points;
    for (let i = 0; i < displayPoints.length; i++) {
      const pt = displayPoints[i];
      const isActivePoint =
        highlightedPoint &&
        highlightedPoint.entityId === entity.id &&
        highlightedPoint.pointIndex === i;
      const isSelectedVertex = selectedVertices.some(
        (v) => v.entityId === entity.id && v.pointIndex === i,
      );
      const radius =
        isActivePoint || isSelectedVertex
          ? (HANDLE_RADIUS + 2) / viewport.zoom
          : HANDLE_RADIUS / viewport.zoom;
      ctx.fillStyle = isActivePoint
        ? "#ff9800"
        : isSelectedVertex
          ? "#8bc34a"
          : isEntityMoveable
            ? "#4fc3f7"
            : "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
      if (isSelectedVertex) {
        ctx.save();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5 / viewport.zoom;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius + 1.5 / viewport.zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

function drawEntityPath(ctx: CanvasRenderingContext2D, entity: Entity): void {
  ctx.beginPath();
  if (entity.type === "circle" && entity.center && entity.radiusMm) {
    ctx.arc(entity.center.x, entity.center.y, entity.radiusMm, 0, Math.PI * 2);
    ctx.closePath();
    return;
  }
  ctx.moveTo(entity.points[0].x, entity.points[0].y);
  for (let i = 1; i < entity.points.length; i++) {
    ctx.lineTo(entity.points[i].x, entity.points[i].y);
  }
  if (entity.closed) ctx.closePath();
}
