import type { MutableRefObject, RefObject } from "react";
import type { Point, Project, ToolMode, ViewportState } from "../../types";
import type { EntityDragTarget, Vertex } from "../../stores/types";
import type { SplineDrawingState } from "./tools/useSplineTool";
import type { RefScalePopupState } from "./tools/useImageRefScaleTool";
import type { SnapGuide, SnapKind } from "./snapping";
import { useCanvasResize } from "./useCanvasResize";
import { useOverlayRenderer } from "./useOverlayRenderer";
import { useStaticRenderer } from "./useStaticRenderer";

type UseSketchCanvasRenderersArgs = {
  containerRef: RefObject<HTMLDivElement | null>;
  staticCanvasRef: RefObject<HTMLCanvasElement | null>;
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>;
  project: Project | null;
  viewport: ViewportState;
  toolMode: ToolMode;
  selectedEntityIds: string[];
  selectedVertices: Vertex[];
  editingImageId: string | null;
  entityDragTarget: EntityDragTarget | null;
  imageCache: MutableRefObject<Map<string, HTMLImageElement>>;
  isImageResizing: MutableRefObject<boolean>;
  imageResizeId: MutableRefObject<string | null>;
  isDrawing: MutableRefObject<boolean>;
  drawingPoints: MutableRefObject<Point[]>;
  closeToStart: MutableRefObject<boolean>;
  isSelectDragging: MutableRefObject<boolean>;
  selectDragStart: MutableRefObject<Point>;
  selectDragEnd: MutableRefObject<Point>;
  pendingRectangle: MutableRefObject<{ points: Point[]; confirmPoint: Point } | null>;
  splineState: MutableRefObject<SplineDrawingState | null>;
  cursorWorld: MutableRefObject<Point>;
  snapTarget: MutableRefObject<Point>;
  snapActive: MutableRefObject<boolean>;
  snapKind: MutableRefObject<SnapKind>;
  snapGuides: MutableRefObject<SnapGuide[]>;
  snapMarker: MutableRefObject<Point | null>;
  drawLengthInput: MutableRefObject<string>;
  imageRefLineStart: MutableRefObject<Point | null>;
  imageRefLineEnd: MutableRefObject<Point | null>;
  refScalePopup: RefScalePopupState | null;
  snapToGridEnabled: boolean;
  activeDimId?: string | null;
};

export function useSketchCanvasRenderers(args: UseSketchCanvasRenderersArgs) {
  const { requestRender: requestStaticRender } = useStaticRenderer({
    canvasRef: args.staticCanvasRef,
    project: args.project,
    viewport: args.viewport,
    selectedEntityIds: args.selectedEntityIds,
    selectedVertices: args.selectedVertices,
    editingImageId: args.editingImageId,
    entityDragTarget: args.entityDragTarget,
    imageCache: args.imageCache,
    isImageResizing: args.isImageResizing,
    imageResizeId: args.imageResizeId,
    activeDimId: args.activeDimId,
  });

  useCanvasResize(
    args.containerRef,
    [args.staticCanvasRef, args.overlayCanvasRef],
    requestStaticRender,
  );

  const { requestRender } = useOverlayRenderer({
    canvasRef: args.overlayCanvasRef,
    viewport: args.viewport,
    toolMode: args.toolMode,
    isDrawing: args.isDrawing,
    drawingPoints: args.drawingPoints,
    closeToStart: args.closeToStart,
    isSelectDragging: args.isSelectDragging,
    selectDragStart: args.selectDragStart,
    selectDragEnd: args.selectDragEnd,
    pendingRectangle: args.pendingRectangle,
    splineState: args.splineState,
    cursorWorld: args.cursorWorld,
    snapTarget: args.snapTarget,
    snapActive: args.snapActive,
    snapKind: args.snapKind,
    snapGuides: args.snapGuides,
    snapMarker: args.snapMarker,
    drawLengthInput: args.drawLengthInput,
    imageRefLineStart: args.imageRefLineStart,
    imageRefLineEnd: args.imageRefLineEnd,
    refScalePopup: args.refScalePopup,
    snapToGridEnabled: args.snapToGridEnabled,
  });

  return { requestRender };
}
