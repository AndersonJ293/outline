import { useEffect, useRef, useCallback, type RefObject } from "react";
import * as THREE from "three";
import type { WorkingPlane } from "../../types";

interface UseFaceSelectionArgs {
  active: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  cameraRef: RefObject<THREE.OrthographicCamera | null>;
  meshGroupRef: RefObject<THREE.Group | null>;
  setWorkingPlane: (plane: WorkingPlane) => void;
  setIsSketching: (on: boolean) => void;
  setFaceSelectionActive: (on: boolean) => void;
  setStatus: (text: string) => void;
}

export function useFaceSelection({
  active,
  containerRef,
  cameraRef,
  meshGroupRef,
  setWorkingPlane,
  setIsSketching,
  setFaceSelectionActive,
  setStatus,
}: UseFaceSelectionArgs) {
  const raycasterRef = useRef(new THREE.Raycaster());

  const handleFaceClick = useCallback(
    (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const camera = cameraRef.current;
      const meshGroup = meshGroupRef.current;
      if (!camera || !meshGroup) return;

      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      const raycaster = raycasterRef.current;
      raycaster.setFromCamera(mouse, camera);
      const meshes: THREE.Mesh[] = [];
      meshGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) meshes.push(child);
      });

      const intersects = raycaster.intersectObjects(meshes, false);
      if (intersects.length === 0) return;

      const hit = intersects[0];
      const normal = hit.face?.normal.clone();
      if (!normal) return;

      normal.transformDirection(hit.object.matrixWorld).normalize();
      const point = hit.point.clone();

      setWorkingPlane({
        origin: [point.x, point.y, point.z],
        normal: [normal.x, normal.y, normal.z],
      });
      setIsSketching(true);
      setFaceSelectionActive(false);
      setStatus("Sketching on selected face");
    },
    [containerRef, cameraRef, meshGroupRef, setWorkingPlane, setIsSketching, setFaceSelectionActive, setStatus],
  );

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("click", handleFaceClick);
    return () => container.removeEventListener("click", handleFaceClick);
  }, [active, handleFaceClick]);

  return { active };
}
