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
  const hoveredRef = useRef<THREE.Mesh | null>(null);

  const clearHover = useCallback(() => {
    const mesh = hoveredRef.current;
    if (mesh) {
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      mat.emissive.setHex((mesh.userData.prevEmissive as number) ?? 0x000000);
      hoveredRef.current = null;
    }
  }, []);

  const handleFaceHover = useCallback(
    (e: MouseEvent) => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      const meshGroup = meshGroupRef.current;
      if (!container || !camera || !meshGroup) return;

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
      const hit = intersects[0]?.object as THREE.Mesh | undefined;

      if (hit !== hoveredRef.current) {
        clearHover();
        if (hit) {
          const mat = hit.material as THREE.MeshPhysicalMaterial;
          hit.userData.prevEmissive = mat.emissive.getHex();
          mat.emissive.setHex(0x335577);
          hoveredRef.current = hit;
        }
      }
      container.style.cursor = hit ? "pointer" : "";
    },
    [containerRef, cameraRef, meshGroupRef, clearHover],
  );

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

      clearHover();
      container.style.cursor = "";
      setWorkingPlane({
        origin: [point.x, point.y, point.z],
        normal: [normal.x, normal.y, normal.z],
      });
      setIsSketching(true);
      setFaceSelectionActive(false);
      setStatus("Sketching on selected face");
    },
    [containerRef, cameraRef, meshGroupRef, clearHover, setWorkingPlane, setIsSketching, setFaceSelectionActive, setStatus],
  );

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("click", handleFaceClick);
    container.addEventListener("pointermove", handleFaceHover);
    return () => {
      container.removeEventListener("click", handleFaceClick);
      container.removeEventListener("pointermove", handleFaceHover);
      clearHover();
      container.style.cursor = "";
    };
  }, [active, handleFaceClick, handleFaceHover, clearHover, containerRef]);

  return { active };
}
