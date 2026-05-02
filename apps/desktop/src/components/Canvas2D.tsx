import { useRef, useEffect, useCallback, useState } from "react";
import { useStore } from "../stores/useStore";
import type { Point, Entity } from "../types";
import { generateId, pointDistance } from "../types";
import { CLOSE_THRESHOLD } from "../features/sketch/constants";
import { rectanglePoints, screenToWorld as toWorld, snapToGrid } from "../features/sketch/geometry";
import {
  hitTestEntity as hitEntity,
  hitTestImage as hitImage,
  hitTestImageHandle,
} from "../features/sketch/hitTest";
import { RefScalePopup } from "../features/sketch/RefScalePopup";
import { usePanTool } from "../features/sketch/tools/usePanTool";
import { useSelectionTool } from "../features/sketch/tools/useSelectionTool";
import { useSketchRenderer } from "../features/sketch/useSketchRenderer";

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
  const imageRefLineStart = useRef<Point | null>(null);
  const imageRefLineEnd = useRef<Point | null>(null);
  const imageRefScaleImageId = useRef<string | null>(null);
  const [refScalePopup, setRefScalePopup] = useState<{ imageId: string; lengthMm: number; screenX: number; screenY: number } | null>(null);
  const refScaleInputRef = useRef<HTMLInputElement>(null);

  const project = useStore((s) => s.project);
  const toolMode = useStore((s) => s.toolMode);
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

  const confirmPendingRectangle = useCallback(() => {
    const pending = pendingRectangle.current;
    if (!pending) return;
    const entity: Entity = {
      id: generateId(),
      type: "rectangle",
      points: pending.points,
      closed: true,
    };
    addEntity(entity);
    pendingRectangle.current = null;
    setStatus("Retângulo confirmado");
  }, [addEntity, setStatus]);

  const screenToWorld = useCallback(
    (sx: number, sy: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return toWorld(sx, sy, rect, viewport);
    },
    [viewport],
  );

  const hitTestEntity = useCallback(
    (world: Point): string | null => {
      if (!project) return null;
      return hitEntity(project.sketch.entities, world, viewport);
    },
    [project, viewport],
  );

  const hitTestImage = useCallback(
    (world: Point): string | null => {
      return hitImage(project?.sketch.images, world);
    },
    [project],
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

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (startPan(e)) return;

      const world = screenToWorld(e.clientX, e.clientY);
      const snapped = snapToGrid(world);

      if (pendingRectangle.current) {
        const confirm = pendingRectangle.current.confirmPoint;
        const dx = (confirm.x - world.x) * viewport.zoom;
        const dy = (confirm.y - world.y) * viewport.zoom;
        if (Math.sqrt(dx * dx + dy * dy) < 18) {
          confirmPendingRectangle();
          return;
        }
        pendingRectangle.current = null;
      }

      if (toolMode === "select") {
        if (imageRefScaleMode) {
          if (!imageRefLineStart.current) {
            imageRefLineStart.current = world;
            imageRefLineEnd.current = world;
          } else {
            imageRefLineEnd.current = world;
          }
          return;
        }
        const imageId = hitTestImage(world);
          if (imageId && project?.sketch.images) {
            const img = project.sketch.images.find((i) => i.id === imageId);
            if (img) {
              const hitHandle = hitTestImageHandle(img, world, viewport);
              if (hitHandle) {
                isImageResizing.current = true;
                imageResizeId.current = imageId;
                imageResizeHandleType.current = hitHandle;
                imageResizeStart.current = world;
                imageResizeOrigSize.current = { w: img.widthMm, h: img.heightMm };
                selectEntity(imageId);
                return;
              }
            isImageMoving.current = true;
            imageMoveStartId.current = imageId;
            imageMoveStartPos.current = world;
            if (!e.shiftKey) selectEntity(imageId);
            return;
          }
        }
        startSelectionDrag(world);
        return;
      }

      if (toolMode === "polyline") {
        if (!isDrawing.current) {
          // Inicia polyline
          isDrawing.current = true;
          closeToStart.current = false;
          drawingPoints.current = [snapped];
          setStatus(`Polyline: ponto 1 em (${snapped.x.toFixed(1)}, ${snapped.y.toFixed(1)})`);
        } else {
          // Verifica se clicou perto do primeiro ponto para fechar
          const first = drawingPoints.current[0];
          const dist = pointDistance(snapped, first);
          const distScreen = dist * viewport.zoom;

          if (distScreen < CLOSE_THRESHOLD && drawingPoints.current.length >= 2) {
            // Fecha contorno
            closeToStart.current = true;
            const entity: Entity = {
              id: generateId(),
              type: "polyline",
              points: drawingPoints.current,
              closed: true,
            };
            addEntity(entity);
            isDrawing.current = false;
            setStatus(`Polyline fechada: ${drawingPoints.current.length} pontos`);
          } else {
            drawingPoints.current = [...drawingPoints.current, snapped];
            setStatus(
              `Polyline: ponto ${drawingPoints.current.length} em (${snapped.x.toFixed(1)}, ${snapped.y.toFixed(1)})`,
            );
          }
        }
        return;
      }

      if (toolMode === "rectangle") {
        isDrawing.current = true;
        drawingPoints.current = [snapped, snapped];
        return;
      }
    },
    [screenToWorld, toolMode, viewport, project, hitTestImage, selectEntity, addEntity, setStatus, confirmPendingRectangle, imageRefScaleMode, startPan, startSelectionDrag],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (updatePan(e)) return;

      const world = screenToWorld(e.clientX, e.clientY);
      const snapped = snapToGrid(world);

      if (toolMode === "rectangle" && isDrawing.current && drawingPoints.current.length === 2) {
        drawingPoints.current[1] = snapped;
        return;
      }

      if (isImageMoving.current && imageMoveStartId.current) {
        const dx = world.x - imageMoveStartPos.current.x;
        const dy = world.y - imageMoveStartPos.current.y;
        const img = project?.sketch.images?.find((i) => i.id === imageMoveStartId.current);
        if (img) {
          updateImage(img.id, { x: img.x + dx, y: img.y + dy });
        }
        imageMoveStartPos.current = world;
        return;
      }

      if (isImageResizing.current && imageResizeId.current) {
        const img = project?.sketch.images?.find((i) => i.id === imageResizeId.current);
        if (img) {
          const dx = world.x - imageResizeStart.current.x;
          const dy = world.y - imageResizeStart.current.y;
          const origW = imageResizeOrigSize.current.w;
          const origH = imageResizeOrigSize.current.h;
          const handleType = imageResizeHandleType.current;
          let newW = origW;
          let newH = origH;

          if (handleType.startsWith("corner")) {
            const xDir = handleType.includes("r") ? 1 : -1;
            const yDir = handleType.includes("b") ? 1 : -1;
            const d = Math.max(Math.abs(dx * xDir), Math.abs(dy * yDir)) * Math.sign(dx * xDir || dy * yDir);
            newW = Math.max(5, origW + d);
            newH = newW * (origH / origW);
          } else if (handleType === "edge-r" || handleType === "edge-l") {
            const dir = handleType === "edge-r" ? 1 : -1;
            newW = Math.max(5, origW + dx * dir);
            newH = origH;
          } else {
            const dir = handleType === "edge-b" ? 1 : -1;
            newH = Math.max(5, origH + dy * dir);
            newW = origW;
          }
          updateImage(img.id, { widthMm: newW, heightMm: newH });
        }
        return;
      }

      if (toolMode === "select" && updateSelectionDrag(world)) return;

      if (toolMode === "polyline" && isDrawing.current) {
      }

      if (imageRefScaleMode && imageRefLineStart.current) {
        imageRefLineEnd.current = world;
        return;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = toolMode === "select" ? "default" : "crosshair";
      }
    },
    [screenToWorld, toolMode, project, updateImage, imageRefScaleMode, updatePan, updateSelectionDrag],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (stopPan()) return;

      if (isImageMoving.current) {
        isImageMoving.current = false;
        imageMoveStartId.current = null;
        return;
      }

      if (isImageResizing.current) {
        isImageResizing.current = false;
        imageResizeId.current = null;
        return;
      }

      if (imageRefScaleMode && imageRefLineStart.current && imageRefLineEnd.current) {
        const dist = pointDistance(imageRefLineStart.current, imageRefLineEnd.current);
        const screenDist = dist * viewport.zoom;
        if (screenDist < 5) {
          imageRefLineStart.current = null;
          imageRefLineEnd.current = null;
          return;
        }
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const endScreen = imageRefLineEnd.current;
          const sx = (endScreen.x * viewport.zoom + viewport.offsetX);
          const sy = (endScreen.y * viewport.zoom + viewport.offsetY);
          setRefScalePopup({
            imageId: imageRefScaleImageId.current ?? "",
            lengthMm: dist,
            screenX: sx,
            screenY: sy,
          });
        }
        setStatus(`Linha de referência: ${dist.toFixed(2)} mm. Digite o tamanho real.`);
        return;
      }

      if (toolMode === "select" && finishSelectionDrag(e)) return;

      if (toolMode === "rectangle" && isDrawing.current) {
        const points = drawingPoints.current;
        if (points.length === 2) {
          const p0 = points[0];
          const p1 = points[1];
          const width = Math.abs(p1.x - p0.x);
          const height = Math.abs(p1.y - p0.y);
          if (width > 0 && height > 0) {
            pendingRectangle.current = {
              points: rectanglePoints(p0, p1),
              confirmPoint: p1,
            };
            setStatus(`Retângulo pendente: ${width.toFixed(1)} x ${height.toFixed(1)} mm. Clique no ponto verde ou pressione Enter.`);
          }
        }
        isDrawing.current = false;
      }
    },
    [toolMode, viewport, project, updateImage, setStatus, stopPan, finishSelectionDrag],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (pendingRectangle.current) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          confirmPendingRectangle();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          pendingRectangle.current = null;
          setStatus("Retângulo cancelado");
          return;
        }
      }
      if (refScalePopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          setRefScalePopup(null);
          imageRefLineStart.current = null;
          imageRefLineEnd.current = null;
          setImageRefScaleMode(false);
          setStatus("Escala por referência cancelada");
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [confirmPendingRectangle, setStatus, project, updateImage, setImageRefScaleMode, refScalePopup]);

  const handleConfirmRefScale = useCallback(
    (realLengthMm: number) => {
      if (!refScalePopup) return;
      const img = project?.sketch.images?.find((i) => i.id === refScalePopup.imageId);
      if (img) {
        const scale = realLengthMm / refScalePopup.lengthMm;
        updateImage(img.id, {
          widthMm: img.widthMm * scale,
          heightMm: img.heightMm * scale,
        });
        setStatus(
          `Imagem escalada: referência de ${refScalePopup.lengthMm.toFixed(2)} mm → ${realLengthMm.toFixed(2)} mm`,
        );
      }
      setRefScalePopup(null);
      imageRefLineStart.current = null;
      imageRefLineEnd.current = null;
      setImageRefScaleMode(false);
    },
    [project, refScalePopup, updateImage, setStatus, setImageRefScaleMode],
  );

  useSketchRenderer({
    canvasRef,
    containerRef,
    project,
    viewport,
    selectedEntityIds,
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
  });

  return (
    <div
      ref={containerRef}
      className="viewport"
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
          onConfirm={handleConfirmRefScale}
          onPointerDown={(event) => event.stopPropagation()}
        />
      )}
    </div>
  );
}
