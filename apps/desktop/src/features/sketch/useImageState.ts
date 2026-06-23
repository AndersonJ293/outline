import { useRef, useState } from "react";
import type { Point } from "../../types";
import type { RefScalePopupState } from "./tools/useImageRefScaleTool";

export interface ImageState {
  imageCache: { current: Map<string, HTMLImageElement> };
  isImageMoving: { current: boolean };
  imageMoveStartId: { current: string | null };
  imageMoveStartPos: { current: Point };
  isImageResizing: { current: boolean };
  imageResizeId: { current: string | null };
  imageResizeStart: { current: Point };
  imageResizeOrigSize: { current: { w: number; h: number } };
  imageResizeHandleType: { current: string };
  imageMovePushUndoDone: { current: boolean };
  imageResizePushUndoDone: { current: boolean };
  imageRefLineStart: { current: Point | null };
  imageRefLineEnd: { current: Point | null };
  imageRefScaleImageId: { current: string | null };
  refScalePopup: RefScalePopupState | null;
  setRefScalePopup: React.Dispatch<React.SetStateAction<RefScalePopupState | null>>;
  refScaleInputRef: React.RefObject<HTMLInputElement>;
}

export function useImageState(): ImageState {
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const isImageMoving = useRef(false);
  const imageMoveStartId = useRef<string | null>(null);
  const imageMoveStartPos = useRef<Point>({ x: 0, y: 0 });
  const isImageResizing = useRef(false);
  const imageResizeId = useRef<string | null>(null);
  const imageResizeStart = useRef<Point>({ x: 0, y: 0 });
  const imageResizeOrigSize = useRef({ w: 0, h: 0 });
  const imageResizeHandleType = useRef<string>("corner-br");
  const imageMovePushUndoDone = useRef(false);
  const imageResizePushUndoDone = useRef(false);
  const imageRefLineStart = useRef<Point | null>(null);
  const imageRefLineEnd = useRef<Point | null>(null);
  const imageRefScaleImageId = useRef<string | null>(null);
  const [refScalePopup, setRefScalePopup] = useState<RefScalePopupState | null>(null);
  const refScaleInputRef = useRef<HTMLInputElement>(null!);

  return {
    imageCache,
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
    imageRefLineStart,
    imageRefLineEnd,
    imageRefScaleImageId,
    refScalePopup,
    setRefScalePopup,
    refScaleInputRef,
  };
}
