import { type MutableRefObject } from "react";
import type { Project, ViewportState } from "../../types";
import type { EntityDragTarget, Vertex } from "../../stores/types";
import { drawEntities } from "./renderEntities";
import { drawGrid, drawGridLabel } from "./renderGrid";
import { drawImages } from "./renderImages";
import { drawDimensions } from "./renderDimensions";

export interface RenderStaticArgs {
  ctx: CanvasRenderingContext2D;
  project: Project | null;
  viewport: ViewportState;
  selectedEntityIds: string[];
  selectedVertices: Vertex[];
  editingImageId: string | null;
  entityDragTarget: EntityDragTarget | null;
  imageCache: MutableRefObject<Map<string, HTMLImageElement>>;
  isImageResizing: MutableRefObject<boolean>;
  imageResizeId: MutableRefObject<string | null>;
}

export function renderStatic({
  ctx,
  project,
  viewport,
  selectedEntityIds,
  selectedVertices,
  editingImageId,
  entityDragTarget,
  imageCache,
  isImageResizing,
  imageResizeId,
}: RenderStaticArgs): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  ctx.translate(viewport.offsetX, viewport.offsetY);
  ctx.scale(viewport.zoom, viewport.zoom);

  drawGrid(ctx, ctx.canvas, viewport);
  drawImages(ctx, project, viewport, editingImageId, imageCache, isImageResizing, imageResizeId);
  drawEntities(ctx, project, viewport, selectedEntityIds, entityDragTarget, selectedVertices);
  drawDimensions(ctx, project, viewport);
  drawGridLabel(ctx, viewport);

  ctx.restore();
}
