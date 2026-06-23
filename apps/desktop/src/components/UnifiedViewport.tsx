import { useRef, useEffect, useCallback, useState } from "react";
import { useStore } from "../stores/useStore";
import type { Point } from "../types";
import { screenToWorld as toWorld, snapToGrid, getSnapStep } from "../features/sketch/geometry";
import { RefScalePopup } from "../features/sketch/RefScalePopup";
import type { RefScalePopupState } from "../features/sketch/tools/useImageRefScaleTool";
import { useImageRefScaleTool } from "../features/sketch/tools/useImageRefScaleTool";
import { useImageTransformTool } from "../features/sketch/tools/useImageTransformTool";
import { useEntityDragTool } from "../features/sketch/tools/useEntityDragTool";
import { useMoveTool, type MovePlan } from "../features/sketch/tools/useMoveTool";
import { useMirrorTool } from "../features/sketch/tools/useMirrorTool";
import { translateEntityWhole } from "../features/sketch/entityDrag";
import { hitTestEntityWithPoint } from "../features/sketch/hitTest";
import { usePanTool } from "../features/sketch/tools/usePanTool";
import { usePolylineTool } from "../features/sketch/tools/usePolylineTool";
import { useRectangleTool } from "../features/sketch/tools/useRectangleTool";
import { useSelectionTool } from "../features/sketch/tools/useSelectionTool";
import { useSplineHandleDragTool } from "../features/sketch/tools/useSplineHandleDragTool";
import { useSplineTool, type SplineDrawingState } from "../features/sketch/tools/useSplineTool";
import { useCanvasKeyboardShortcuts } from "../features/sketch/useCanvasKeyboardShortcuts";
import { useStaticRenderer } from "../features/sketch/useStaticRenderer";
import { useOverlayRenderer } from "../features/sketch/useOverlayRenderer";
import { useCanvasResize } from "../features/sketch/useCanvasResize";
import { useThreeScene } from "../features/viewport/useThreeScene";
import { useSketchWireframe } from "../features/viewport/useSketchWireframe";
import s from "./Canvas2D.module.css";

export default function UnifiedViewport() {
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
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
  const isEntityDragging = useRef(false);
  const entityDragMode = useRef<"point" | "segment" | "entity" | null>(null);
  const entityDragEntityId = useRef<string | null>(null);
  const entityDragPointIndex = useRef<number | null>(null);
  const entityDragSegIdx = useRef<number | null>(null);
  const entityDragStart = useRef<Point>({ x: 0, y: 0 });
  const entityPushUndoDone = useRef(false);
  const lastClickTime = useRef(0);
  const lastClickKey = useRef("");
  const splineState = useRef<SplineDrawingState | null>(null);
  const isHandleDragging = useRef(false);
  const handleDragEntityId = useRef<string | null>(null);
  const handleDragAnchorIndex = useRef<number | null>(null);
  const handleDragStart = useRef<Point>({ x: 0, y: 0 });
  const handlePushUndoDone = useRef(false);
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
  const isMoving = useRef(false);
  const movePlan = useRef<MovePlan | null>(null);
  const moveStart = useRef<Point>({ x: 0, y: 0 });
  const movePushUndoDone = useRef(false);
  const isPasteFloating = useRef(false);
  const pasteIds = useRef<string[]>([]);
  const pasteLast = useRef<Point>({ x: 0, y: 0 });

  const project = useStore((s) => s.project);
  const toolMode = useStore((s) => s.toolMode);
  const setToolMode = useStore((s) => s.setToolMode);
  const viewport = useStore((s) => s.viewport);
  const setViewport = useStore((s) => s.setViewport);
  const selectedEntityIds = useStore((s) => s.selectedEntityIds);
  const selectedVertices = useStore((s) => s.selectedVertices);
  const selectEntity = useStore((s) => s.selectEntity);
  const setSelectedEntityIds = useStore((s) => s.setSelectedEntityIds);
  const toggleVertex = useStore((s) => s.toggleVertex);
  const copySelection = useStore((s) => s.copySelection);
  const pasteAtPoint = useStore((s) => s.pasteAtPoint);
  const undo = useStore((s) => s.undo);
  const addEntity = useStore((s) => s.addEntity);
  const updateImage = useStore((s) => s.updateImage);
  const setStatus = useStore((s) => s.setStatus);
  const imageRefScaleMode = useStore((s) => s.imageRefScaleMode);
  const setImageRefScaleMode = useStore((s) => s.setImageRefScaleMode);
  const editingImageId = useStore((s) => s.editingImageId);
  const setEditingImageId = useStore((s) => s.setEditingImageId);
  const entityDragTarget = useStore((s) => s.entityDragTarget);
  const setEntityDragTarget = useStore((s) => s.setEntityDragTarget);
  const pushUndo = useStore((s) => s.pushUndo);
  const snapToGridEnabled = useStore((s) => s.snapToGrid);
  const updateEntity = useStore((s) => s.updateEntity);
  const setSnapToGrid = useStore((s) => s.setSnapToGrid);
  const bodies = useStore((s) => s.bodies);
  const previewWireframe = useStore((s) => s.previewWireframe);

  const screenToWorld = useCallback(
    (sx: number, sy: number): Point => {
      const canvas = staticCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return toWorld(sx, sy, rect, viewport);
    },
    [viewport],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Alt") altKeyPressed.current = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") altKeyPressed.current = false;
    };
    const onBlur = () => { altKeyPressed.current = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    const isEditable = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
    };
    const onKey = (event: KeyboardEvent) => {
      if (isEditable(event.target)) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "c") {
        copySelection();
        setStatus("Copied selection");
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "v") {
        event.preventDefault();
        const at = cursorWorld.current;
        const ids = pasteAtPoint(at);
        if (ids.length === 0) return;
        setToolMode("move");
        isPasteFloating.current = true;
        pasteIds.current = ids;
        pasteLast.current = at;
        setStatus("Paste: move to position, click to place, Esc to cancel");
        return;
      }
      if (event.key === "Escape" && isPasteFloating.current) {
        event.preventDefault();
        isPasteFloating.current = false;
        pasteIds.current = [];
        undo();
        setStatus("Paste cancelled");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copySelection, pasteAtPoint, setToolMode, setStatus, undo]);

  const resolveSnap = useCallback(
    (world: Point, forceOff: boolean): { point: Point; snapped: boolean } => {
      const bypass = forceOff || altKeyPressed.current || !snapToGridEnabled;
      if (bypass) return { point: world, snapped: false };
      const step = getSnapStep(viewport.zoom);
      return { point: snapToGrid(world, step), snapped: true };
    },
    [snapToGridEnabled, viewport.zoom],
  );

  const { sketchGroupRef } = useThreeScene({ containerRef: threeContainerRef, viewport, bodies, previewWireframe });

  useSketchWireframe({
    entities: project?.sketch.entities ?? [],
    sketchGroupRef,
  });

  const { requestRender: requestStaticRender } = useStaticRenderer({
    canvasRef: staticCanvasRef,
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

  useCanvasResize(containerRef, [staticCanvasRef, overlayCanvasRef], requestStaticRender);

  const { requestRender } = useOverlayRenderer({
    canvasRef: overlayCanvasRef,
    viewport,
    toolMode,
    isDrawing,
    drawingPoints,
    closeToStart,
    isSelectDragging,
    selectDragStart,
    selectDragEnd,
    pendingRectangle,
    splineState,
    cursorWorld,
    snapTarget,
    snapActive,
    imageRefLineStart,
    imageRefLineEnd,
    refScalePopup,
    snapToGridEnabled,
  });

  const { startPan, updatePan, stopPan, handleWheel } = usePanTool({
    canvasRef: staticCanvasRef,
    viewport,
    setViewport,
    isPanning,
    panStart,
  });

  const { startSelectionDrag, updateSelectionDrag, finishSelectionDrag } = useSelectionTool({
    project, viewport, isSelectDragging, selectDragStart, selectDragEnd,
    selectEntity, setSelectedEntityIds, setStatus,
  });

  const { tryStartEntityDrag, updateEntityDrag, finishEntityDrag } = useEntityDragTool({
    project, viewport, selectEntity, updateEntity, pushUndo, setEntityDragTarget,
    isEntityDragging, dragMode: entityDragMode, dragEntityId: entityDragEntityId,
    dragPointIndex: entityDragPointIndex, dragSegIdx: entityDragSegIdx,
    dragStart: entityDragStart, pushUndoDone: entityPushUndoDone, lastClickTime, lastClickKey,
  });

  const { tryStartMove, updateMove, finishMove } = useMoveTool({
    project, viewport, updateEntity, pushUndo, setSelectedEntityIds, toggleVertex, setStatus,
    isMoving, movePlan, moveStart, movePushUndoDone,
  });

  const { handleMirrorMouseDown } = useMirrorTool({ project, viewport, setStatus });

  const { handlePolylineMouseDown, finishPolyline, cancelPolyline, popPolylinePoint } =
    usePolylineTool({ viewport, project, drawingPoints, isDrawing, closeToStart, addEntity, setStatus });

  const { handleSplineMouseDown, finishSpline, cancelSpline, popSplineAnchor } = useSplineTool({
    viewport, project, isDrawing, splineState, addEntity, setStatus,
  });

  const { tryStartHandleDrag, updateHandleDrag, finishHandleDrag } = useSplineHandleDragTool({
    project, viewport, updateEntity, pushUndo, setStatus,
    isHandleDragging, dragEntityId: handleDragEntityId,
    dragAnchorIndex: handleDragAnchorIndex, dragStart: handleDragStart,
    pushUndoDone: handlePushUndoDone,
  });

  const {
    confirmPendingRectangle, handlePendingRectangleClick, startRectangle,
    updateRectanglePreview, finishRectangle, cancelPendingRectangle,
  } = useRectangleTool({ drawingPoints, isDrawing, pendingRectangle, addEntity, setStatus });

  const { startImageTransform, updateImageTransform, finishImageTransform } =
    useImageTransformTool({
      project, viewport, editingImageId, isImageMoving, imageMoveStartId, imageMoveStartPos,
      isImageResizing, imageResizeId, imageResizeStart, imageResizeOrigSize,
      imageResizeHandleType, imageMovePushUndoDone, imageResizePushUndoDone,
      selectEntity, updateImage, pushUndo,
    });

  const {
    startOrUpdateReferenceLine, updateReferenceLine, finishReferenceLine,
    confirmRefScale, cancelRefScale, cancelReferenceLine,
  } = useImageRefScaleTool({
    containerRef, project, viewport, imageRefScaleMode, imageRefLineStart, imageRefLineEnd,
    imageRefScaleImageId, refScalePopup, setRefScalePopup, updateImage, pushUndo,
    setImageRefScaleMode, setStatus,
  });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (startPan(e)) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const { point: snapped, snapped: didSnap } = resolveSnap(world, e.altKey);
    cursorWorld.current = world;
    snapTarget.current = snapped;
    snapActive.current = didSnap;
    if (e.altKey) setStatus(`Snap off (Alt) at (${world.x.toFixed(1)}, ${world.y.toFixed(1)})`);

    if (isPasteFloating.current) { isPasteFloating.current = false; pasteIds.current = []; setStatus("Pasted"); return; }
    if (handlePendingRectangleClick(world, viewport.zoom)) return;

    if (toolMode === "move") {
      if (tryStartMove(world, e.shiftKey)) return;
      startSelectionDrag(world);
      return;
    }
    if (toolMode === "mirror") { handleMirrorMouseDown(world); return; }

    if (toolMode === "select") {
      if (e.shiftKey) {
        const hit = hitTestEntityWithPoint(project?.sketch.entities ?? [], world, viewport);
        if (hit?.kind === "point") { toggleVertex({ entityId: hit.entityId, pointIndex: hit.pointIndex }, true); return; }
        if (hit) { selectEntity(hit.entityId, true); return; }
        startSelectionDrag(world);
        return;
      }
      if (startOrUpdateReferenceLine(world)) return;
      if (tryStartHandleDrag(world)) return;
      if (tryStartEntityDrag(world)) return;
      const imageResult = startImageTransform(world, e.shiftKey);
      if (imageResult === "started") return;
      if (imageResult === "locked") return;
      startSelectionDrag(world);
      return;
    }

    if (toolMode === "polyline") { handlePolylineMouseDown(snapped); return; }
    if (toolMode === "spline") { handleSplineMouseDown(snapped); return; }
    if (toolMode === "rectangle") { startRectangle(snapped); return; }
    requestRender();
  }, [
    screenToWorld, resolveSnap, setStatus, toolMode, viewport,
    startPan, startSelectionDrag, handlePendingRectangleClick,
    handlePolylineMouseDown, handleSplineMouseDown, startRectangle,
    startImageTransform, startOrUpdateReferenceLine, tryStartHandleDrag,
    tryStartEntityDrag, tryStartMove, handleMirrorMouseDown,
    project, toggleVertex, selectEntity, requestRender,
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (updatePan(e)) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const { point: snapped, snapped: didSnap } = resolveSnap(world, e.altKey);
    cursorWorld.current = world;
    snapTarget.current = snapped;
    snapActive.current = didSnap;
    requestRender();

    if (isPasteFloating.current) {
      const dx = snapped.x - pasteLast.current.x;
      const dy = snapped.y - pasteLast.current.y;
      if (dx !== 0 || dy !== 0) {
        const entities = useStore.getState().project?.sketch.entities ?? [];
        for (const id of pasteIds.current) {
          const entity = entities.find((en) => en.id === id);
          if (!entity) continue;
          updateEntity(id, translateEntityWhole(entity, dx, dy));
        }
        pasteLast.current = snapped;
      }
      return;
    }

    if (toolMode === "rectangle" && updateRectanglePreview(snapped)) return;
    if (toolMode === "move" && updateMove(world)) return;
    if (updateHandleDrag(world)) return;
    if (updateEntityDrag(world)) return;
    if (updateImageTransform(world)) return;
    if (toolMode === "select" && updateSelectionDrag(world)) return;
    if (updateReferenceLine(world)) return;

    const canvas = staticCanvasRef.current;
    if (canvas) canvas.style.cursor = toolMode === "select" ? "default" : "crosshair";
  }, [
    screenToWorld, resolveSnap, toolMode, updatePan, updateSelectionDrag,
    updateRectanglePreview, updateHandleDrag, updateEntityDrag,
    updateImageTransform, updateReferenceLine, updateMove, updateEntity, requestRender,
  ]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (stopPan()) return;
    if (finishImageTransform()) return;
    if (finishMove()) return;
    if (finishHandleDrag()) return;
    if (finishEntityDrag()) return;
    if (finishReferenceLine()) return;
    if (toolMode === "select" && finishSelectionDrag(e)) { setEditingImageId(null); return; }
    if (toolMode === "rectangle" && finishRectangle()) return;
    requestRender();
  }, [
    toolMode, stopPan, finishImageTransform, finishHandleDrag, finishEntityDrag,
    finishReferenceLine, finishSelectionDrag, finishRectangle, finishMove,
    setEditingImageId, requestRender,
  ]);

  useCanvasKeyboardShortcuts({
    pendingRectangle, splineState, drawingPoints, refScalePopup,
    confirmPendingRectangle, cancelPendingRectangle, cancelRefScale,
    cancelPolyline, popPolylinePoint, finishPolyline,
    cancelSpline, popSplineAnchor, finishSpline, cancelReferenceLine,
    setToolMode, toolMode, setEditingImageId, setEntityDragTarget,
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
      <div ref={threeContainerRef} style={{ position: "absolute", inset: 0 }} />
      <canvas ref={staticCanvasRef} className={s.static} />
      <canvas ref={overlayCanvasRef} className={s.overlay} style={{ pointerEvents: "none" }} />
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
