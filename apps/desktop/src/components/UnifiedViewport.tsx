import { useRef, useEffect, useCallback } from "react";
import { useStore } from "../stores/useStore";
import type { Point } from "../types";
import { screenToWorld as toWorld, snapToGrid, getSnapStep } from "../features/sketch/geometry";
import { RefScalePopup } from "../features/sketch/RefScalePopup";
import { useImageState } from "../features/sketch/useImageState";
import { useSketchRefs } from "../features/sketch/useSketchRefs";
import { useViewportStore } from "../features/sketch/useViewportStore";
import { useImageRefScaleTool } from "../features/sketch/tools/useImageRefScaleTool";
import { useImageTransformTool } from "../features/sketch/tools/useImageTransformTool";
import { useEntityDragTool } from "../features/sketch/tools/useEntityDragTool";
import { useMoveTool } from "../features/sketch/tools/useMoveTool";
import { useMirrorTool } from "../features/sketch/tools/useMirrorTool";
import { translateEntityWhole } from "../features/sketch/entityDrag";
import { hitTestEntityWithPoint } from "../features/sketch/hitTest";
import { usePanTool } from "../features/sketch/tools/usePanTool";
import { usePolylineTool } from "../features/sketch/tools/usePolylineTool";
import { useRectangleTool } from "../features/sketch/tools/useRectangleTool";
import { useSelectionTool } from "../features/sketch/tools/useSelectionTool";
import { useSplineHandleDragTool } from "../features/sketch/tools/useSplineHandleDragTool";
import { useSplineTool } from "../features/sketch/tools/useSplineTool";
import { useCanvasKeyboardShortcuts } from "../features/sketch/useCanvasKeyboardShortcuts";
import { useStaticRenderer } from "../features/sketch/useStaticRenderer";
import { useOverlayRenderer } from "../features/sketch/useOverlayRenderer";
import { useCanvasResize } from "../features/sketch/useCanvasResize";
import { useSketchViewportReset } from "../features/sketch/useSketchViewportReset";
import { useCanvasShortcuts } from "../features/sketch/useCanvasShortcuts";
import { useThreeScene } from "../features/viewport/useThreeScene";
import { useSketchWireframe } from "../features/viewport/useSketchWireframe";
import { useFaceSelection } from "../features/viewport/useFaceSelection";
import { usePlanePicker3D } from "../features/viewport/usePlanePicker3D";
import { useEntity3DSelect } from "../features/viewport/useEntity3DSelect";
import { useExtrudeTool } from "../features/viewport/useExtrudeTool";
import s from "./Canvas2D.module.css";

export default function UnifiedViewport() {
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    drawingPoints, isDrawing, isPanning, panStart, closeToStart, pendingRectangle,
    isSelectDragging, selectDragStart, selectDragEnd,
    isEntityDragging, entityDragMode, entityDragEntityId, entityDragPointIndex,
    entityDragSegIdx, entityDragStart, entityPushUndoDone, lastClickTime, lastClickKey,
    splineState, isHandleDragging, handleDragEntityId, handleDragAnchorIndex,
    handleDragStart, handlePushUndoDone, altKeyPressed, cursorWorld, snapTarget,
    snapActive, isMoving, movePlan, moveStart, movePushUndoDone,
    isPasteFloating, pasteIds, pasteLast,
  } = useSketchRefs();
  const {
    imageCache, isImageMoving, imageMoveStartId, imageMoveStartPos,
    isImageResizing, imageResizeId, imageResizeStart, imageResizeOrigSize,
    imageResizeHandleType, imageMovePushUndoDone, imageResizePushUndoDone,
    imageRefLineStart, imageRefLineEnd, imageRefScaleImageId,
    refScalePopup, setRefScalePopup, refScaleInputRef,
  } = useImageState();

  const {
    project, toolMode, setToolMode, viewport, setViewport,
    selectedEntityIds, selectedVertices, selectEntity, setSelectedEntityIds,
    toggleVertex, copySelection, pasteAtPoint, undo, addEntity, updateImage,
    setStatus, setError, imageRefScaleMode, setImageRefScaleMode,
    editingImageId, setEditingImageId, entityDragTarget, setEntityDragTarget,
    pushUndo, snapToGrid: snapToGridEnabled, updateEntity, bodies, previewWireframe,
    isSketching, workingPlane, faceSelectionActive, setFaceSelectionActive,
    planePickerActive, setPlanePickerActive, setIsSketching, setWorkingPlane,
    tool3DMode, setTool3DMode, extrudeMode, wallHeight, wallThickness, offsetSide,
    addOperation, translateEntity,
  } = useViewportStore();

  const screenToWorld = useCallback(
    (sx: number, sy: number): Point => {
      const canvas = staticCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return toWorld(sx, sy, rect, viewport);
    },
    [viewport],
  );

  useCanvasShortcuts({
    altKeyPressed,
    cursorWorld,
    isPasteFloating,
    pasteIds,
    pasteLast,
    copySelection,
    pasteAtPoint,
    setToolMode,
    setStatus,
    undo,
  });

  const resolveSnap = useCallback(
    (world: Point, forceOff: boolean): { point: Point; snapped: boolean } => {
      const bypass = forceOff || altKeyPressed.current || !snapToGridEnabled;
      if (bypass) return { point: world, snapped: false };
      const step = getSnapStep(viewport.zoom);
      return { point: snapToGrid(world, step), snapped: true };
    },
    [snapToGridEnabled, viewport.zoom],
  );

  const { sketchGroupRef, meshGroupRef, cameraRef, sceneRef } = useThreeScene({
    containerRef: threeContainerRef,
    viewport,
    bodies,
    previewWireframe,
    isSketching,
    workingPlane,
    tool3DMode,
  });

  useSketchViewportReset({
    active: isSketching,
    canvasRef: staticCanvasRef,
    setViewport,
  });

  useFaceSelection({
    active: faceSelectionActive,
    containerRef,
    cameraRef,
    meshGroupRef,
    setWorkingPlane,
    setIsSketching,
    setFaceSelectionActive,
    setStatus,
  });

  usePlanePicker3D({
    active: planePickerActive,
    containerRef,
    cameraRef,
    sceneRef,
    setWorkingPlane,
    setIsSketching,
    setShowPlanePicker: setPlanePickerActive,
    setStatus,
  });

  useSketchWireframe({
    entities: project?.sketch.entities ?? [],
    sketchGroupRef,
    workingPlane,
  });

  useEntity3DSelect({
    active: !isSketching && tool3DMode === "select3d",
    containerRef,
    cameraRef,
    sketchGroupRef,
    workingPlane,
    selectEntity,
    translateEntity,
    setStatus,
  });

  useExtrudeTool({
    active: !isSketching && tool3DMode === "extrude",
    containerRef,
    cameraRef,
    sketchGroupRef,
    project,
    extrudeMode,
    wallHeight,
    wallThickness,
    offsetSide,
    addOperation,
    setStatus,
    setError,
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
      onMouseDown={isSketching ? handleMouseDown : undefined}
      onMouseMove={isSketching ? handleMouseMove : undefined}
      onMouseUp={isSketching ? handleMouseUp : undefined}
      onWheel={isSketching ? handleWheel : undefined}
      onContextMenu={(e) => e.preventDefault()}
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
        style={{ pointerEvents: isSketching ? "auto" : "none", display: isSketching ? "block" : "none" }}
      />
      {refScalePopup && (
        <RefScalePopup
          popup={refScalePopup}
          inputRef={refScaleInputRef}
          onConfirm={confirmRefScale}
          onPointerDown={(event) => event.stopPropagation()}
        />
      )}
      {faceSelectionActive && (
        <div style={{
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
        }}>
          Click on a solid face to use as sketch plane
        </div>
      )}
    </div>
  );
}
