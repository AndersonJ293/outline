import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { Entity, WorkingPlane } from "../../types";
import { sampleSpline } from "../sketch/spline";

const HIT_HALF_WIDTH = 0.8;

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

/// Builds a thin ribbon (triangle strip) in the working plane around the
/// polyline. Visible only as a raycast target — `material.visible = false`
/// on the mesh that uses it.
function buildHitGeometry(pts: { x: number; y: number }[], plane: WorkingPlane, closed: boolean): THREE.BufferGeometry | null {
  if (pts.length < 2) return null;
  const n = pts.length;
  const segCount = closed ? n : n - 1;
  if (segCount < 1) return null;

  const half = HIT_HALF_WIDTH;
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

interface UseSketchWireframeArgs {
  entities: Entity[];
  sketchGroupRef: RefObject<THREE.Group | null>;
  workingPlane: WorkingPlane;
  /// Bumped when the Three.js scene/groups are recreated (e.g. StrictMode
  /// double-mount), forcing a rebuild against the current group references.
  sceneRevision?: number;
}

function buildVertexGeometry(entity: Entity, plane: WorkingPlane): THREE.BufferGeometry | null {
  if (entity.points.length < 1) return null;
  const positions = new Float32Array(entity.points.length * 3);
  for (let i = 0; i < entity.points.length; i++) {
    const v = planePointToWorld(plane, entity.points[i].x, entity.points[i].y);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geo;
}

export function useSketchWireframe({ entities, sketchGroupRef, workingPlane, sceneRevision }: UseSketchWireframeArgs) {
  const linesRef = useRef<THREE.Line[]>([]);
  const hitMeshesRef = useRef<THREE.Mesh[]>([]);
  const pointsRef = useRef<THREE.Points[]>([]);

  useEffect(() => {
    const group = sketchGroupRef.current;
    if (!group) return;

    for (const line of linesRef.current) {
      group.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    for (const mesh of hitMeshesRef.current) {
      group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    for (const pts of pointsRef.current) {
      group.remove(pts);
      pts.geometry.dispose();
      (pts.material as THREE.Material).dispose();
    }
    linesRef.current = [];
    hitMeshesRef.current = [];
    pointsRef.current = [];

    for (const entity of entities) {
      const geometry = buildEntityGeometry(entity, workingPlane);
      if (!geometry) continue;

      // Match the 2D sketch look: white lines, slightly transparent, with
      // visible vertices — so the sketch reads the same in the 3D view.
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 1,
        transparent: true,
        opacity: 0.65,
        depthTest: false,
      });

      const closed = entity.closed && entity.points.length > 2;
      const line = closed
        ? new THREE.LineLoop(geometry, material)
        : new THREE.Line(geometry, material);
      line.userData.entityId = entity.id;
      line.renderOrder = 1;
      group.add(line);
      linesRef.current.push(line);

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

      const pts =
        entity.type === "spline" && entity.controlPoints && entity.controlPoints.length > 0
          ? sampleSpline(entity.controlPoints, entity.samplingSteps ?? 44, entity.closed)
          : entity.points;
      const hitGeo = buildHitGeometry(pts, workingPlane, closed);
      if (hitGeo) {
        const hitMat = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const hitMesh = new THREE.Mesh(hitGeo, hitMat);
        hitMesh.userData.entityId = entity.id;
        group.add(hitMesh);
        hitMeshesRef.current.push(hitMesh);
      }
    }

    return () => {
      for (const line of linesRef.current) {
        group.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
      for (const mesh of hitMeshesRef.current) {
        group.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      for (const pts of pointsRef.current) {
        group.remove(pts);
        pts.geometry.dispose();
        (pts.material as THREE.Material).dispose();
      }
      linesRef.current = [];
      hitMeshesRef.current = [];
      pointsRef.current = [];
    };
  }, [entities, sketchGroupRef, workingPlane, sceneRevision]);
}
