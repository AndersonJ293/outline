import { useEffect, useRef, useCallback, useState, type RefObject } from "react";
import * as THREE from "three";
import type { ExtrudeMode, Project } from "../../types";
import { generateId } from "../../types";
import { PROFILE_HOVER_OPACITY } from "./useProfileFaces";
import type { ExtrudePopupState } from "../../components/ExtrudePopup";

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
  setWallHeight: (h: number) => void;
  setWallThickness: (t: number) => void;
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
  setWallHeight,
  setWallThickness,
  setStatus,
  setError,
}: UseExtrudeToolArgs) {
  const raycasterRef = useRef(new THREE.Raycaster());
  const hoveredRef = useRef(false);
  const hoveredFaceRef = useRef<THREE.Mesh | null>(null);
  const popupNonceRef = useRef(0);
  const [pendingExtrude, setPendingExtrude] = useState<ExtrudePopupState | null>(null);

  const pickHit = useCallback(
    (clientX: number, clientY: number): THREE.Intersection | null => {
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
      return intersects.length > 0 ? intersects[0] : null;
    },
    [containerRef, cameraRef, sketchGroupRef],
  );

  const clearHoverHighlight = useCallback(() => {
    const mesh = hoveredFaceRef.current;
    if (!mesh) return;
    (mesh.material as THREE.MeshBasicMaterial).opacity = (mesh.userData.baseOpacity as number) ?? 0;
    hoveredFaceRef.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!project) return;
      const container = containerRef.current;
      const hit = pickHit(e.clientX, e.clientY);
      const entityId = (hit?.object.userData as { entityId?: string } | undefined)?.entityId;
      if (!container || !entityId) return;
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

      const rect = container.getBoundingClientRect();
      setPendingExtrude({
        entityId,
        screenX: e.clientX - rect.left,
        screenY: e.clientY - rect.top,
        mode: extrudeMode,
        height: wallHeight,
        thickness: wallThickness,
        nonce: ++popupNonceRef.current,
      });
      setError(null);
      setStatus("Extrude: enter height");
    },
    [pickHit, project, extrudeMode, wallHeight, wallThickness, containerRef, setStatus, setError],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!active) return;
      const container = containerRef.current;
      if (!container) return;
      const hit = pickHit(e.clientX, e.clientY);
      const entityId = (hit?.object.userData as { entityId?: string } | undefined)?.entityId ?? null;
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

      const faceMesh =
        canExtrude && (hit?.object as THREE.Mesh | undefined)?.userData.isProfileFace
          ? (hit!.object as THREE.Mesh)
          : null;
      if (faceMesh !== hoveredFaceRef.current) {
        clearHoverHighlight();
        if (faceMesh) {
          (faceMesh.material as THREE.MeshBasicMaterial).opacity = PROFILE_HOVER_OPACITY;
          hoveredFaceRef.current = faceMesh;
        }
      }
    },
    [active, containerRef, pickHit, project, extrudeMode, clearHoverHighlight],
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
      clearHoverHighlight();
    };
  }, [active, handlePointerDown, handlePointerMove, containerRef, clearHoverHighlight]);

  useEffect(() => {
    if (!active && pendingExtrude) setPendingExtrude(null);
  }, [active, pendingExtrude]);

  const confirmExtrude = useCallback(
    (height: number, thickness?: number) => {
      if (!pendingExtrude) return;
      setWallHeight(height);
      if (pendingExtrude.mode === "thin" && thickness !== undefined) setWallThickness(thickness);

      const opType = pendingExtrude.mode === "thin" ? "extrude_thin" : "extrude";
      addOperation({
        id: generateId(),
        type: opType,
        source_entity_id: pendingExtrude.entityId,
        operation: "new_body",
        height_mm: height,
        wall_thickness_mm: thickness ?? wallThickness,
        offset_side: offsetSide,
      });
      setPendingExtrude(null);
      setStatus(
        pendingExtrude.mode === "thin"
          ? `Thin wall extrude added (height=${height}mm, wall=${thickness ?? wallThickness}mm, offset=${offsetSide})`
          : `Solid extrude added (height=${height}mm)`,
      );
    },
    [pendingExtrude, addOperation, offsetSide, wallThickness, setWallHeight, setWallThickness, setStatus],
  );

  const cancelExtrude = useCallback(() => {
    setPendingExtrude(null);
    setStatus("Extrude canceled");
  }, [setStatus]);

  return { active, pendingExtrude, confirmExtrude, cancelExtrude };
}
