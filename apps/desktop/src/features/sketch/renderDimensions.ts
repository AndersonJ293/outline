import type { Project, ViewportState } from "../../types";
import { dimensionLayout } from "./dimensions";

const COLOR = "#4fc3f7";

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
    for (const p of [da, db]) {
      ctx.beginPath();
      ctx.moveTo(p.x - ux * tick - uy * tick, p.y - uy * tick + ux * tick);
      ctx.lineTo(p.x + ux * tick + uy * tick, p.y + uy * tick - ux * tick);
      ctx.stroke();
    }

    // Label.
    const text = `${dim.value.toFixed(1)} mm`;
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

  ctx.restore();
}
