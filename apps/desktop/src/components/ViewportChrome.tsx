import type { Ref, RefObject } from "react";
import { DimensionPopup, type DimensionPopupState } from "../features/sketch/DimensionPopup";
import { OffsetPopup, type OffsetPopupState } from "../features/sketch/OffsetPopup";
import { RefScalePopup } from "../features/sketch/RefScalePopup";
import type { RefScalePopupState } from "../features/sketch/tools/useImageRefScaleTool";
import s from "./Canvas2D.module.css";

type ViewportChromeProps = {
  containerRef: Ref<HTMLDivElement>;
  threeContainerRef: Ref<HTMLDivElement>;
  staticCanvasRef: Ref<HTMLCanvasElement>;
  overlayCanvasRef: Ref<HTMLCanvasElement>;
  isSketching: boolean;
  refScalePopup: RefScalePopupState | null;
  refScaleInputRef: RefObject<HTMLInputElement>;
  confirmRefScale: (value: number) => void;
  dimPopup: DimensionPopupState | null;
  onConfirmDimension: (value: number) => void;
  onCancelDimension: () => void;
  offsetPopup: OffsetPopupState | null;
  onConfirmOffset: (value: number) => void;
  onCancelOffset: () => void;
  faceSelectionActive: boolean;
  onMouseDown?: (event: React.MouseEvent) => void;
  onMouseMove?: (event: React.MouseEvent) => void;
  onMouseUp?: (event: React.MouseEvent) => void;
  onWheel?: (event: React.WheelEvent) => void;
};

export function ViewportChrome({
  containerRef,
  threeContainerRef,
  staticCanvasRef,
  overlayCanvasRef,
  isSketching,
  refScalePopup,
  refScaleInputRef,
  confirmRefScale,
  dimPopup,
  onConfirmDimension,
  onCancelDimension,
  offsetPopup,
  onConfirmOffset,
  onCancelOffset,
  faceSelectionActive,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
}: ViewportChromeProps) {
  return (
    <div
      ref={containerRef}
      className={s.viewport}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div ref={threeContainerRef} style={{ position: "absolute", inset: 0 }} />
      <canvas
        ref={staticCanvasRef}
        className={s.static}
        style={{ pointerEvents: "none", display: isSketching ? "block" : "none" }}
      />
      <canvas
        ref={overlayCanvasRef}
        className={s.overlay}
        style={{
          pointerEvents: isSketching ? "auto" : "none",
          display: isSketching ? "block" : "none",
        }}
      />
      {refScalePopup && (
        <RefScalePopup
          popup={refScalePopup}
          inputRef={refScaleInputRef}
          onConfirm={confirmRefScale}
          onPointerDown={(event) => event.stopPropagation()}
        />
      )}
      {dimPopup && (
        <DimensionPopup
          popup={dimPopup}
          onConfirm={onConfirmDimension}
          onCancel={onCancelDimension}
        />
      )}
      {offsetPopup && (
        <OffsetPopup
          popup={offsetPopup}
          onConfirm={onConfirmOffset}
          onCancel={onCancelOffset}
        />
      )}
      {faceSelectionActive && <FaceSelectionHint />}
    </div>
  );
}

function FaceSelectionHint() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 40,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        padding: "8px 16px",
        borderRadius: 6,
        fontSize: 13,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      Click on a solid face to use as sketch plane
    </div>
  );
}
