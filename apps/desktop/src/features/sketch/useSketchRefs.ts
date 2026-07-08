import { useRef } from "react";
import type { Point } from "../../types";
import type { MovePlan } from "./tools/useMoveTool";
import type { SplineDrawingState } from "./tools/useSplineTool";
import type { SnapGuide, SnapKind } from "./snapping";

export interface SketchRefs {
  drawingPoints: { current: Point[] };
  isDrawing: { current: boolean };
  isPanning: { current: boolean };
  panStart: { current: { x: number; y: number } };
  closeToStart: { current: boolean };
  pendingRectangle: { current: { points: Point[]; confirmPoint: Point } | null };
  isSelectDragging: { current: boolean };
  selectDragStart: { current: Point };
  selectDragEnd: { current: Point };
  isEntityDragging: { current: boolean };
  entityDragMode: { current: "point" | "segment" | "entity" | null };
  entityDragEntityId: { current: string | null };
  entityDragPointIndex: { current: number | null };
  entityDragSegIdx: { current: number | null };
  entityDragStart: { current: Point };
  entityPushUndoDone: { current: boolean };
  lastClickTime: { current: number };
  lastClickKey: { current: string };
  splineState: { current: SplineDrawingState | null };
  isHandleDragging: { current: boolean };
  handleDragEntityId: { current: string | null };
  handleDragAnchorIndex: { current: number | null };
  handleDragStart: { current: Point };
  handlePushUndoDone: { current: boolean };
  altKeyPressed: { current: boolean };
  cursorWorld: { current: Point };
  snapTarget: { current: Point };
  snapActive: { current: boolean };
  snapKind: { current: SnapKind };
  snapGuides: { current: SnapGuide[] };
  snapMarker: { current: Point | null };
  /// Live numeric length the user is typing while drawing a segment.
  drawLengthInput: { current: string };
  isMoving: { current: boolean };
  movePlan: { current: MovePlan | null };
  moveStart: { current: Point };
  movePushUndoDone: { current: boolean };
  isPasteFloating: { current: boolean };
  pasteIds: { current: string[] };
  pasteLast: { current: Point };
  isDraggingDim: { current: boolean };
  dragDimId: { current: string | null };
  dimPushUndoDone: { current: boolean };
  dimLastClickTime: { current: number };
  dimLastClickId: { current: string };
}

export function useSketchRefs(): SketchRefs {
  return {
    drawingPoints: useRef<Point[]>([]),
    isDrawing: useRef(false),
    isPanning: useRef(false),
    panStart: useRef({ x: 0, y: 0 }),
    closeToStart: useRef(false),
    pendingRectangle: useRef<{ points: Point[]; confirmPoint: Point } | null>(null),
    isSelectDragging: useRef(false),
    selectDragStart: useRef<Point>({ x: 0, y: 0 }),
    selectDragEnd: useRef<Point>({ x: 0, y: 0 }),
    isEntityDragging: useRef(false),
    entityDragMode: useRef<"point" | "segment" | "entity" | null>(null),
    entityDragEntityId: useRef<string | null>(null),
    entityDragPointIndex: useRef<number | null>(null),
    entityDragSegIdx: useRef<number | null>(null),
    entityDragStart: useRef<Point>({ x: 0, y: 0 }),
    entityPushUndoDone: useRef(false),
    lastClickTime: useRef(0),
    lastClickKey: useRef(""),
    splineState: useRef<SplineDrawingState | null>(null),
    isHandleDragging: useRef(false),
    handleDragEntityId: useRef<string | null>(null),
    handleDragAnchorIndex: useRef<number | null>(null),
    handleDragStart: useRef<Point>({ x: 0, y: 0 }),
    handlePushUndoDone: useRef(false),
    altKeyPressed: useRef(false),
    cursorWorld: useRef<Point>({ x: 0, y: 0 }),
    snapTarget: useRef<Point>({ x: 0, y: 0 }),
    snapActive: useRef(false),
    snapKind: useRef<SnapKind>("none"),
    snapGuides: useRef<SnapGuide[]>([]),
    snapMarker: useRef<Point | null>(null),
    drawLengthInput: useRef<string>(""),
    isMoving: useRef(false),
    movePlan: useRef<MovePlan | null>(null),
    moveStart: useRef<Point>({ x: 0, y: 0 }),
    movePushUndoDone: useRef(false),
    isPasteFloating: useRef(false),
    pasteIds: useRef<string[]>([]),
    pasteLast: useRef<Point>({ x: 0, y: 0 }),
    isDraggingDim: useRef(false),
    dragDimId: useRef<string | null>(null),
    dimPushUndoDone: useRef(false),
    dimLastClickTime: useRef(0),
    dimLastClickId: useRef(""),
  };
}
