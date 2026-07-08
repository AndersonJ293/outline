import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { Entity, SketchProfile, WorkingPlane } from "../../types";
import { planePointToWorld, sketchEntityOutline } from "./useSketchWireframe";

// Fusion tints a closed profile with a faint blue fill whenever it's
// selectable (extrude active) and brightens it on hover — this mirrors that.
export const PROFILE_BASE_OPACITY = 0.08;
export const PROFILE_HOVER_OPACITY = 0.32;

interface UseProfileFacesArgs {
  profiles: SketchProfile[];
  entities: Entity[];
  sketchGroupRef: RefObject<THREE.Group | null>;
  workingPlane: WorkingPlane;
  sceneRevision?: number;
}

/// Builds a filled, raycastable mesh per resolved sketch profile — lets the
/// extrude tool (and 3D entity picking) hit the interior of a closed region,
/// not just its boundary curve, matching Fusion's profile selection. The
/// faint tint is always on (like the 2D sketch canvas' own profile fill),
/// not just while the extrude tool is active — only the hover brighten is
/// tool-gated (handled by useExtrudeTool).
export function useProfileFaces({
  profiles,
  entities,
  sketchGroupRef,
  workingPlane,
  sceneRevision,
}: UseProfileFacesArgs) {
  const meshesRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    const group = sketchGroupRef.current;
    if (!group) return;

    for (const mesh of meshesRef.current) {
      group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    meshesRef.current = [];

    for (const profile of profiles) {
      const outer = entities.find((e) => e.id === profile.outerEntityId);
      if (!outer) continue;
      const outerPts = sketchEntityOutline(outer);
      if (outerPts.length < 3) continue;

      const shape = new THREE.Shape(outerPts.map((p) => new THREE.Vector2(p.x, p.y)));
      if (profile.innerEntityId) {
        const inner = entities.find((e) => e.id === profile.innerEntityId);
        const innerPts = inner ? sketchEntityOutline(inner) : [];
        if (innerPts.length >= 3) {
          shape.holes.push(new THREE.Path(innerPts.map((p) => new THREE.Vector2(p.x, p.y))));
        }
      }

      const geometry = new THREE.ShapeGeometry(shape);
      const position = geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) {
        const v = planePointToWorld(workingPlane, position.getX(i), position.getY(i));
        position.setXYZ(i, v.x, v.y, v.z);
      }
      position.needsUpdate = true;

      const material = new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: PROFILE_BASE_OPACITY,
        depthTest: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.entityId = profile.outerEntityId;
      mesh.userData.profileId = profile.id;
      mesh.userData.isProfileFace = true;
      mesh.userData.baseOpacity = PROFILE_BASE_OPACITY;
      mesh.renderOrder = 0.5;
      group.add(mesh);
      meshesRef.current.push(mesh);
    }

    return () => {
      for (const mesh of meshesRef.current) {
        group.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      meshesRef.current = [];
    };
  }, [profiles, entities, sketchGroupRef, workingPlane, sceneRevision]);
}
