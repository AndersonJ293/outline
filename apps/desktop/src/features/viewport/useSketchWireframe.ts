import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { Entity, WorkingPlane } from "../../types";
import { sampleSpline } from "../sketch/spline";

// Half-width of the visible/clickable ribbon that stands in for the sketch
// line. A plain THREE.Line ignores `linewidth` on most GPU drivers (a known
// three.js limitation), so the line was effectively invisible — only the
// per-vertex dots showed up. A thin triangle-strip ribbon renders reliably
// everywhere and doubles as the raycast target.
const LINE_HALF_WIDTH = 0.5;

export function planePointToWorld(plane: WorkingPlane, x: number, y: number): THREE.Vector3 {
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

function worldPointToPlane2D(plane: WorkingPlane, v: THREE.Vector3): { x: number; y: number } {
  const [ox, oy, oz] = plane.origin;
  const [nx, ny, nz] = plane.normal;
  if (Math.abs(nz) > 0.9 || (nx === 0 && ny === 0 && nz === 0)) {
    return { x: v.x - ox, y: v.y - oy };
  }
  if (Math.abs(ny) > 0.9) {
    return { x: v.x - ox, y: v.z - oz };
  }
  return { x: v.y - oy, y: v.z - oz };
}

/// Builds a thin ribbon (triangle strip) in the working plane around the
/// path — used both as the visible sketch line and as the raycast target.
function buildRibbonGeometry(pts: { x: number; y: number }[], plane: WorkingPlane, closed: boolean): THREE.BufferGeometry | null {
  if (pts.length < 2) return null;
  const n = pts.length;
  const segCount = closed ? n : n - 1;
  if (segCount < 1) return null;

  const half = LINE_HALF_WIDTH;
  const normals2D: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      normals2D.push({ x: 0, y: 0 });
    } else {
      normals2D.push({ x: -dy / len, y: dx / len });
    }
  }

  const offsets: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (closed) {
      const a = normals2D[i];
      const b = normals2D[(i + 1) % n];
      const nx = a.x + b.x;
      const ny = a.y + b.y;
      const len = Math.hypot(nx, ny);
      offsets.push(len < 1e-6 ? { x: 0, y: 0 } : { x: (nx / len) * half, y: (ny / len) * half });
    } else {
      offsets.push({ x: normals2D[i].x * half, y: normals2D[i].y * half });
    }
  }

  const positions = new Float32Array(segCount * 6 * 3);
  let k = 0;
  for (let i = 0; i < segCount; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const offA = offsets[i];
    const offB = offsets[(i + 1) % n];
    const aPlus = planePointToWorld(plane, a.x + offA.x, a.y + offA.y);
    const aMinus = planePointToWorld(plane, a.x - offA.x, a.y - offA.y);
    const bPlus = planePointToWorld(plane, b.x + offB.x, b.y + offB.y);
    const bMinus = planePointToWorld(plane, b.x - offB.x, b.y - offB.y);

    positions[k++] = aPlus.x; positions[k++] = aPlus.y; positions[k++] = aPlus.z;
    positions[k++] = aMinus.x; positions[k++] = aMinus.y; positions[k++] = aMinus.z;
    positions[k++] = bPlus.x; positions[k++] = bPlus.y; positions[k++] = bPlus.z;

    positions[k++] = aMinus.x; positions[k++] = aMinus.y; positions[k++] = aMinus.z;
    positions[k++] = bMinus.x; positions[k++] = bMinus.y; positions[k++] = bMinus.z;
    positions[k++] = bPlus.x; positions[k++] = bPlus.y; positions[k++] = bPlus.z;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geo;
}

/// A spline's boundary is its sampled curve, not its (sparse) control
/// points; every other entity type already stores its full boundary in
/// `points`. Shared by the wireframe line and the profile fill mesh.
export function sketchEntityOutline(entity: Entity): { x: number; y: number }[] {
  return entity.type === "spline" && entity.controlPoints && entity.controlPoints.length > 0
    ? sampleSpline(entity.controlPoints, entity.samplingSteps ?? 44, entity.closed)
    : entity.points;
}

interface UseSketchWireframeArgs {
  entities: Entity[];
  sketchGroupRef: RefObject<THREE.Group | null>;
  workingPlane: WorkingPlane;
  /// Bumped when the Three.js scene/groups are recreated (e.g. StrictMode
  /// double-mount), forcing a rebuild against the current group references.
  sceneRevision?: number;
}

// Mirrors the 2D canvas' `displayPoints` choice (renderEntities.ts): a
// circle only shows its center, a spline shows control points, not every
// sampled curve point — otherwise a 96-gon circle renders as a ring of dots.
function buildVertexGeometry(entity: Entity, plane: WorkingPlane): THREE.BufferGeometry | null {
  const pts =
    entity.type === "circle" && entity.center
      ? [entity.center]
      : entity.type === "spline" && entity.controlPoints
        ? entity.controlPoints.map((cp) => cp.point)
        : entity.points;
  if (pts.length < 1) return null;
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

export function useSketchWireframe({ entities, sketchGroupRef, workingPlane, sceneRevision }: UseSketchWireframeArgs) {
  const lineMeshesRef = useRef<THREE.Mesh[]>([]);
  const pointsRef = useRef<THREE.Points[]>([]);

  useEffect(() => {
    const group = sketchGroupRef.current;
    if (!group) return;

    for (const mesh of lineMeshesRef.current) {
      group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    for (const pts of pointsRef.current) {
      group.remove(pts);
      pts.geometry.dispose();
      (pts.material as THREE.Material).dispose();
    }
    lineMeshesRef.current = [];
    pointsRef.current = [];

    for (const entity of entities) {
      if (entity.points.length < 2) continue;

      const pts = sketchEntityOutline(entity);
      const closed = entity.closed && entity.points.length > 2;

      const lineGeo = buildRibbonGeometry(pts, workingPlane, closed);
      if (lineGeo) {
        // Match the 2D sketch look: white lines, slightly transparent —
        // so the sketch reads the same in the 3D view.
        const lineMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.65,
          depthTest: false,
          side: THREE.DoubleSide,
        });
        const lineMesh = new THREE.Mesh(lineGeo, lineMat);
        lineMesh.userData.entityId = entity.id;
        lineMesh.renderOrder = 1;
        group.add(lineMesh);
        lineMeshesRef.current.push(lineMesh);
      }

      const vertGeo = buildVertexGeometry(entity, workingPlane);
      if (vertGeo) {
        const vertMat = new THREE.PointsMaterial({
          color: 0x4fc3f7,
          size: 6,
          sizeAttenuation: false,
          transparent: true,
          opacity: 0.9,
          depthTest: false,
        });
        const verts = new THREE.Points(vertGeo, vertMat);
        verts.userData.entityId = entity.id;
        verts.renderOrder = 2;
        group.add(verts);
        pointsRef.current.push(verts);
      }
    }

    return () => {
      for (const mesh of lineMeshesRef.current) {
        group.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      for (const pts of pointsRef.current) {
        group.remove(pts);
        pts.geometry.dispose();
        (pts.material as THREE.Material).dispose();
      }
      lineMeshesRef.current = [];
      pointsRef.current = [];
    };
  }, [entities, sketchGroupRef, workingPlane, sceneRevision]);
}
