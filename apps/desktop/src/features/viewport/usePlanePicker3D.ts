import { useEffect, useRef, useCallback, type RefObject } from "react";
import * as THREE from "three";
import type { WorkingPlane } from "../../types";

interface UsePlanePicker3DArgs {
  active: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  cameraRef: RefObject<THREE.OrthographicCamera | null>;
  sceneRef: RefObject<THREE.Scene | null>;
  setWorkingPlane: (plane: WorkingPlane) => void;
  setIsSketching: (on: boolean) => void;
  setShowPlanePicker: (on: boolean) => void;
  setStatus: (text: string) => void;
}

interface PlaneDef {
  label: string;
  normal: [number, number, number];
  color: number;
}

const PLANE_DEFS: PlaneDef[] = [
  { label: "XY", normal: [0, 0, 1], color: 0x4fc3f7 },
  { label: "XZ", normal: [0, 1, 0], color: 0xf4c542 },
  { label: "YZ", normal: [1, 0, 0], color: 0xe57373 },
];

const PLANE_SIZE = 30;

function createPlaneMesh(def: PlaneDef): THREE.Mesh {
  const [nx, ny, nz] = def.normal;
  const geometry = new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE);
  const material = new THREE.MeshBasicMaterial({
    color: def.color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = { planeDef: def };

  if (Math.abs(nz) > 0.9) {
    // XY plane: no rotation needed (plane is XY-aligned by default)
  } else if (Math.abs(ny) > 0.9) {
    // XZ plane: rotate around X axis
    mesh.rotation.x = -Math.PI / 2;
  } else {
    // YZ plane: rotate around Y axis
    mesh.rotation.y = Math.PI / 2;
  }

  return mesh;
}

export function usePlanePicker3D({
  active,
  containerRef,
  cameraRef,
  sceneRef,
  setWorkingPlane,
  setIsSketching,
  setShowPlanePicker,
  setStatus,
}: UsePlanePicker3DArgs) {
  const planesRef = useRef<THREE.Mesh[]>([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const hoveredRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (active) {
      const meshes: THREE.Mesh[] = [];
      for (const def of PLANE_DEFS) {
        const mesh = createPlaneMesh(def);
        scene.add(mesh);
        meshes.push(mesh);
      }
      planesRef.current = meshes;
      setStatus("Click a plane or press Esc to cancel");
    }

    return () => {
      for (const mesh of planesRef.current) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      planesRef.current = [];
    };
  }, [active, sceneRef, setStatus]);

  const handleMove = useCallback(
    (e: MouseEvent) => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      if (!container || !camera) return;

      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      const raycaster = raycasterRef.current;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(planesRef.current, false);

      if (hoveredRef.current) {
        const mat = (hoveredRef.current.material as THREE.MeshBasicMaterial);
        mat.opacity = 0.25;
        hoveredRef.current = null;
      }

      if (hits.length > 0) {
        const hit = hits[0].object as THREE.Mesh;
        const mat = (hit.material as THREE.MeshBasicMaterial);
        mat.opacity = 0.5;
        hoveredRef.current = hit;
        container.style.cursor = "pointer";
      } else {
        container.style.cursor = "";
      }
    },
    [containerRef, cameraRef],
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      if (!container || !camera) return;

      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      const raycaster = raycasterRef.current;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(planesRef.current, false);

      if (hits.length > 0) {
        const hit = hits[0].object as THREE.Mesh;
        const def = hit.userData.planeDef as PlaneDef;
        if (def) {
          setWorkingPlane({
            origin: [0, 0, 0],
            normal: def.normal,
          });
          setIsSketching(true);
          setShowPlanePicker(false);
          setStatus(`Sketching on ${def.label} plane`);
        }
      }
    },
    [containerRef, cameraRef, setWorkingPlane, setIsSketching, setShowPlanePicker, setStatus],
  );

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPlanePicker(false);
        setStatus("Ready");
      }
    };
    window.addEventListener("keydown", onKey);

    container.addEventListener("mousemove", handleMove);
    container.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      container.removeEventListener("mousemove", handleMove);
      container.removeEventListener("click", handleClick);
    };
  }, [active, handleMove, handleClick, setShowPlanePicker, setStatus]);

  return {};
}
