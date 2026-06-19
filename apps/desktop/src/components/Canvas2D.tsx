import { useRef, useEffect, useCallback, useState } from "react";
import { useStore } from "../stores/useStore";
import type { Point } from "../types";
import {
  screenToWorld as toWorld,
  snapToGrid,
  getSnapStep,
} from "../features/sketch/geometry";
import { RefScalePopup } from "../features/sketch/RefScalePopup";
import type { RefScalePopupState } from "../features/sketch/tools/useImageRefScaleTool";
import { useImageRefScaleTool } from "../features/sketch/tools/useImageRefScaleTool";
import { useImageTransformTool } from "../features/sketch/tools/useImageTransformTool";
import { usePanTool } from "../features/sketch/tools/usePanTool";
import { usePolylineTool } from "../features/sketch/tools/usePolylineTool";
import { useRectangleTool } from "../features/sketch/tools/useRectangleTool";
import { useSelectionTool } from "../features/sketch/tools/useSelectionTool";
import { useSketchRenderer } from "../features/sketch/useSketchRenderer";
import s from "./Canvas2D.module.css";

export default function Canvas2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const drawingPoints = useRef<Point[]>([]);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const closeToStart = useRef(false);
  const pendingRectangle = useRef<{ points: Point[]; confirmPoint: Point } | null>(null);
  const isSelectDragging = useRef(false);
  const selectDragStart = useRef<Point>({ x: 0, y: 0 });
  const selectDragEnd = useRef<Point>({ x: 0, y: 0 });
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
  const refScaleInputRef = useRef<HTMLInputElement>(null);
  const altKeyPressed = useRef(false);
  const cursorWorld = useRef<Point>({ x: 0, y: 0 });
  const snapTarget = useRef<Point>({ x: 0, y: 0 });
  const snapActive = useRef(false);

  const project = useStore((s) => s.project);
  const toolMode = useStore((s) => s.toolMode);
  const setToolMode = useStore((s) => s.setToolMode);
  const viewport = useStore((s) => s.viewport);
  const setViewport = useStore((s) => s.setViewport);
  const selectedEntityIds = useStore((s) => s.selectedEntityIds);
  const selectEntity = useStore((s) => s.selectEntity);
  const setSelectedEntityIds = useStore((s) => s.setSelectedEntityIds);
  const addEntity = useStore((s) => s.addEntity);
  const updateImage = useStore((s) => s.updateImage);
  const setStatus = useStore((s) => s.setStatus);
  const imageRefScaleMode = useStore((s) => s.imageRefScaleMode);
  const setImageRefScaleMode = useStore((s) => s.setImageRefScaleMode);
  const editingImageId = useStore((s) => s.editingImageId);
  const setEditingImageId = useStore((s) => s.setEditingImageId);
  const pushUndo = useStore((s) => s.pushUndo);
  const snapToGridEnabled = useStore((s) => s.snapToGrid);
  const setSnapToGrid = useStore((s) => s.setSnapToGrid);

  const screenToWorld = useCallback(
    (sx: number, sy: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return toWorld(sx, sy, rect, viewport);
    },
    [viewport],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Alt") {
        altKeyPressed.current = true;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") {
        altKeyPressed.current = false;
      }
    };
    const onBlur = () => {
      altKeyPressed.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const resolveSnap = useCallback(
    (world: Point, forceOff: boolean): { point: Point; snapped: boolean } => {
      const bypass = forceOff || altKeyPressed.current || !snapToGridEnabled;
      if (bypass) return { point: world, snapped: false };
      const step = getSnapStep(viewport.zoom);
      return { point: snapToGrid(world, step), snapped: true };
    },
    [snapToGridEnabled, viewport.zoom],
  );

  const { startPan, updatePan, stopPan, handleWheel } = usePanTool({
    canvasRef,
    viewport,
    setViewport,
    isPanning,
    panStart,
  });

  const { startSelectionDrag, updateSelectionDrag, finishSelectionDrag } = useSelectionTool({
    project,
    viewport,
    isSelectDragging,
    selectDragStart,
    selectDragEnd,
    selectEntity,
    setSelectedEntityIds,
    setStatus,
  });

  const { handlePolylineMouseDown, cancelPolyline } = usePolylineTool({
    viewport,
    drawingPoints,
    isDrawing,
    closeToStart,
    addEntity,
    setStatus,
  });

  const {
    confirmPendingRectangle,
    handlePendingRectangleClick,
    startRectangle,
    updateRectanglePreview,
    finishRectangle,
    cancelPendingRectangle,
  } = useRectangleTool({
    drawingPoints,
    isDrawing,
    pendingRectangle,
    addEntity,
    setStatus,
  });

  const { startImageTransform, updateImageTransform, finishImageTransform } =
    useImageTransformTool({
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
    });

  const {
    startOrUpdateReferenceLine,
    updateReferenceLine,
    finishReferenceLine,
    confirmRefScale,
    cancelRefScale,
    cancelReferenceLine,
  } = useImageRefScaleTool({
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
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (startPan(e)) return;

      const world = screenToWorld(e.clientX, e.clientY);
      const { point: snapped, snapped: didSnap } = resolveSnap(world, e.altKey);
      cursorWorld.current = world;
      snapTarget.current = snapped;
      snapActive.current = didSnap;
      if (e.altKey) {
        setStatus(
          `Snap off (Alt) at (${world.x.toFixed(1)}, ${world.y.toFixed(1)})`,
        );
      }

      if (handlePendingRectangleClick(world, viewport.zoom)) return;

      if (toolMode === "select") {
        if (startOrUpdateReferenceLine(world)) return;
        const imageResult = startImageTransform(world, e.shiftKey);
        if (imageResult === "started") return;
        if (imageResult === "locked") return;
        startSelectionDrag(world);
        return;
      }

      if (toolMode === "polyline") {
        handlePolylineMouseDown(snapped);
        return;
      }

      if (toolMode === "rectangle") {
        startRectangle(snapped);
        return;
      }
    },
    [
      screenToWorld,
      resolveSnap,
      setStatus,
      toolMode,
      viewport,
      startPan,
      startSelectionDrag,
      handlePendingRectangleClick,
      handlePolylineMouseDown,
      startRectangle,
      startImageTransform,
      startOrUpdateReferenceLine,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (updatePan(e)) return;

      const world = screenToWorld(e.clientX, e.clientY);
      const { point: snapped, snapped: didSnap } = resolveSnap(world, e.altKey);
      cursorWorld.current = world;
      snapTarget.current = snapped;
      snapActive.current = didSnap;

      if (toolMode === "rectangle" && updateRectanglePreview(snapped)) return;

      if (updateImageTransform(world)) return;

      if (toolMode === "select" && updateSelectionDrag(world)) return;

      if (toolMode === "polyline" && isDrawing.current) {
      }

      if (updateReferenceLine(world)) return;

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = toolMode === "select" ? "default" : "crosshair";
      }
    },
    [
      screenToWorld,
      resolveSnap,
      toolMode,
      updatePan,
      updateSelectionDrag,
      updateRectanglePreview,
      updateImageTransform,
      updateReferenceLine,
    ],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (stopPan()) return;

      if (finishImageTransform()) return;
      if (finishReferenceLine()) return;

      if (toolMode === "select" && finishSelectionDrag(e)) {
        setEditingImageId(null);
        return;
      }

      if (toolMode === "rectangle" && finishRectangle()) return;
    },
    [toolMode, stopPan, finishImageTransform, finishReferenceLine, finishSelectionDrag, finishRectangle, setEditingImageId],
  );

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      return target.isContentEditable;
    };

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        if (pendingRectangle.current) {
          event.preventDefault();
          confirmPendingRectangle();
        }
        return;
      }
      if (event.key !== "Escape") return;

      if (refScalePopup) {
        event.preventDefault();
        cancelRefScale();
        return;
      }
      if (pendingRectangle.current) {
        event.preventDefault();
        cancelPendingRectangle();
        setToolMode("select");
        return;
      }
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      cancelPolyline();
      cancelReferenceLine();
      setToolMode("select");
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    confirmPendingRectangle,
    cancelPendingRectangle,
    refScalePopup,
    cancelRefScale,
    cancelPolyline,
    cancelReferenceLine,
    setToolMode,
  ]);

  useEffect(() => {
    cancelPolyline();
    cancelPendingRectangle();
    cancelReferenceLine();
    setEditingImageId(null);
  }, [toolMode, cancelPolyline, cancelPendingRectangle, cancelReferenceLine, setEditingImageId]);

  useSketchRenderer({
    canvasRef,
    containerRef,
    project,
    viewport,
    selectedEntityIds,
    editingImageId,
    toolMode,
    imageCache,
    isImageResizing,
    imageResizeId,
    imageRefLineStart,
    imageRefLineEnd,
    refScalePopup,
    isDrawing,
    drawingPoints,
    closeToStart,
    isSelectDragging,
    selectDragStart,
    selectDragEnd,
    pendingRectangle,
    cursorWorld,
    snapTarget,
    snapActive,
    snapToGridEnabled,
  });

  return (
    <div
      ref={containerRef}
      className={s.viewport}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} />
      {refScalePopup && (
        <RefScalePopup
          popup={refScalePopup}
          inputRef={refScaleInputRef}
          onConfirm={confirmRefScale}
          onPointerDown={(event) => event.stopPropagation()}
        />
      )}
    </div>
  );
}
