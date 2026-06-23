import { useEffect, useRef, useCallback, type RefObject } from "react";
import * as THREE from "three";
import type { Point, WorkingPlane } from "../../types";

interface UseEntity3DSelectArgs {
  active: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  cameraRef: RefObject<THREE.OrthographicCamera | null>;
  sketchGroupRef: RefObject<THREE.Group | null>;
  workingPlane: WorkingPlane;
  selectEntity: (id: string | null, shiftKey?: boolean) => void;
  translateEntity: (
    id: string,
    dx: number,
    dy: number,
    options?: { pushUndo?: boolean; alreadyPushed?: boolean },
  ) => void;
  setStatus: (text: string) => void;
}

/// Projects a 3D world point onto the working plane, returning 2D coordinates
/// in the plane's local space (the same space entities are stored in).
function worldToPlane(plane: WorkingPlane, world: THREE.Vector3): Point {
  const [ox, oy, oz] = plane.origin;
  const [nx, ny, nz] = plane.normal;
  const v = new THREE.Vector3(world.x - ox, world.y - oy, world.z - oz);
  if (Math.abs(nz) > 0.9 || (nx === 0 && ny === 0 && nz === 0)) {
    return { x: v.x, y: v.y };
  }
  if (Math.abs(ny) > 0.9) {
    return { x: v.x, y: v.z };
  }
  return { x: v.y, y: v.z };
}

export function useEntity3DSelect({
  active,
  containerRef,
  cameraRef,
  sketchGroupRef,
  workingPlane,
  selectEntity,
  translateEntity,
  setStatus,
}: UseEntity3DSelectArgs) {
  const raycasterRef = useRef(new THREE.Raycaster());
  const dragStateRef = useRef<{
    entityId: string;
    startWorld: THREE.Vector3;
    startPoint: Point;
  } | null>(null);

  const pickEntity = useCallback(
    (clientX: number, clientY: number): { entityId: string; world: THREE.Vector3 } | null => {
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
      raycaster.params.Line = { threshold: 0.6 };
      const intersects = raycaster.intersectObjects(group.children, false);
      if (intersects.length === 0) return null;

      const hit = intersects[0];
      const entityId = (hit.object.userData as { entityId?: string }).entityId;
      if (!entityId) return null;
      return { entityId, world: hit.point.clone() };
    },
    [containerRef, cameraRef, sketchGroupRef],
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.button !== 0) return;
      const pick = pickEntity(e.clientX, e.clientY);
      if (!pick) return;
      const startPoint = worldToPlane(workingPlane, pick.world);
      selectEntity(pick.entityId, e.shiftKey);
      dragStateRef.current = {
        entityId: pick.entityId,
        startWorld: pick.world,
        startPoint,
      };
      e.preventDefault();
    },
    [pickEntity, workingPlane, selectEntity],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
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

      const plane = new THREE.Plane(
        new THREE.Vector3(...workingPlane.normal).normalize(),
        -new THREE.Vector3(...workingPlane.origin).dot(
          new THREE.Vector3(...workingPlane.normal).normalize(),
        ),
      );
      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, hit)) return;

      const current = worldToPlane(workingPlane, hit);
      const dx = current.x - drag.startPoint.x;
      const dy = current.y - drag.startPoint.y;
      if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return;
      translateEntity(drag.entityId, dx, dy, { pushUndo: false });
      drag.startPoint = current;
    },
    [containerRef, cameraRef, workingPlane, translateEntity],
  );

  const handlePointerUp = useCallback(
    (_e: PointerEvent) => {
      if (!dragStateRef.current) return;
      const { entityId } = dragStateRef.current;
      dragStateRef.current = null;
      setStatus(`Entity moved`);
    },
    [setStatus],
  );

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [active, handlePointerDown, handlePointerMove, handlePointerUp, containerRef]);

  return { active };
}
