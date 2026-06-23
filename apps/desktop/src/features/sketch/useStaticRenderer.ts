import { useEffect, useRef, type RefObject, type MutableRefObject } from "react";
import type { Project, ViewportState } from "../../types";
import type { EntityDragTarget, Vertex } from "../../stores/types";
import { renderStatic } from "./renderStatic";

interface UseStaticRendererArgs {
  canvasRef: RefObject<HTMLCanvasElement>;
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

export function useStaticRenderer({
  canvasRef,
  project,
  viewport,
  selectedEntityIds,
  selectedVertices,
  editingImageId,
  entityDragTarget,
  imageCache,
  isImageResizing,
  imageResizeId,
}: UseStaticRendererArgs): void {
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext("2d");
    }
  }, [canvasRef]);

  useEffect(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    renderStatic({
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
    });
  }, [
    canvasRef,
    project,
    viewport,
    selectedEntityIds,
    selectedVertices,
    editingImageId,
    entityDragTarget,
    imageCache,
    isImageResizing,
    imageResizeId,
  ]);
}
