import type { Point, Project, ViewportState } from "../../types";
import { dimensionLayout, offsetDimensionLayout } from "./dimensions";

const COLOR = "#4fc3f7";

function drawLabel(ctx: CanvasRenderingContext2D, text: string, mid: Point, z: number): void {
  ctx.font = `bold ${12 / z}px monospace`;
  const metrics = ctx.measureText(text);
  const padX = 4 / z;
  const padY = 3 / z;
  const w = metrics.width + padX * 2;
  const h = 14 / z;
  ctx.save();
  ctx.fillStyle = "rgba(20,20,24,0.85)";
  ctx.fillRect(mid.x - w / 2, mid.y - h / 2, w, h);
  ctx.fillStyle = COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, mid.x, mid.y + padY / 2);
  ctx.restore();
}

function drawArrowTick(
  ctx: CanvasRenderingContext2D,
  p: Point,
  ux: number,
  uy: number,
  tick: number,
): void {
  ctx.beginPath();
  ctx.moveTo(p.x - ux * tick - uy * tick, p.y - uy * tick + ux * tick);
  ctx.lineTo(p.x + ux * tick + uy * tick, p.y + uy * tick - ux * tick);
  ctx.stroke();
}

/// Draw all linear dimensions of the sketch: extension lines from the
/// segment to the offset dimension line, arrow ticks, and the value label.
export function drawDimensions(
  ctx: CanvasRenderingContext2D,
  project: Project | null,
  viewport: ViewportState,
): void {
  const dims = project?.sketch.dimensions;
  if (!dims || dims.length === 0) return;
  const entities = project!.sketch.entities;
  const z = viewport.zoom;

  ctx.save();
  ctx.strokeStyle = COLOR;
  ctx.fillStyle = COLOR;
  ctx.lineWidth = 1 / z;

  for (const dim of dims) {
    if (dim.kind === "linear") {
      const entity = entities.find((e) => e.id === dim.entityId);
      if (!entity) continue;
      const layout = dimensionLayout(entity, dim);
      if (!layout) continue;
      const { a, b, da, db, mid } = layout;

      // Extension lines (segment endpoint → offset line).
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(da.x, da.y);
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(db.x, db.y);
      ctx.stroke();

      // Dimension line.
      ctx.beginPath();
      ctx.moveTo(da.x, da.y);
      ctx.lineTo(db.x, db.y);
      ctx.stroke();

      // Arrow ticks at each end (45° slashes).
      const tick = 4 / z;
      const len = layout.length;
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      drawArrowTick(ctx, da, ux, uy, tick);
      drawArrowTick(ctx, db, ux, uy, tick);

      drawLabel(ctx, `${dim.value.toFixed(1)} mm`, mid, z);
    } else {
      const source = entities.find((e) => e.id === dim.entityId);
      const offsetEntity = entities.find((e) => e.id === dim.offsetEntityId);
      if (!source || !offsetEntity) continue;
      const layout = offsetDimensionLayout(source, offsetEntity);
      if (!layout) continue;
      const { a, b, mid } = layout;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1e-6) continue;
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;

      ctx.save();
      ctx.setLineDash([4 / z, 3 / z]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();

      const tick = 4 / z;
      drawArrowTick(ctx, a, ux, uy, tick);
      drawArrowTick(ctx, b, ux, uy, tick);

      drawLabel(ctx, `${dim.value.toFixed(1)} mm`, mid, z);
    }
  }

  ctx.restore();
}
