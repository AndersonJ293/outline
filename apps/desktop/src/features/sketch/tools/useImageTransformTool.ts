import { useCallback, type MutableRefObject } from "react";
import type { Point, Project, SketchImage, ViewportState } from "../../../types";
import { hitTestImage, hitTestImageHandle } from "../hitTest";

interface UseImageTransformToolArgs {
  project: Project | null;
  viewport: ViewportState;
  isImageMoving: MutableRefObject<boolean>;
  imageMoveStartId: MutableRefObject<string | null>;
  imageMoveStartPos: MutableRefObject<Point>;
  isImageResizing: MutableRefObject<boolean>;
  imageResizeId: MutableRefObject<string | null>;
  imageResizeStart: MutableRefObject<Point>;
  imageResizeOrigSize: MutableRefObject<{ w: number; h: number }>;
  imageResizeHandleType: MutableRefObject<string>;
  selectEntity: (id: string | null, shiftKey?: boolean) => void;
  updateImage: (id: string, updates: Partial<SketchImage>) => void;
}

export function useImageTransformTool({
  project,
  viewport,
  isImageMoving,
  imageMoveStartId,
  imageMoveStartPos,
  isImageResizing,
  imageResizeId,
  imageResizeStart,
  imageResizeOrigSize,
  imageResizeHandleType,
  selectEntity,
  updateImage,
}: UseImageTransformToolArgs) {
  const startImageTransform = useCallback((world: Point, shiftKey: boolean): boolean => {
    const imageId = hitTestImage(project?.sketch.images, world);
    if (!imageId || !project?.sketch.images) return false;

    const image = project.sketch.images.find((item) => item.id === imageId);
    if (!image) return false;

    const hitHandle = hitTestImageHandle(image, world, viewport);
    if (hitHandle) {
      isImageResizing.current = true;
      imageResizeId.current = imageId;
      imageResizeHandleType.current = hitHandle;
      imageResizeStart.current = world;
      imageResizeOrigSize.current = { w: image.widthMm, h: image.heightMm };
      selectEntity(imageId);
      return true;
    }

    isImageMoving.current = true;
    imageMoveStartId.current = imageId;
    imageMoveStartPos.current = world;
    if (!shiftKey) selectEntity(imageId);
    return true;
  }, [
    project,
    viewport,
    isImageMoving,
    imageMoveStartId,
    imageMoveStartPos,
    isImageResizing,
    imageResizeId,
    imageResizeStart,
    imageResizeOrigSize,
    imageResizeHandleType,
    selectEntity,
  ]);

  const updateImageTransform = useCallback((world: Point): boolean => {
    if (isImageMoving.current && imageMoveStartId.current) {
      const dx = world.x - imageMoveStartPos.current.x;
      const dy = world.y - imageMoveStartPos.current.y;
      const image = project?.sketch.images?.find((item) => item.id === imageMoveStartId.current);
      if (image) {
        updateImage(image.id, { x: image.x + dx, y: image.y + dy });
      }
      imageMoveStartPos.current = world;
      return true;
    }

    if (isImageResizing.current && imageResizeId.current) {
      const image = project?.sketch.images?.find((item) => item.id === imageResizeId.current);
      if (image) {
        updateImage(image.id, computeImageResize(world, imageResizeStart.current, imageResizeOrigSize.current, imageResizeHandleType.current));
      }
      return true;
    }

    return false;
  }, [
    project,
    updateImage,
    isImageMoving,
    imageMoveStartId,
    imageMoveStartPos,
    isImageResizing,
    imageResizeId,
    imageResizeStart,
    imageResizeOrigSize,
    imageResizeHandleType,
  ]);

  const finishImageTransform = useCallback((): boolean => {
    if (isImageMoving.current) {
      isImageMoving.current = false;
      imageMoveStartId.current = null;
      return true;
    }

    if (isImageResizing.current) {
      isImageResizing.current = false;
      imageResizeId.current = null;
      return true;
    }

    return false;
  }, [isImageMoving, imageMoveStartId, isImageResizing, imageResizeId]);

  return { startImageTransform, updateImageTransform, finishImageTransform };
}

function computeImageResize(
  world: Point,
  start: Point,
  origSize: { w: number; h: number },
  handleType: string,
): Partial<SketchImage> {
  const dx = world.x - start.x;
  const dy = world.y - start.y;
  let newW = origSize.w;
  let newH = origSize.h;

  if (handleType.startsWith("corner")) {
    const xDir = handleType.includes("r") ? 1 : -1;
    const yDir = handleType.includes("b") ? 1 : -1;
    const d = Math.max(Math.abs(dx * xDir), Math.abs(dy * yDir)) * Math.sign(dx * xDir || dy * yDir);
    newW = Math.max(5, origSize.w + d);
    newH = newW * (origSize.h / origSize.w);
  } else if (handleType === "edge-r" || handleType === "edge-l") {
    const dir = handleType === "edge-r" ? 1 : -1;
    newW = Math.max(5, origSize.w + dx * dir);
  } else {
    const dir = handleType === "edge-b" ? 1 : -1;
    newH = Math.max(5, origSize.h + dy * dir);
  }

  return { widthMm: newW, heightMm: newH };
}
