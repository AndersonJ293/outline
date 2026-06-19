import type { EntityDragTarget } from "../../stores/types";
import type { Project, ViewportState } from "../../types";
import { HANDLE_RADIUS } from "./constants";

export function drawEntities(
  ctx: CanvasRenderingContext2D,
  project: Project | null,
  viewport: ViewportState,
  selectedEntityIds: string[],
  entityDragTarget: EntityDragTarget | null,
): void {
  if (!project) return;

  const highlightedSegment =
    entityDragTarget?.kind === "segment" ? entityDragTarget : null;
  const highlightedPoint =
    entityDragTarget?.kind === "point" ? entityDragTarget : null;
  const entityTarget =
    entityDragTarget?.kind === "entity" ? entityDragTarget : null;

  for (const entity of project.sketch.entities) {
    const isSelected = selectedEntityIds.includes(entity.id);
    const isEntityMoveable =
      isSelected || (entityTarget?.entityId === entity.id);
    ctx.strokeStyle = isSelected ? "#4fc3f7" : "#ffffff";
    ctx.lineWidth = isSelected ? 3 / viewport.zoom : 2 / viewport.zoom;
    ctx.fillStyle = "rgba(79, 195, 247, 0.1)";

    if (entity.points.length === 0) continue;

    ctx.beginPath();
    ctx.moveTo(entity.points[0].x, entity.points[0].y);
    for (let i = 1; i < entity.points.length; i++) {
      ctx.lineTo(entity.points[i].x, entity.points[i].y);
    }
    if (entity.closed) {
      ctx.closePath();
      ctx.fillStyle = "rgba(79, 195, 247, 0.08)";
      ctx.fill();
    }
    ctx.stroke();

    if (
      highlightedSegment &&
      highlightedSegment.entityId === entity.id
    ) {
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

    for (let i = 0; i < entity.points.length; i++) {
      const pt = entity.points[i];
      const isActivePoint =
        highlightedPoint &&
        highlightedPoint.entityId === entity.id &&
        highlightedPoint.pointIndex === i;
      const radius = isActivePoint
        ? (HANDLE_RADIUS + 2) / viewport.zoom
        : HANDLE_RADIUS / viewport.zoom;
      ctx.fillStyle = isActivePoint
        ? "#ff9800"
        : isEntityMoveable
          ? "#4fc3f7"
          : "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

