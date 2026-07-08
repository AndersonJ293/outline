import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { SketchImage, WorkingPlane } from "../../types";
import { planePointToWorld } from "./useSketchWireframe";

interface UseSketchImagesArgs {
  images: SketchImage[];
  sketchGroupRef: RefObject<THREE.Group | null>;
  workingPlane: WorkingPlane;
  sceneRevision?: number;
}

/// Reference images live on the working plane just like sketch entities —
/// Fusion shows them identically inside and outside the sketch, so this
/// mirrors renderImages.ts (2D canvas) as textured planes in the 3D scene.
export function useSketchImages({ images, sketchGroupRef, workingPlane, sceneRevision }: UseSketchImagesArgs) {
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const loaderRef = useRef(new THREE.TextureLoader());

  useEffect(() => {
    const group = sketchGroupRef.current;
    if (!group) return;

    for (const mesh of meshesRef.current) {
      group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.MeshBasicMaterial).map?.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    meshesRef.current = [];

    const center = planePointToWorld(workingPlane, 0, 0);
    const px = planePointToWorld(workingPlane, 1, 0);
    const py = planePointToWorld(workingPlane, 0, 1);
    const xAxis = px.clone().sub(center).normalize();
    const yAxis = py.clone().sub(center).normalize();
    const zAxis = xAxis.clone().cross(yAxis).normalize();
    const planeQuaternion = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis),
    );

    for (const img of images) {
      const geometry = new THREE.PlaneGeometry(img.widthMm, img.heightMm);
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: img.opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(planePointToWorld(workingPlane, img.x, img.y));
      mesh.quaternion.copy(planeQuaternion);
      mesh.rotateZ((img.rotation * Math.PI) / 180);
      mesh.scale.set(img.mirrorX ? -1 : 1, img.mirrorY ? -1 : 1, 1);
      mesh.renderOrder = 0;
      mesh.userData.imageId = img.id;

      loaderRef.current.load(img.source, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.needsUpdate = true;
      });

      group.add(mesh);
      meshesRef.current.push(mesh);
    }

    return () => {
      for (const mesh of meshesRef.current) {
        group.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.MeshBasicMaterial).map?.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      meshesRef.current = [];
    };
  }, [images, sketchGroupRef, workingPlane, sceneRevision]);
}
