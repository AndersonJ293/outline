import type { ViewportState } from "../../types";
import { GRID_SIZE } from "./constants";

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  viewport: ViewportState,
): void {
  const viewWidth = canvas.width / viewport.zoom;
  const viewHeight = canvas.height / viewport.zoom;
  const originX = -viewport.offsetX / viewport.zoom;
  const originY = -viewport.offsetY / viewport.zoom;

  const startX = Math.floor(originX / GRID_SIZE) * GRID_SIZE;
  const startY = Math.floor(originY / GRID_SIZE) * GRID_SIZE;

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1 / viewport.zoom;

  for (let x = startX; x < originX + viewWidth; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, originY);
    ctx.lineTo(x, originY + viewHeight);
    ctx.stroke();
  }

  for (let y = startY; y < originY + viewHeight; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(originX, y);
    ctx.lineTo(originX + viewWidth, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,100,100,0.5)";
  ctx.lineWidth = 2 / viewport.zoom;
  ctx.beginPath();
  ctx.moveTo(originX, 0);
  ctx.lineTo(originX + viewWidth, 0);
  ctx.stroke();

  ctx.strokeStyle = "rgba(100,255,100,0.5)";
  ctx.beginPath();
  ctx.moveTo(0, originY);
  ctx.lineTo(0, originY + viewHeight);
  ctx.stroke();
}

export function drawGridLabel(ctx: CanvasRenderingContext2D, viewport: ViewportState): void {
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = `${12 / viewport.zoom}px monospace`;
  ctx.fillText(`Grid: ${GRID_SIZE} mm`, 8 / viewport.zoom, 16 / viewport.zoom);
}
