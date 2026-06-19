import type { MutableRefObject } from "react";
import type { Point, Project, ViewportState } from "../../types";

export function drawImages(
  ctx: CanvasRenderingContext2D,
  project: Project | null,
  viewport: ViewportState,
  editingImageId: string | null,
  imageCache: MutableRefObject<Map<string, HTMLImageElement>>,
  isImageResizing: MutableRefObject<boolean>,
  imageResizeId: MutableRefObject<string | null>,
): void {
  if (!project?.sketch.images) return;

  for (const img of project.sketch.images) {
    const cache = imageCache.current;
    if (!cache.has(img.source)) {
      const el = new window.Image();
      el.src = img.source;
      el.onload = () => {
        cache.set(img.source, el);
      };
      cache.set(img.source, el);
    }

    const el = cache.get(img.source);
    if (!el || !el.complete || el.naturalWidth === 0) continue;

    const isEditable = editingImageId === img.id;
    const hw = img.widthMm / 2;
    const hh = img.heightMm / 2;

    ctx.save();
    ctx.globalAlpha = img.opacity;
    ctx.translate(img.x, img.y);
    ctx.scale(img.mirrorX ? -1 : 1, img.mirrorY ? -1 : 1);
    ctx.rotate((img.rotation * Math.PI) / 180);
    ctx.drawImage(el, -hw, -hh, img.widthMm, img.heightMm);
    ctx.restore();

    if (!isEditable) continue;

    ctx.save();
    ctx.translate(img.x, img.y);
    ctx.strokeStyle = "#4fc3f7";
    ctx.lineWidth = 2 / viewport.zoom;
    ctx.setLineDash([4 / viewport.zoom, 3 / viewport.zoom]);
    ctx.strokeRect(-hw, -hh, img.widthMm, img.heightMm);
    ctx.setLineDash([]);

    const handleSz = 6 / viewport.zoom;
    const allHandles: Point[] = [
      { x: -hw, y: -hh },
      { x: 0, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: 0 },
      { x: hw, y: hh },
      { x: 0, y: hh },
      { x: -hw, y: hh },
      { x: -hw, y: 0 },
    ];

    for (const handle of allHandles) {
      const isCorner = Math.abs(handle.x) === hw && Math.abs(handle.y) === hh;
      ctx.fillStyle = isCorner ? "#4fc3f7" : "#ff9800";
      const sz = isCorner ? handleSz : handleSz * 0.7;
      ctx.fillRect(handle.x - sz / 2, handle.y - sz / 2, sz, sz);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 0.5 / viewport.zoom;
      ctx.strokeRect(handle.x - sz / 2, handle.y - sz / 2, sz, sz);
    }

    if (isImageResizing.current && imageResizeId.current === img.id) {
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.font = `bold ${12 / viewport.zoom}px monospace`;
      ctx.fillText(
        `${img.widthMm.toFixed(1)} x ${img.heightMm.toFixed(1)} mm`,
        0,
        -hh - 8 / viewport.zoom,
      );
    }

    ctx.restore();
  }
}
