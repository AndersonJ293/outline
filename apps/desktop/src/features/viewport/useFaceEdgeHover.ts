import { useEffect, useRef, useCallback, type RefObject } from "react";
import * as THREE from "three";
import { extractFaceGeometry, type FaceGroups } from "./faceGrouping";

interface UseFaceEdgeHoverArgs {
  active: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  cameraRef: RefObject<THREE.OrthographicCamera | null>;
  meshGroupRef: RefObject<THREE.Group | null>;
  wireframeGroupRef: RefObject<THREE.Group | null>;
}

const FACE_HIGHLIGHT_COLOR = 0x2f9bff;
const EDGE_HIGHLIGHT_COLOR = 0x2f9bff;
const EDGE_PICK_THRESHOLD = 0.8;

/// Fusion-style hover feedback for solid bodies: a flat wall lights up with a
/// translucent blue overlay, a hard edge lights up as a bright line. Curved
/// walls (no coplanar neighbor triangles, see faceGrouping.ts) never light
/// up — matching Fusion's restriction that only planar faces are pickable.
/// Purely visual for now; nothing consumes the hovered face/edge yet.
export function useFaceEdgeHover({
  active,
  containerRef,
  cameraRef,
  meshGroupRef,
  wireframeGroupRef,
}: UseFaceEdgeHoverArgs) {
  const raycasterRef = useRef(new THREE.Raycaster());
  const faceHighlightRef = useRef<THREE.Mesh | null>(null);
  const edgeHighlightRef = useRef<THREE.LineSegments | null>(null);

  const clearFaceHighlight = useCallback(() => {
    const mesh = faceHighlightRef.current;
    if (!mesh) return;
    mesh.parent?.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    faceHighlightRef.current = null;
  }, []);

  const clearEdgeHighlight = useCallback(() => {
    const line = edgeHighlightRef.current;
    if (!line) return;
    line.parent?.remove(line);
    line.geometry.dispose();
    (line.material as THREE.Material).dispose();
    edgeHighlightRef.current = null;
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      const meshGroup = meshGroupRef.current;
      const wireframeGroup = wireframeGroupRef.current;
      if (!container || !camera || !meshGroup || !wireframeGroup) return;

      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = raycasterRef.current;
      raycaster.setFromCamera(mouse, camera);
      raycaster.params.Line = { threshold: EDGE_PICK_THRESHOLD };

      const edgeLines: THREE.LineSegments[] = [];
      wireframeGroup.traverse((child) => {
        if (child instanceof THREE.LineSegments && child.visible) edgeLines.push(child);
      });
      const edgeHits = raycaster.intersectObjects(edgeLines, false);
      if (edgeHits.length > 0 && edgeHits[0].index !== undefined) {
        clearFaceHighlight();
        const hit = edgeHits[0];
        const source = hit.object as THREE.LineSegments;
        const segStart = (hit.index as number) * 2;
        const pos = source.geometry.getAttribute("position");
        const positions = new Float32Array(6);
        positions[0] = pos.getX(segStart);
        positions[1] = pos.getY(segStart);
        positions[2] = pos.getZ(segStart);
        positions[3] = pos.getX(segStart + 1);
        positions[4] = pos.getY(segStart + 1);
        positions[5] = pos.getZ(segStart + 1);

        clearEdgeHighlight();
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const material = new THREE.LineBasicMaterial({ color: EDGE_HIGHLIGHT_COLOR, depthTest: false });
        const line = new THREE.LineSegments(geometry, material);
        line.renderOrder = 3;
        source.parent?.add(line);
        edgeHighlightRef.current = line;
        container.style.cursor = "pointer";
        return;
      }
      clearEdgeHighlight();

      const meshes: THREE.Mesh[] = [];
      meshGroup.traverse((child) => {
        if (child instanceof THREE.Mesh && !child.userData.isHighlight) meshes.push(child);
      });
      const faceHits = raycaster.intersectObjects(meshes, false);
      const hit = faceHits[0];
      const hitMesh = hit?.object as THREE.Mesh | undefined;
      const faceGroups = hitMesh?.userData.faceGroups as FaceGroups | undefined;
      if (!hit || hit.faceIndex == null || !hitMesh || !faceGroups) {
        clearFaceHighlight();
        container.style.cursor = "";
        return;
      }

      const groupId = faceGroups.triangleFaceId[hit.faceIndex];
      const triangles = faceGroups.groups[groupId];
      if (!triangles || triangles.length < 2) {
        // Curved surface (no coplanar neighbor) — not selectable, no highlight.
        clearFaceHighlight();
        container.style.cursor = "";
        return;
      }

      if (faceHighlightRef.current?.userData.groupId !== groupId || faceHighlightRef.current?.parent !== hitMesh) {
        clearFaceHighlight();
        const geometry = extractFaceGeometry(hitMesh.geometry as THREE.BufferGeometry, triangles);
        const material = new THREE.MeshBasicMaterial({
          color: FACE_HIGHLIGHT_COLOR,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.isHighlight = true;
        mesh.userData.groupId = groupId;
        hitMesh.add(mesh);
        faceHighlightRef.current = mesh;
      }
      container.style.cursor = "pointer";
    },
    [containerRef, cameraRef, meshGroupRef, wireframeGroupRef, clearFaceHighlight, clearEdgeHighlight],
  );

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("pointermove", handlePointerMove);
    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      clearFaceHighlight();
      clearEdgeHighlight();
      container.style.cursor = "";
    };
  }, [active, handlePointerMove, clearFaceHighlight, clearEdgeHighlight, containerRef]);
}
