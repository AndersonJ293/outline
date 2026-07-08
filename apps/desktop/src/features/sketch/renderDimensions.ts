import type { Point, Project, ViewportState } from "../../types";
import { diameterDimensionLayout, dimensionLayout, offsetDimensionLayout } from "./dimensions";

const COLOR = "#4fc3f7";
const ACTIVE_COLOR = "#ff9800";

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  mid: Point,
  z: number,
  color: string,
): void {
  ctx.font = `bold ${12 / z}px monospace`;
  const metrics = ctx.measureText(text);
  const padX = 4 / z;
  const padY = 3 / z;
  const w = metrics.width + padX * 2;
  const h = 14 / z;
  ctx.save();
  ctx.fillStyle = "rgba(20,20,24,0.85)";
  ctx.fillRect(mid.x - w / 2, mid.y - h / 2, w, h);
  ctx.fillStyle = color;
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

/// Draw all dimensions of the sketch (linear segment lengths and offset
/// annotations). `activeDimId` — the dimension currently open in an edit
/// popup, if any — is drawn highlighted so it's unambiguous which
/// annotation the popup is about to change.
export function drawDimensions(
  ctx: CanvasRenderingContext2D,
  project: Project | null,
  viewport: ViewportState,
  activeDimId: string | null = null,
): void {
  const dims = project?.sketch.dimensions;
  if (!dims || dims.length === 0) return;
  const entities = project!.sketch.entities;
  const z = viewport.zoom;

  for (const dim of dims) {
    const isActive = dim.id === activeDimId;
    const color = isActive ? ACTIVE_COLOR : COLOR;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = (isActive ? 2 : 1) / z;

    if (dim.kind === "linear") {
      const entity = entities.find((e) => e.id === dim.entityId);
      if (!entity) {
        ctx.restore();
        continue;
      }
      const layout = dimensionLayout(entity, dim);
      if (!layout) {
        ctx.restore();
        continue;
      }
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

      drawLabel(ctx, `${dim.value.toFixed(1)} mm`, mid, z, color);
    } else if (dim.kind === "diameter") {
      const entity = entities.find((e) => e.id === dim.entityId);
      if (!entity) {
        ctx.restore();
        continue;
      }
      const layout = diameterDimensionLayout(entity, dim);
      if (!layout) {
        ctx.restore();
        continue;
      }
      const { a, b, center } = layout;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1e-6) {
        ctx.restore();
        continue;
      }
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      // Line extends a bit past the far edge so the label sits outside the
      // circle, Fusion-style.
      const leader = 18 / z;
      const labelAnchor = { x: b.x + ux * leader, y: b.y + uy * leader };

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(labelAnchor.x, labelAnchor.y);
      ctx.stroke();

      const dotR = 2.5 / z;
      ctx.beginPath();
      ctx.arc(a.x, a.y, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x, b.y, dotR, 0, Math.PI * 2);
      ctx.fill();
      // Hollow marker at the center, matching the connected/free vertex style.
      ctx.beginPath();
      ctx.arc(center.x, center.y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(20,20,24,0.85)";
      ctx.fill();
      ctx.stroke();

      drawLabel(ctx, `Ø${dim.value.toFixed(1)} mm`, labelAnchor, z, color);
    } else if (dim.kind === "offset") {
      const source = entities.find((e) => e.id === dim.entityId);
      const offsetEntity = entities.find((e) => e.id === dim.offsetEntityId);
      if (!source || !offsetEntity) {
        ctx.restore();
        continue;
      }
      const layout = offsetDimensionLayout(source, offsetEntity);
      if (!layout) {
        ctx.restore();
        continue;
      }
      const { a, b, mid } = layout;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1e-6) {
        ctx.restore();
        continue;
      }
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;

      ctx.setLineDash([4 / z, 3 / z]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const tick = 4 / z;
      drawArrowTick(ctx, a, ux, uy, tick);
      drawArrowTick(ctx, b, ux, uy, tick);

      drawLabel(ctx, `${dim.value.toFixed(1)} mm`, mid, z, color);
    }

    ctx.restore();
  }
}
