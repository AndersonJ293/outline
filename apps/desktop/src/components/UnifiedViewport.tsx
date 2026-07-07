import { useRef, useEffect, useCallback, useState } from "react";
import { useStore } from "../stores/useStore";
import type { Point } from "../types";
import { screenToWorld as toWorld } from "../features/sketch/geometry";
import { computeSnap, type SnapResult } from "../features/sketch/snapping";
import { finishButtonAt } from "../features/sketch/renderInteraction";
import { RefScalePopup } from "../features/sketch/RefScalePopup";
import { useImageState } from "../features/sketch/useImageState";
import { useSketchRefs } from "../features/sketch/useSketchRefs";
import { useViewportStore } from "../features/sketch/useViewportStore";
import { useImageRefScaleTool } from "../features/sketch/tools/useImageRefScaleTool";
import { useImageTransformTool } from "../features/sketch/tools/useImageTransformTool";
import { useEntityDragTool } from "../features/sketch/tools/useEntityDragTool";
import { useMoveTool } from "../features/sketch/tools/useMoveTool";
import { useMirrorTool } from "../features/sketch/tools/useMirrorTool";
import { useDimensionTool } from "../features/sketch/tools/useDimensionTool";
import { DimensionPopup, type DimensionPopupState } from "../features/sketch/DimensionPopup";
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
    snapActive, snapKind, snapGuides, snapMarker, drawLengthInput,
    isMoving, movePlan, moveStart, movePushUndoDone,
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
    addOperation, removeOperation, selectedOperationId, selectOperation, translateEntity,
    addDimension, updateDimensionValue,
  } = useViewportStore();

  const [dimPopup, setDimPopup] = useState<DimensionPopupState | null>(null);

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

  const drawingAnchor = useCallback((): Point | null => {
    if (toolMode === "polyline" && isDrawing.current && drawingPoints.current.length > 0) {
      return drawingPoints.current[drawingPoints.current.length - 1];
    }
    if (toolMode === "spline" && splineState.current && splineState.current.anchors.length > 0) {
      const a = splineState.current.anchors;
      return a[a.length - 1];
    }
    if (toolMode === "rectangle" && drawingPoints.current.length > 0) {
      return drawingPoints.current[0];
    }
    return null;
  }, [toolMode, isDrawing, drawingPoints, splineState]);

  // Inferred snapping (endpoint/midpoint/H-V/alignment) is always on unless
  // Alt is held; the grid only contributes when its toggle is enabled.
  const resolveSnap = useCallback(
    (world: Point, forceOff: boolean): SnapResult => {
      return computeSnap(world, {
        entities: project?.sketch.entities ?? [],
        viewport,
        gridEnabled: snapToGridEnabled,
        bypass: forceOff || altKeyPressed.current,
        anchor: drawingAnchor(),
      });
    },
    [project, snapToGridEnabled, viewport, altKeyPressed, drawingAnchor],
  );

  const applySnapRefs = useCallback(
    (world: Point, result: SnapResult) => {
      cursorWorld.current = world;
      snapTarget.current = result.point;
      snapActive.current = result.snapped;
      snapKind.current = result.kind;
      snapGuides.current = result.guides;
      snapMarker.current = result.marker;
    },
    [cursorWorld, snapTarget, snapActive, snapKind, snapGuides, snapMarker],
  );

  const { sketchGroupRef, meshGroupRef, cameraRef, sceneRef, sceneRevision } = useThreeScene({
    containerRef: threeContainerRef,
    viewport,
    bodies,
    previewWireframe,
    isSketching,
    workingPlane,
    tool3DMode,
    selectedOperationId,
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
    sceneRevision,
  });

  useEntity3DSelect({
    active: !isSketching && tool3DMode === "select3d",
    containerRef,
    cameraRef,
    sketchGroupRef,
    meshGroupRef,
    workingPlane,
    selectEntity,
    selectOperation,
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
    snapKind,
    snapGuides,
    snapMarker,
    drawLengthInput,
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

  const { handleDimensionMouseDown } = useDimensionTool({
    project, viewport, addDimension, setDimPopup, setStatus,
  });

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

  // Recompute the preview endpoint from the typed length along the current
  // cursor direction, so the rubber-band updates as digits are typed (without
  // needing a mouse move).
  const applyLockedLength = useCallback(() => {
    const anchor = drawingAnchor();
    const len = parseFloat(drawLengthInput.current);
    if (!anchor || !(len > 0)) return;
    const dx = snapTarget.current.x - anchor.x;
    const dy = snapTarget.current.y - anchor.y;
    const d = Math.hypot(dx, dy);
    if (d > 1e-6) {
      snapTarget.current = { x: anchor.x + (dx / d) * len, y: anchor.y + (dy / d) * len };
    }
  }, [drawingAnchor, drawLengthInput, snapTarget]);

  // Place a point at the typed length, in the current cursor direction.
  const commitLockedLength = useCallback((): boolean => {
    const anchor = drawingAnchor();
    const len = parseFloat(drawLengthInput.current);
    if (!anchor || !(len > 0)) return false;
    const dx = snapTarget.current.x - anchor.x;
    const dy = snapTarget.current.y - anchor.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) return false;
    const p = { x: anchor.x + (dx / d) * len, y: anchor.y + (dy / d) * len };
    if (toolMode === "polyline") handlePolylineMouseDown(p);
    else if (toolMode === "spline") handleSplineMouseDown(p);
    else return false;
    drawLengthInput.current = "";
    requestRender();
    return true;
  }, [
    drawingAnchor, snapTarget, drawLengthInput, toolMode,
    handlePolylineMouseDown, handleSplineMouseDown, requestRender,
  ]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (startPan(e)) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const snapResult = resolveSnap(world, e.altKey);
    const snapped = snapResult.point;
    applySnapRefs(world, snapResult);
    if (e.altKey) setStatus(`Snap off (Alt) at (${world.x.toFixed(1)}, ${world.y.toFixed(1)})`);

    if (isPasteFloating.current) { isPasteFloating.current = false; pasteIds.current = []; setStatus("Pasted"); return; }
    if (handlePendingRectangleClick(world, viewport.zoom)) return;

    if (toolMode === "move") {
      if (tryStartMove(world, e.shiftKey)) return;
      startSelectionDrag(world);
      return;
    }
    if (toolMode === "mirror") { handleMirrorMouseDown(world); return; }
    if (toolMode === "dimension") {
      const sx = world.x * viewport.zoom + viewport.offsetX;
      const sy = world.y * viewport.zoom + viewport.offsetY;
      handleDimensionMouseDown(world, sx, sy);
      return;
    }

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

    if (toolMode === "polyline") {
      // A typed length wins over the raw click position (Fusion behavior).
      if (drawLengthInput.current && commitLockedLength()) return;
      if (isDrawing.current && drawingPoints.current.length >= 2) {
        const last = drawingPoints.current[drawingPoints.current.length - 1];
        const btn = finishButtonAt(last, viewport);
        if (Math.hypot(world.x - btn.x, world.y - btn.y) < 12 / viewport.zoom) {
          finishPolyline(false);
          setToolMode("select");
          return;
        }
      }
      handlePolylineMouseDown(snapped);
      drawLengthInput.current = "";
      return;
    }
    if (toolMode === "spline") {
      if (drawLengthInput.current && commitLockedLength()) return;
      handleSplineMouseDown(snapped);
      drawLengthInput.current = "";
      return;
    }
    if (toolMode === "rectangle") { startRectangle(snapped); return; }
    requestRender();
  }, [
    screenToWorld, resolveSnap, applySnapRefs, setStatus, toolMode, viewport,
    startPan, startSelectionDrag, handlePendingRectangleClick,
    handlePolylineMouseDown, finishPolyline, setToolMode, handleSplineMouseDown, startRectangle,
    startImageTransform, startOrUpdateReferenceLine, tryStartHandleDrag,
    tryStartEntityDrag, tryStartMove, handleMirrorMouseDown, handleDimensionMouseDown,
    project, toggleVertex, selectEntity, requestRender, commitLockedLength, drawLengthInput,
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (updatePan(e)) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const snapResult = resolveSnap(world, e.altKey);
    const snapped = snapResult.point;
    applySnapRefs(world, snapResult);
    // While typing a length, lock the segment to it; direction follows cursor.
    if (drawLengthInput.current && (toolMode === "polyline" || toolMode === "spline")) {
      const anchor = drawingAnchor();
      const len = parseFloat(drawLengthInput.current);
      if (anchor && len > 0) {
        const dx = snapResult.point.x - anchor.x;
        const dy = snapResult.point.y - anchor.y;
        const d = Math.hypot(dx, dy);
        if (d > 1e-6) {
          snapTarget.current = { x: anchor.x + (dx / d) * len, y: anchor.y + (dy / d) * len };
        }
      }
    }
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
    screenToWorld, resolveSnap, applySnapRefs, drawingAnchor, toolMode, updatePan, updateSelectionDrag,
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

  // Type a length while drawing (Fusion-style): digits build the value,
  // Enter/Tab places the point, Esc clears, Backspace deletes a digit.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isSketching) return;
      if (toolMode !== "polyline" && toolMode !== "spline") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) {
        return;
      }
      if (!drawingAnchor()) return;
      const k = e.key;
      if ((k >= "0" && k <= "9") || k === ".") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (k === "." && drawLengthInput.current.includes(".")) return;
        drawLengthInput.current += k;
        applyLockedLength();
        requestRender();
      } else if (k === "Backspace" && drawLengthInput.current.length > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        drawLengthInput.current = drawLengthInput.current.slice(0, -1);
        applyLockedLength();
        requestRender();
      } else if ((k === "Enter" || k === "Tab") && drawLengthInput.current.length > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        commitLockedLength();
      } else if (k === "Escape" && drawLengthInput.current.length > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        drawLengthInput.current = "";
        requestRender();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isSketching, toolMode, drawingAnchor, drawLengthInput, applyLockedLength, commitLockedLength, requestRender]);

  useEffect(() => {
    drawLengthInput.current = "";
  }, [toolMode, drawLengthInput]);

  // Delete the selected operation (solid body) from the 3D view.
  useEffect(() => {
    if (isSketching) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const active = document.activeElement;
      if (active instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) {
        return;
      }
      if (!selectedOperationId) return;
      e.preventDefault();
      removeOperation(selectedOperationId);
      setStatus("Operation removed");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSketching, selectedOperationId, removeOperation, setStatus]);

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
      {dimPopup && (
        <DimensionPopup
          popup={dimPopup}
          onConfirm={(value) => {
            updateDimensionValue(dimPopup.dimId, value);
            setDimPopup(null);
            setStatus(`Dimension set to ${value.toFixed(1)} mm`);
          }}
          onCancel={() => setDimPopup(null)}
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
