import { useEffect, useRef, useCallback, type RefObject } from "react";
import * as THREE from "three";
import type { ExtrudeMode, Project } from "../../types";
import { generateId } from "../../types";

interface UseExtrudeToolArgs {
  active: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  cameraRef: RefObject<THREE.OrthographicCamera | null>;
  sketchGroupRef: RefObject<THREE.Group | null>;
  project: Project | null;
  extrudeMode: ExtrudeMode;
  wallHeight: number;
  wallThickness: number;
  offsetSide: "center" | "inside" | "outside";
  addOperation: (op: import("../../types").Operation) => void;
  setStatus: (text: string) => void;
  setError: (text: string | null) => void;
}

export function useExtrudeTool({
  active,
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
}: UseExtrudeToolArgs) {
  const raycasterRef = useRef(new THREE.Raycaster());
  const hoveredRef = useRef(false);

  const pickEntity = useCallback(
    (clientX: number, clientY: number): string | null => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      const group = sketchGroupRef.current;
      if (!container || !camera || !group) return null;

      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );

      const raycaster = raycasterRef.current;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(group.children, false);
      if (intersects.length === 0) return null;

      const hit = intersects[0];
      return (hit.object.userData as { entityId?: string }).entityId ?? null;
    },
    [containerRef, cameraRef, sketchGroupRef],
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!project) return;
      const entityId = pickEntity(e.clientX, e.clientY);
      if (!entityId) return;
      e.preventDefault();

      const entity = project.sketch.entities.find((ent) => ent.id === entityId);
      if (!entity) return;

      const isThin = extrudeMode === "thin";
      const isClosed =
        entity.closed &&
        ((entity.type !== "spline" && entity.points.length >= 3) ||
          (entity.type === "spline" && (entity.controlPoints?.length ?? 0) >= 3));
      // Thin extrude sweeps a wall along an open path, so it only needs a
      // line/contour with >= 2 points. Solid extrude still requires closure.
      const hasOpenPath =
        (entity.type === "spline"
          ? (entity.controlPoints?.length ?? 0) >= 2
          : entity.points.length >= 2);
      const canExtrude = isThin ? isClosed || hasOpenPath : isClosed;
      if (!canExtrude) {
        setError(
          isThin
            ? "Select a line or contour to thin-extrude."
            : "Cannot extrude an open contour. Close it first.",
        );
        return;
      }

      const opType = extrudeMode === "thin" ? "extrude_thin" : "extrude";
      const operation: import("../../types").Operation = {
        id: generateId(),
        type: opType,
        source_entity_id: entityId,
        operation: "new_body",
        height_mm: wallHeight,
        wall_thickness_mm: wallThickness,
        offset_side: offsetSide,
      };
      addOperation(operation);
      setError(null);
      setStatus(
        extrudeMode === "thin"
          ? `Thin wall extrude added (height=${wallHeight}mm, wall=${wallThickness}mm, offset=${offsetSide})`
          : `Solid extrude added (height=${wallHeight}mm)`,
      );
    },
    [
      pickEntity,
      project,
      extrudeMode,
      wallHeight,
      wallThickness,
      offsetSide,
      addOperation,
      setStatus,
      setError,
    ],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!active) return;
      const container = containerRef.current;
      if (!container) return;
      const entityId = pickEntity(e.clientX, e.clientY);
      const entity = entityId
        ? project?.sketch.entities.find((e) => e.id === entityId)
        : null;
      const isThin = extrudeMode === "thin";
      const isClosed = entity
        ? entity.closed &&
          ((entity.type !== "spline" && entity.points.length >= 3) ||
            (entity.type === "spline" && (entity.controlPoints?.length ?? 0) >= 3))
        : false;
      const hasOpenPath = entity
        ? entity.type === "spline"
          ? (entity.controlPoints?.length ?? 0) >= 2
          : entity.points.length >= 2
        : false;
      const canExtrude = isThin ? isClosed || hasOpenPath : isClosed;
      if (canExtrude && !hoveredRef.current) {
        hoveredRef.current = true;
        container.style.cursor = "crosshair";
      } else if (!canExtrude && hoveredRef.current) {
        hoveredRef.current = false;
        container.style.cursor = "";
      }
    },
    [active, containerRef, pickEntity, project, extrudeMode],
  );

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove);
    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handlePointerMove);
      container.style.cursor = "";
      hoveredRef.current = false;
    };
  }, [active, handlePointerDown, handlePointerMove, containerRef]);

  return { active };
}
