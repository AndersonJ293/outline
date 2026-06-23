import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { Entity } from "../../types";
import { sampleSpline } from "../sketch/spline";

function buildEntityGeometry(entity: Entity): THREE.BufferGeometry | null {
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
    positions[i * 3] = pts[i].x;
    positions[i * 3 + 1] = pts[i].y;
    positions[i * 3 + 2] = 0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geo;
}

interface UseSketchWireframeArgs {
  entities: Entity[];
  sketchGroupRef: RefObject<THREE.Group | null>;
}

export function useSketchWireframe({ entities, sketchGroupRef }: UseSketchWireframeArgs) {
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
      const geometry = buildEntityGeometry(entity);
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
  }, [entities, sketchGroupRef]);
}
