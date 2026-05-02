import type { Project, ViewportState } from "../../types";
import { HANDLE_RADIUS } from "./constants";

export function drawEntities(
  ctx: CanvasRenderingContext2D,
  project: Project | null,
  viewport: ViewportState,
  selectedEntityIds: string[],
): void {
  if (!project) return;

  for (const entity of project.sketch.entities) {
    const isSelected = selectedEntityIds.includes(entity.id);
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

    for (const pt of entity.points) {
      ctx.fillStyle = isSelected ? "#4fc3f7" : "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, HANDLE_RADIUS / viewport.zoom, 0, Math.PI * 2);
      ctx.fill();
    }

    if (entity.closed) {
      const first = entity.points[0];
      ctx.fillStyle = "#4caf50";
      ctx.beginPath();
      ctx.arc(first.x, first.y, (HANDLE_RADIUS + 2) / viewport.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
