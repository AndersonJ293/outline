import { useRef, useEffect, useCallback } from "react";
import { useStore } from "../stores/useStore";
import type { Point, Entity, ToolMode } from "../types";
import { generateId, pointDistance } from "../types";

const GRID_SIZE = 10; // mm
const SNAP_RADIUS = 5; // pixels (em tela)
const CLOSE_THRESHOLD = 15; // pixels (em tela)
const HANDLE_RADIUS = 4;

export default function Canvas2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Estado do desenho em andamento
  const drawingPoints = useRef<Point[]>([]);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const closeToStart = useRef(false);

  // Store
  const project = useStore((s) => s.project);
  const toolMode = useStore((s) => s.toolMode);
  const viewport = useStore((s) => s.viewport);
  const setViewport = useStore((s) => s.setViewport);
  const currentEntityId = useStore((s) => s.currentEntityId);
  const selectEntity = useStore((s) => s.selectEntity);
  const addEntity = useStore((s) => s.addEntity);
  const setStatus = useStore((s) => s.setStatus);

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
      }
      return null;
    },
    [project, viewport],
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

      if (toolMode === "select") {
        const hitId = hitTestEntity(world);
        selectEntity(hitId);
        if (hitId) setStatus(`Selecionado: ${hitId}`);
        else setStatus("Nada selecionado");
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
              entity_type: "polyline",
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
    [screenToWorld, snapToGrid, toolMode, viewport, project, hitTestEntity, selectEntity, addEntity, setStatus],
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

      if (toolMode === "polyline" && isDrawing.current) {
        // Apenas atualiza cursor, o drawing preview é feito no render
      }

      // Mouse hover snap feedback
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = toolMode === "select" ? "default" : "crosshair";
      }
    },
    [screenToWorld, snapToGrid, toolMode, setViewport],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning.current) {
        isPanning.current = false;
        return;
      }

      if (toolMode === "rectangle" && isDrawing.current) {
        const points = drawingPoints.current;
        if (points.length === 2) {
          const p0 = points[0];
          const p1 = points[1];
          const entity: Entity = {
            id: generateId(),
            entity_type: "rectangle",
            points: [
              { x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y) },
              { x: Math.max(p0.x, p1.x), y: Math.min(p0.y, p1.y) },
              { x: Math.max(p0.x, p1.x), y: Math.max(p0.y, p1.y) },
              { x: Math.min(p0.x, p1.x), y: Math.max(p0.y, p1.y) },
            ],
            closed: true,
          };
          addEntity(entity);
          setStatus(`Retângulo: ${Math.abs(p1.x - p0.x).toFixed(1)} x ${Math.abs(p1.y - p0.y).toFixed(1)} mm`);
        }
        isDrawing.current = false;
      }
    },
    [toolMode, addEntity, setStatus],
  );

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
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
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

      // Entidades
      if (project) {
        for (const entity of project.sketch.entities) {
          const isSelected = entity.id === currentEntityId;

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

      // Drawing preview (polyline em andamento)
      if (isDrawing.current && drawingPoints.current.length > 0) {
        ctx.strokeStyle = "rgba(79, 195, 247, 0.6)";
        ctx.lineWidth = 2 / viewport.zoom;
        ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);
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
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, [project, viewport, currentEntityId, isDrawing.current, drawingPoints.current]);

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
    </div>
  );
}
