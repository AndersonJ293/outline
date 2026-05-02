import { useRef, useEffect, useCallback, useState } from "react";
import { useStore } from "../stores/useStore";
import type { Point, Entity, SketchImage, ToolMode } from "../types";
import { generateId, pointDistance } from "../types";

const GRID_SIZE = 10; // mm
const SNAP_RADIUS = 5; // pixels (em tela)
const CLOSE_THRESHOLD = 15; // pixels (em tela)
const HANDLE_RADIUS = 4;
const LINE_HIT_RADIUS = 7; // pixels

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return pointDistance(point, a);

  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq));
  return pointDistance(point, {
    x: a.x + t * dx,
    y: a.y + t * dy,
  });
}

function rectanglePoints(p0: Point, p1: Point): Point[] {
  return [
    { x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y) },
    { x: Math.max(p0.x, p1.x), y: Math.min(p0.y, p1.y) },
    { x: Math.max(p0.x, p1.x), y: Math.max(p0.y, p1.y) },
    { x: Math.min(p0.x, p1.x), y: Math.max(p0.y, p1.y) },
  ];
}

export default function Canvas2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Estado do desenho em andamento
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
  const pendingImageRef = useRef<{ imageId: string; lengthMm: number; confirmPoint: Point } | null>(null);
  const [refScalePopup, setRefScalePopup] = useState<{ imageId: string; lengthMm: number; screenX: number; screenY: number } | null>(null);
  const refScaleInputRef = useRef<HTMLInputElement>(null);

  // Store
  const project = useStore((s) => s.project);
  const toolMode = useStore((s) => s.toolMode);
  const viewport = useStore((s) => s.viewport);
  const setViewport = useStore((s) => s.setViewport);
  const selectedEntityIds = useStore((s) => s.selectedEntityIds);
  const selectEntity = useStore((s) => s.selectEntity);
  const setSelectedEntityIds = useStore((s) => s.setSelectedEntityIds);
  const addEntity = useStore((s) => s.addEntity);
  const addImage = useStore((s) => s.addImage);
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

  // Converte coordenadas tela -> mundo
  const screenToWorld = useCallback(
    (sx: number, sy: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (sx - rect.left - viewport.offsetX) / viewport.zoom,
        y: (sy - rect.top - viewport.offsetY) / viewport.zoom,
      };
    },
    [viewport],
  );

  // Snap no grid
  const snapToGrid = useCallback(
    (p: Point): Point => {
      const gridWorld = GRID_SIZE;
      return {
        x: Math.round(p.x / gridWorld) * gridWorld,
        y: Math.round(p.y / gridWorld) * gridWorld,
      };
    },
    [],
  );

  // Hit test em entidades
  const hitTestEntity = useCallback(
    (world: Point): string | null => {
      if (!project) return null;
      for (const entity of project.sketch.entities) {
        for (const pt of entity.points) {
          const dx = (pt.x - world.x) * viewport.zoom;
          const dy = (pt.y - world.y) * viewport.zoom;
          if (Math.sqrt(dx * dx + dy * dy) < HANDLE_RADIUS * 3) {
            return entity.id;
          }
        }
        for (let i = 0; i < entity.points.length; i++) {
          const a = entity.points[i];
          const b = entity.points[i + 1] ?? (entity.closed ? entity.points[0] : null);
          if (!b) continue;
          if (distanceToSegment(world, a, b) * viewport.zoom < LINE_HIT_RADIUS) {
            return entity.id;
          }
        }
      }
      return null;
    },
    [project, viewport],
  );

  const hitTestImage = useCallback(
    (world: Point): string | null => {
      if (!project?.sketch.images) return null;
      for (const img of project.sketch.images) {
        const hw = img.widthMm / 2;
        const hh = img.heightMm / 2;
        if (world.x >= img.x - hw && world.x <= img.x + hw &&
            world.y >= img.y - hh && world.y <= img.y + hh) {
          return img.id;
        }
      }
      return null;
    },
    [project],
  );

  const getHitId = useCallback(
    (world: Point): string | null => {
      return hitTestEntity(world) ?? hitTestImage(world);
    },
    [hitTestEntity, hitTestImage],
  );

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || e.button === 2) {
        // Middle or right click = pan
        isPanning.current = true;
        panStart.current = { x: e.clientX - viewport.offsetX, y: e.clientY - viewport.offsetY };
        return;
      }

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
              const hw = img.widthMm / 2;
              const hh = img.heightMm / 2;
              const handleSize = 6 / viewport.zoom * 3;
              const handles: { dx: number; dy: number; type: string }[] = [
                { dx: -hw, dy: -hh, type: "corner-tl" },
                { dx: 0,   dy: -hh, type: "edge-t" },
                { dx: hw,  dy: -hh, type: "corner-tr" },
                { dx: hw,  dy: 0,   type: "edge-r" },
                { dx: hw,  dy: hh,  type: "corner-br" },
                { dx: 0,   dy: hh,  type: "edge-b" },
                { dx: -hw, dy: 0,   type: "edge-l" },
                { dx: -hw, dy: hh,  type: "corner-bl" },
              ];
              const hitHandle = handles.find(
                (h) => Math.abs(world.x - (img.x + h.dx)) < handleSize && Math.abs(world.y - (img.y + h.dy)) < handleSize,
              );
              if (hitHandle) {
                isImageResizing.current = true;
                imageResizeId.current = imageId;
                imageResizeHandleType.current = hitHandle.type;
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
        isSelectDragging.current = true;
        selectDragStart.current = world;
        selectDragEnd.current = world;
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
    [screenToWorld, snapToGrid, toolMode, viewport, project, hitTestEntity, hitTestImage, selectEntity, addEntity, updateImage, setStatus, confirmPendingRectangle, selectedEntityIds, imageRefScaleMode, setImageRefScaleMode],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning.current) {
        setViewport({
          offsetX: e.clientX - panStart.current.x,
          offsetY: e.clientY - panStart.current.y,
        });
        return;
      }

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

      if (toolMode === "select" && isSelectDragging.current) {
        selectDragEnd.current = world;
        return;
      }

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
    [screenToWorld, snapToGrid, toolMode, setViewport, project, updateImage, imageRefScaleMode],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning.current) {
        isPanning.current = false;
        return;
      }

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

      if (toolMode === "select" && isSelectDragging.current) {
        isSelectDragging.current = false;
        const start = selectDragStart.current;
        const end = selectDragEnd.current;
        const screenDist = pointDistance(start, end) * viewport.zoom;

        if (screenDist < 5) {
          const hitId = hitTestEntity(start);
          selectEntity(hitId, e.shiftKey || false);
          if (hitId) {
            const nowSelected = useStore.getState().selectedEntityIds;
            if (e.shiftKey) {
              setStatus(nowSelected.includes(hitId) ? "Adicionado à seleção" : "Removido da seleção");
            } else {
              setStatus(`Selecionado: ${hitId}`);
            }
          } else {
            setStatus("Nada selecionado");
          }
        } else {
          const minX = Math.min(start.x, end.x);
          const maxX = Math.max(start.x, end.x);
          const minY = Math.min(start.y, end.y);
          const maxY = Math.max(start.y, end.y);

          const ids: string[] = [];
          if (project) {
            for (const entity of project.sketch.entities) {
              for (const pt of entity.points) {
                if (pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY) {
                  ids.push(entity.id);
                  break;
                }
              }
            }
          }

          if (e.shiftKey) {
            const current = new Set(useStore.getState().selectedEntityIds);
            for (const id of ids) current.add(id);
            setSelectedEntityIds(Array.from(current));
          } else {
            setSelectedEntityIds(ids);
          }
          setStatus(`${ids.length} entidade(s) selecionada(s) por área`);
        }
        return;
      }

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
    [toolMode, viewport, project, screenToWorld, hitTestEntity, selectEntity, setSelectedEntityIds, updateImage, setStatus, setImageRefScaleMode],
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

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(10, Math.max(0.1, viewport.zoom * factor));

      // Zoom no cursor
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      setViewport({
        zoom: newZoom,
        offsetX: mx - (mx - viewport.offsetX) * (newZoom / viewport.zoom),
        offsetY: my - (my - viewport.offsetY) * (newZoom / viewport.zoom),
      });
    },
    [viewport, setViewport],
  );

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const width = Math.max(1, Math.floor(container.clientWidth));
      const height = Math.max(1, Math.floor(container.clientHeight));

      if (canvas.width !== width) {
        canvas.width = width;
      }
      if (canvas.height !== height) {
        canvas.height = height;
      }
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(viewport.offsetX, viewport.offsetY);
      ctx.scale(viewport.zoom, viewport.zoom);

      // Grid
      const gridWorld = GRID_SIZE;
      const viewWidth = canvas.width / viewport.zoom;
      const viewHeight = canvas.height / viewport.zoom;
      const originX = -viewport.offsetX / viewport.zoom;
      const originY = -viewport.offsetY / viewport.zoom;

      const startX = Math.floor(originX / gridWorld) * gridWorld;
      const startY = Math.floor(originY / gridWorld) * gridWorld;

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1 / viewport.zoom;

      for (let x = startX; x < originX + viewWidth; x += gridWorld) {
        ctx.beginPath();
        ctx.moveTo(x, originY);
        ctx.lineTo(x, originY + viewHeight);
        ctx.stroke();
      }
      for (let y = startY; y < originY + viewHeight; y += gridWorld) {
        ctx.beginPath();
        ctx.moveTo(originX, y);
        ctx.lineTo(originX + viewWidth, y);
        ctx.stroke();
      }

      // Eixos
      ctx.strokeStyle = "rgba(255,100,100,0.5)";
      ctx.lineWidth = 2 / viewport.zoom;
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX + viewWidth, 0);
      ctx.stroke();

      ctx.strokeStyle = "rgba(100,255,100,0.5)";
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(0, originY + viewHeight);
      ctx.stroke();

      // Imagens (atras das entidades)
      if (project?.sketch.images) {
        for (const img of project.sketch.images) {
          const cache = imageCache.current;
          if (!cache.has(img.source)) {
            const el = new window.Image();
            el.src = img.source;
            el.onload = () => { cache.set(img.source, el); };
            cache.set(img.source, el);
          }
          const el = cache.get(img.source);
          if (!el || !el.complete || el.naturalWidth === 0) continue;

          const isSelected = selectedEntityIds.includes(img.id);
          ctx.save();
          ctx.globalAlpha = img.opacity;
          ctx.translate(img.x, img.y);
          ctx.scale(img.mirrorX ? -1 : 1, img.mirrorY ? -1 : 1);
          ctx.rotate((img.rotation * Math.PI) / 180);

          const hw = img.widthMm / 2;
          const hh = img.heightMm / 2;
          ctx.drawImage(el, -hw, -hh, img.widthMm, img.heightMm);
          ctx.restore();

          if (isSelected) {
            ctx.save();
            ctx.translate(img.x, img.y);
            ctx.strokeStyle = "#4fc3f7";
            ctx.lineWidth = 2 / viewport.zoom;
            ctx.setLineDash([4 / viewport.zoom, 3 / viewport.zoom]);
            ctx.strokeRect(-hw, -hh, img.widthMm, img.heightMm);
            ctx.setLineDash([]);

            const handleSz = 6 / viewport.zoom;
            const allHandles: Point[] = [
              { x: -hw, y: -hh }, { x: 0, y: -hh }, { x: hw, y: -hh },
              { x: hw, y: 0 },   { x: hw, y: hh },  { x: 0, y: hh },
              { x: -hw, y: hh }, { x: -hw, y: 0 },
            ];
            for (const c of allHandles) {
              const isCorner = Math.abs(c.x) === hw && Math.abs(c.y) === hh;
              ctx.fillStyle = isCorner ? "#4fc3f7" : "#ff9800";
              const sz = isCorner ? handleSz : handleSz * 0.7;
              ctx.fillRect(c.x - sz / 2, c.y - sz / 2, sz, sz);
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 0.5 / viewport.zoom;
              ctx.strokeRect(c.x - sz / 2, c.y - sz / 2, sz, sz);
            }

            if (isImageResizing.current && imageResizeId.current === img.id) {
              ctx.fillStyle = "rgba(255,255,255,0.72)";
              ctx.font = `bold ${12 / viewport.zoom}px monospace`;
              ctx.fillText(`${img.widthMm.toFixed(1)} x ${img.heightMm.toFixed(1)} mm`, 0, -hh - 8 / viewport.zoom);
            }
            ctx.restore();
          }
        }
      }

      // Linha de referencia (escala por referencia)
      if (imageRefLineStart.current && imageRefLineEnd.current) {
        ctx.strokeStyle = "#ff9800";
        ctx.lineWidth = 2 / viewport.zoom;
        ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);
        ctx.beginPath();
        ctx.moveTo(imageRefLineStart.current.x, imageRefLineStart.current.y);
        ctx.lineTo(imageRefLineEnd.current.x, imageRefLineEnd.current.y);
        ctx.stroke();
        ctx.setLineDash([]);
        const len = pointDistance(imageRefLineStart.current, imageRefLineEnd.current);
        ctx.fillStyle = "#ff9800";
        ctx.font = `bold ${13 / viewport.zoom}px monospace`;
        const midX = (imageRefLineStart.current.x + imageRefLineEnd.current.x) / 2;
        const midY = (imageRefLineStart.current.y + imageRefLineEnd.current.y) / 2;
        ctx.fillText(`${len.toFixed(1)} mm`, midX + 4 / viewport.zoom, midY - 4 / viewport.zoom);
      }

      if (refScalePopup) {
        const confirmPoint = { x: (refScalePopup.screenX - viewport.offsetX) / viewport.zoom, y: (refScalePopup.screenY - viewport.offsetY) / viewport.zoom };
        ctx.fillStyle = "#4caf50";
        ctx.beginPath();
        ctx.arc(confirmPoint.x, confirmPoint.y, 8 / viewport.zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      // Entidades
      if (project) {
        for (const entity of project.sketch.entities) {
          const isSelected = selectedEntityIds.includes(entity.id);

          ctx.strokeStyle = isSelected ? "#4fc3f7" : "#ffffff";
          ctx.lineWidth = isSelected ? 3 / viewport.zoom : 2 / viewport.zoom;
          ctx.fillStyle = "rgba(79, 195, 247, 0.1)";

          if (entity.points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(entity.points[0].x, entity.points[0].y);
            for (let i = 1; i < entity.points.length; i++) {
              ctx.lineTo(entity.points[i].x, entity.points[i].y);
            }
            if (entity.closed) {
              ctx.closePath();
              // Preenchimento semi-transparente para fechados
              ctx.fillStyle = "rgba(79, 195, 247, 0.08)";
              ctx.fill();
            }
            ctx.stroke();

            // Handles (pontos)
            for (const pt of entity.points) {
              ctx.fillStyle = isSelected ? "#4fc3f7" : "rgba(255,255,255,0.8)";
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, HANDLE_RADIUS / viewport.zoom, 0, Math.PI * 2);
              ctx.fill();
            }

            // Indicador de fechado
            if (entity.closed && entity.points.length > 0) {
              const first = entity.points[0];
              ctx.fillStyle = "#4caf50";
              ctx.beginPath();
              ctx.arc(first.x, first.y, (HANDLE_RADIUS + 2) / viewport.zoom, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Drawing preview
      if (isDrawing.current && drawingPoints.current.length > 0) {
        ctx.strokeStyle = "rgba(79, 195, 247, 0.6)";
        ctx.lineWidth = 2 / viewport.zoom;
        ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);

        if (toolMode === "rectangle" && drawingPoints.current.length === 2) {
          const [p0, p1] = drawingPoints.current;
          const [a, b, c, d] = rectanglePoints(p0, p1);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(c.x, c.y);
          ctx.lineTo(d.x, d.y);
          ctx.closePath();
          ctx.fillStyle = "rgba(79, 195, 247, 0.08)";
          ctx.fill();
          ctx.stroke();

          const width = Math.abs(p1.x - p0.x).toFixed(1);
          const height = Math.abs(p1.y - p0.y).toFixed(1);
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(255,255,255,0.72)";
          ctx.font = `${12 / viewport.zoom}px monospace`;
          ctx.fillText(`${width} x ${height} mm`, p1.x + 8 / viewport.zoom, p1.y - 8 / viewport.zoom);
        } else {
          ctx.beginPath();
          ctx.moveTo(drawingPoints.current[0].x, drawingPoints.current[0].y);
          for (let i = 1; i < drawingPoints.current.length; i++) {
            ctx.lineTo(drawingPoints.current[i].x, drawingPoints.current[i].y);
          }
          if (closeToStart.current) {
            ctx.closePath();
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Pontos do preview
        for (const pt of drawingPoints.current) {
          ctx.fillStyle = "rgba(79, 195, 247, 0.8)";
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, HANDLE_RADIUS / viewport.zoom, 0, Math.PI * 2);
          ctx.fill();
        }

        // Preview do snap se estiver perto do primeiro ponto
        if (drawingPoints.current.length >= 2) {
          const first = drawingPoints.current[0];
          const last = drawingPoints.current[drawingPoints.current.length - 1];
          const dist = pointDistance(last, first);
          const distScreen = dist * viewport.zoom;
          if (distScreen < CLOSE_THRESHOLD) {
            ctx.strokeStyle = "#4caf50";
            ctx.lineWidth = 2 / viewport.zoom;
            ctx.setLineDash([2 / viewport.zoom, 4 / viewport.zoom]);
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(first.x, first.y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = "#4caf50";
            ctx.beginPath();
            ctx.arc(first.x, first.y, (HANDLE_RADIUS + 4) / viewport.zoom, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      if (isSelectDragging.current) {
        const p0 = selectDragStart.current;
        const p1 = selectDragEnd.current;
        const [a, b, c, d] = rectanglePoints(p0, p1);
        ctx.strokeStyle = "rgba(79, 195, 247, 0.8)";
        ctx.fillStyle = "rgba(79, 195, 247, 0.08)";
        ctx.lineWidth = 1.5 / viewport.zoom;
        ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (pendingRectangle.current) {
        const { points, confirmPoint } = pendingRectangle.current;
        ctx.strokeStyle = "#4fc3f7";
        ctx.fillStyle = "rgba(79, 195, 247, 0.1)";
        ctx.lineWidth = 2 / viewport.zoom;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#4caf50";
        ctx.beginPath();
        ctx.arc(confirmPoint.x, confirmPoint.y, 8 / viewport.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5 / viewport.zoom;
        ctx.beginPath();
        ctx.moveTo(confirmPoint.x - 4 / viewport.zoom, confirmPoint.y);
        ctx.lineTo(confirmPoint.x - 1 / viewport.zoom, confirmPoint.y + 3 / viewport.zoom);
        ctx.lineTo(confirmPoint.x + 5 / viewport.zoom, confirmPoint.y - 4 / viewport.zoom);
        ctx.stroke();
      }

      // Texto de coordenadas no mundo
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = `${12 / viewport.zoom}px monospace`;
      ctx.fillText(`Grid: ${GRID_SIZE} mm`, 8 / viewport.zoom, 16 / viewport.zoom);

      ctx.restore();
    };

    let animId: number;
    const loop = () => {
      render();
      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, [project, viewport, selectedEntityIds, toolMode, refScalePopup, isDrawing.current, drawingPoints.current]);

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
        <div
          style={{
            position: "absolute",
            left: refScalePopup.screenX + 16,
            top: refScalePopup.screenY - 20,
            background: "#202024",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "8px 12px",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            minWidth: 200,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            Linha: <strong style={{ color: "#ff9800" }}>{refScalePopup.lengthMm.toFixed(2)} mm</strong>
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
              Tamanho real:
            </span>
            <input
              ref={refScaleInputRef}
              type="number"
              min={0.1}
              step={0.5}
              defaultValue={refScalePopup.lengthMm.toFixed(1)}
              style={{
                width: 80,
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                padding: "3px 6px",
                borderRadius: 4,
                fontSize: 12,
                outline: "none",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  const val = parseFloat((e.target as HTMLInputElement).value);
                  if (val > 0) {
                    const img = project?.sketch.images?.find((i) => i.id === refScalePopup.imageId);
                    if (img) {
                      const scale = val / refScalePopup.lengthMm;
                      updateImage(img.id, {
                        widthMm: img.widthMm * scale,
                        heightMm: img.heightMm * scale,
                      });
                      setStatus(`Imagem escalada: referência de ${refScalePopup.lengthMm.toFixed(2)} mm → ${val.toFixed(2)} mm`);
                    }
                    setRefScalePopup(null);
                    imageRefLineStart.current = null;
                    imageRefLineEnd.current = null;
                    setImageRefScaleMode(false);
                  }
                }
              }}
            />
            <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>mm</span>
          </div>
          <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
            Enter confirma · Escape cancela
          </span>
        </div>
      )}
    </div>
  );
}
