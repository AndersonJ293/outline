import * as THREE from "three";

// Groups a mesh's triangles into planar faces by flood-filling across shared
// edges wherever the neighboring triangle's normal matches exactly (within
// float epsilon). A flat wall (built from 2+ coplanar triangles) becomes one
// group; a curved wall (each triangle at a slightly different angle from its
// neighbor, e.g. a circle's side) never merges, so every triangle stays its
// own singleton group — this is what makes flat walls selectable and curved
// ones not, matching Fusion's face-picking restriction.
const COPLANAR_DOT = 0.99999;

export interface FaceGroups {
  /** triangle index -> face group id */
  triangleFaceId: Int32Array;
  /** face group id -> triangle indices */
  groups: number[][];
}

export function computeFaceGroups(geometry: THREE.BufferGeometry): FaceGroups {
  const index = geometry.getIndex();
  const position = geometry.getAttribute("position");
  if (!index) throw new Error("computeFaceGroups requires an indexed geometry");
  const triCount = index.count / 3;

  const normals: THREE.Vector3[] = new Array(triCount);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < triCount; t++) {
    a.fromBufferAttribute(position, index.getX(t * 3));
    b.fromBufferAttribute(position, index.getX(t * 3 + 1));
    c.fromBufferAttribute(position, index.getX(t * 3 + 2));
    normals[t] = new THREE.Vector3().subVectors(c, a).cross(new THREE.Vector3().subVectors(b, a)).normalize();
  }

  const vertTris = new Map<number, number[]>();
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const vi = index.getX(t * 3 + k);
      const arr = vertTris.get(vi);
      if (arr) arr.push(t);
      else vertTris.set(vi, [t]);
    }
  }

  const triangleFaceId = new Int32Array(triCount).fill(-1);
  const groups: number[][] = [];
  for (let t = 0; t < triCount; t++) {
    if (triangleFaceId[t] !== -1) continue;
    const id = groups.length;
    const group: number[] = [t];
    triangleFaceId[t] = id;
    const stack = [t];
    while (stack.length > 0) {
      const cur = stack.pop() as number;
      for (let k = 0; k < 3; k++) {
        const vi = index.getX(cur * 3 + k);
        for (const nb of vertTris.get(vi) ?? []) {
          if (triangleFaceId[nb] !== -1) continue;
          if (normals[nb].dot(normals[cur]) >= COPLANAR_DOT) {
            triangleFaceId[nb] = id;
            group.push(nb);
            stack.push(nb);
          }
        }
      }
    }
    groups.push(group);
  }

  return { triangleFaceId, groups };
}

/** Builds a standalone geometry containing just the given face group's triangles, for a highlight overlay mesh. */
export function extractFaceGeometry(geometry: THREE.BufferGeometry, triangleIndices: number[]): THREE.BufferGeometry {
  const index = geometry.getIndex();
  const position = geometry.getAttribute("position");
  if (!index) throw new Error("extractFaceGeometry requires an indexed geometry");

  const positions = new Float32Array(triangleIndices.length * 9);
  let o = 0;
  for (const t of triangleIndices) {
    for (let k = 0; k < 3; k++) {
      const vi = index.getX(t * 3 + k);
      positions[o++] = position.getX(vi);
      positions[o++] = position.getY(vi);
      positions[o++] = position.getZ(vi);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  out.computeVertexNormals();
  return out;
}
