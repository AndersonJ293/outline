import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { Entity, WorkingPlane } from "../../types";
import { sampleSpline } from "../sketch/spline";

function planePointToWorld(plane: WorkingPlane, x: number, y: number): THREE.Vector3 {
  const [ox, oy, oz] = plane.origin;
  const [nx, ny, nz] = plane.normal;
  if (Math.abs(nz) > 0.9 || (nx === 0 && ny === 0 && nz === 0)) {
    return new THREE.Vector3(ox + x, oy + y, oz);
  }
  if (Math.abs(ny) > 0.9) {
    return new THREE.Vector3(ox + x, oy, oz + y);
  }
  return new THREE.Vector3(ox, oy + x, oz + y);
}

function buildEntityGeometry(entity: Entity, plane: WorkingPlane): THREE.BufferGeometry | null {
  if (entity.points.length < 2) return null;

  let pts: { x: number; y: number }[];

  if (entity.type === "spline" && entity.controlPoints && entity.controlPoints.length > 0) {
    const sampled = sampleSpline(
      entity.controlPoints,
      entity.samplingSteps ?? 44,
      entity.closed,
    );
    pts = sampled;
  } else {
    pts = entity.points;
  }

  const positions = new Float32Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    const v = planePointToWorld(plane, pts[i].x, pts[i].y);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geo;
}

interface UseSketchWireframeArgs {
  entities: Entity[];
  sketchGroupRef: RefObject<THREE.Group | null>;
  workingPlane: WorkingPlane;
}

export function useSketchWireframe({ entities, sketchGroupRef, workingPlane }: UseSketchWireframeArgs) {
  const linesRef = useRef<THREE.Line[]>([]);

  useEffect(() => {
    const group = sketchGroupRef.current;
    if (!group) return;

    for (const line of linesRef.current) {
      group.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    linesRef.current = [];

    for (const entity of entities) {
      const geometry = buildEntityGeometry(entity, workingPlane);
      if (!geometry) continue;

      const material = new THREE.LineBasicMaterial({
        color: 0xf4c542,
        linewidth: 1,
        transparent: true,
        opacity: 0.9,
      });

      const closed = entity.closed && entity.points.length > 2;
      const line = closed
        ? new THREE.LineLoop(geometry, material)
        : new THREE.Line(geometry, material);
      group.add(line);
      linesRef.current.push(line);
    }

    return () => {
      for (const line of linesRef.current) {
        group.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
      linesRef.current = [];
    };
  }, [entities, sketchGroupRef, workingPlane]);
}
