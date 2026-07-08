import { useCallback, type MutableRefObject } from "react";
import type { Point, Project, SketchImage, ViewportState } from "../../../types";
import { hitTestImage, hitTestImageHandle } from "../hitTest";

export type ImageTransformStartResult = "started" | "locked" | null;

interface UseImageTransformToolArgs {
  project: Project | null;
  viewport: ViewportState;
  editingImageId: string | null;
  isImageMoving: MutableRefObject<boolean>;
  imageMoveStartId: MutableRefObject<string | null>;
  imageMoveStartPos: MutableRefObject<Point>;
  isImageResizing: MutableRefObject<boolean>;
  imageResizeId: MutableRefObject<string | null>;
  imageResizeStart: MutableRefObject<Point>;
  imageResizeOrigSize: MutableRefObject<{ w: number; h: number }>;
  imageResizeHandleType: MutableRefObject<string>;
  imageMovePushUndoDone: MutableRefObject<boolean>;
  imageResizePushUndoDone: MutableRefObject<boolean>;
  selectEntity: (id: string | null, shiftKey?: boolean) => void;
  updateImage: (id: string, updates: Partial<SketchImage>) => void;
  pushUndo: () => void;
}

export function useImageTransformTool({
  project,
  viewport,
  editingImageId,
  isImageMoving,
  imageMoveStartId,
  imageMoveStartPos,
  isImageResizing,
  imageResizeId,
  imageResizeStart,
  imageResizeOrigSize,
  imageResizeHandleType,
  imageMovePushUndoDone,
  imageResizePushUndoDone,
  selectEntity,
  updateImage,
  pushUndo,
}: UseImageTransformToolArgs) {
  const startImageTransform = useCallback(
    (world: Point, shiftKey: boolean): ImageTransformStartResult => {
      if (!project?.sketch.images) return null;
      const editableImage = editingImageId
        ? project.sketch.images.find((item) => item.id === editingImageId)
        : null;
      const hitEditableHandle = editableImage
        ? hitTestImageHandle(editableImage, world, viewport)
        : null;

      if (editableImage && hitEditableHandle) {
        isImageResizing.current = true;
        imageResizeId.current = editableImage.id;
        imageResizeHandleType.current = hitEditableHandle;
        imageResizeStart.current = world;
        imageResizeOrigSize.current = {
          w: editableImage.widthMm,
          h: editableImage.heightMm,
        };
        imageResizePushUndoDone.current = false;
        selectEntity(editableImage.id);
        return "started";
      }

      const imageId = hitTestImage(project.sketch.images, world);
      if (!imageId) return null;
      if (imageId !== editingImageId) return "locked";

      const image = project.sketch.images.find((item) => item.id === imageId);
      if (!image) return null;

      isImageMoving.current = true;
      imageMoveStartId.current = imageId;
      imageMoveStartPos.current = world;
      imageMovePushUndoDone.current = false;
      if (!shiftKey) selectEntity(imageId);
      return "started";
    },
    [
      project,
      viewport,
      editingImageId,
      isImageMoving,
      imageMoveStartId,
      imageMoveStartPos,
      isImageResizing,
      imageResizeId,
      imageResizeStart,
      imageResizeOrigSize,
      imageResizeHandleType,
      imageMovePushUndoDone,
      imageResizePushUndoDone,
      selectEntity,
    ],
  );

  const updateImageTransform = useCallback(
    (world: Point): boolean => {
      if (isImageMoving.current && imageMoveStartId.current) {
        const dx = world.x - imageMoveStartPos.current.x;
        const dy = world.y - imageMoveStartPos.current.y;
        if (dx !== 0 || dy !== 0) {
          const image = project?.sketch.images?.find(
            (item) => item.id === imageMoveStartId.current,
          );
          if (image) {
            if (!imageMovePushUndoDone.current) {
              pushUndo();
              imageMovePushUndoDone.current = true;
            }
            updateImage(image.id, { x: image.x + dx, y: image.y + dy });
          }
          imageMoveStartPos.current = world;
        }
        return true;
      }

      if (isImageResizing.current && imageResizeId.current) {
        const dx = world.x - imageResizeStart.current.x;
        const dy = world.y - imageResizeStart.current.y;
        if (dx !== 0 || dy !== 0) {
          const image = project?.sketch.images?.find(
            (item) => item.id === imageResizeId.current,
          );
          if (image) {
            if (!imageResizePushUndoDone.current) {
              pushUndo();
              imageResizePushUndoDone.current = true;
            }
            updateImage(
              image.id,
              computeImageResize(
                world,
                imageResizeStart.current,
                imageResizeOrigSize.current,
                imageResizeHandleType.current,
              ),
            );
          }
        }
        return true;
      }

      return false;
    },
    [
      project,
      updateImage,
      pushUndo,
      isImageMoving,
      imageMoveStartId,
      imageMoveStartPos,
      isImageResizing,
      imageResizeId,
      imageResizeStart,
      imageResizeOrigSize,
      imageResizeHandleType,
      imageMovePushUndoDone,
      imageResizePushUndoDone,
    ],
  );

  const finishImageTransform = useCallback((): boolean => {
    if (isImageMoving.current) {
      isImageMoving.current = false;
      imageMoveStartId.current = null;
      imageMovePushUndoDone.current = false;
      return true;
    }

    if (isImageResizing.current) {
      isImageResizing.current = false;
      imageResizeId.current = null;
      imageResizePushUndoDone.current = false;
      return true;
    }

    return false;
  }, [
    isImageMoving,
    imageMoveStartId,
    imageMovePushUndoDone,
    isImageResizing,
    imageResizeId,
    imageResizePushUndoDone,
  ]);

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
