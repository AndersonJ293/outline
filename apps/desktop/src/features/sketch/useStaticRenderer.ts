import { useEffect, useRef, useCallback, type RefObject, type MutableRefObject } from "react";
import type { Project, ViewportState } from "../../types";
import type { EntityDragTarget, Vertex } from "../../stores/types";
import { renderStatic } from "./renderStatic";

interface UseStaticRendererArgs {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  project: Project | null;
  viewport: ViewportState;
  selectedEntityIds: string[];
  selectedVertices: Vertex[];
  editingImageId: string | null;
  entityDragTarget: EntityDragTarget | null;
  imageCache: MutableRefObject<Map<string, HTMLImageElement>>;
  isImageResizing: MutableRefObject<boolean>;
  imageResizeId: MutableRefObject<string | null>;
  activeDimId?: string | null;
}

export function useStaticRenderer(args: UseStaticRendererArgs): { requestRender: () => void } {
  const {
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
    activeDimId,
  } = args;

  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const scheduledRef = useRef(false);
  const dirtyRef = useRef(true);

  const doRender = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
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
      activeDimId,
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
    activeDimId,
  ]);

  const requestRender = useCallback(() => {
    dirtyRef.current = true;
    if (scheduledRef.current) return;
    scheduledRef.current = true;
    requestAnimationFrame(() => {
      scheduledRef.current = false;
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      doRender();
    });
  }, [doRender]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext("2d");
    }
  }, [canvasRef]);

  useEffect(() => {
    requestRender();
  }, [requestRender]);

  return { requestRender };
}
