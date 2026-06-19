import { useCallback, type MutableRefObject, type RefObject } from "react";
import type { Point, Project, SketchImage, ViewportState } from "../../../types";
import { pointDistance } from "../../../types";

export interface RefScalePopupState {
  imageId: string;
  lengthMm: number;
  screenX: number;
  screenY: number;
}

interface UseImageRefScaleToolArgs {
  containerRef: RefObject<HTMLDivElement>;
  project: Project | null;
  viewport: ViewportState;
  imageRefScaleMode: boolean;
  imageRefLineStart: MutableRefObject<Point | null>;
  imageRefLineEnd: MutableRefObject<Point | null>;
  imageRefScaleImageId: MutableRefObject<string | null>;
  refScalePopup: RefScalePopupState | null;
  setRefScalePopup: (popup: RefScalePopupState | null) => void;
  updateImage: (id: string, updates: Partial<SketchImage>) => void;
  setImageRefScaleMode: (active: boolean) => void;
  setStatus: (text: string) => void;
}

export function useImageRefScaleTool({
  containerRef,
  project,
  viewport,
  imageRefScaleMode,
  imageRefLineStart,
  imageRefLineEnd,
  imageRefScaleImageId,
  refScalePopup,
  setRefScalePopup,
  updateImage,
  setImageRefScaleMode,
  setStatus,
}: UseImageRefScaleToolArgs) {
  const startOrUpdateReferenceLine = useCallback((world: Point): boolean => {
    if (!imageRefScaleMode) return false;

    if (!imageRefLineStart.current) {
      imageRefLineStart.current = world;
      imageRefLineEnd.current = world;
    } else {
      imageRefLineEnd.current = world;
    }
    return true;
  }, [imageRefScaleMode, imageRefLineStart, imageRefLineEnd]);

  const updateReferenceLine = useCallback((world: Point): boolean => {
    if (!imageRefScaleMode || !imageRefLineStart.current) return false;
    imageRefLineEnd.current = world;
    return true;
  }, [imageRefScaleMode, imageRefLineStart, imageRefLineEnd]);

  const finishReferenceLine = useCallback((): boolean => {
    if (!imageRefScaleMode || !imageRefLineStart.current || !imageRefLineEnd.current) return false;

    const dist = pointDistance(imageRefLineStart.current, imageRefLineEnd.current);
    const screenDist = dist * viewport.zoom;
    if (screenDist < 5) {
      imageRefLineStart.current = null;
      imageRefLineEnd.current = null;
      return true;
    }

    if (containerRef.current) {
      const endScreen = imageRefLineEnd.current;
      setRefScalePopup({
        imageId: imageRefScaleImageId.current ?? "",
        lengthMm: dist,
        screenX: endScreen.x * viewport.zoom + viewport.offsetX,
        screenY: endScreen.y * viewport.zoom + viewport.offsetY,
      });
    }
    setStatus(`Reference line: ${dist.toFixed(2)} mm. Type the real size.`);
    return true;
  }, [
    containerRef,
    imageRefScaleMode,
    imageRefLineStart,
    imageRefLineEnd,
    imageRefScaleImageId,
    viewport,
    setRefScalePopup,
    setStatus,
  ]);

  const confirmRefScale = useCallback((realLengthMm: number) => {
    if (!refScalePopup) return;
    const image = project?.sketch.images?.find((item) => item.id === refScalePopup.imageId);
    if (image) {
      const scale = realLengthMm / refScalePopup.lengthMm;
      updateImage(image.id, {
        widthMm: image.widthMm * scale,
        heightMm: image.heightMm * scale,
      });
      setStatus(
        `Image scaled: reference ${refScalePopup.lengthMm.toFixed(2)} mm -> ${realLengthMm.toFixed(2)} mm`,
      );
    }
    setRefScalePopup(null);
    imageRefLineStart.current = null;
    imageRefLineEnd.current = null;
    setImageRefScaleMode(false);
  }, [
    project,
    refScalePopup,
    updateImage,
    setStatus,
    setRefScalePopup,
    imageRefLineStart,
    imageRefLineEnd,
    setImageRefScaleMode,
  ]);

  const cancelRefScale = useCallback((): boolean => {
    if (!refScalePopup) return false;
    setRefScalePopup(null);
    imageRefLineStart.current = null;
    imageRefLineEnd.current = null;
    setImageRefScaleMode(false);
    setStatus("Scale by reference cancelled");
    return true;
  }, [
    refScalePopup,
    setRefScalePopup,
    imageRefLineStart,
    imageRefLineEnd,
    setImageRefScaleMode,
    setStatus,
  ]);

  return {
    startOrUpdateReferenceLine,
    updateReferenceLine,
    finishReferenceLine,
    confirmRefScale,
    cancelRefScale,
  };
}
