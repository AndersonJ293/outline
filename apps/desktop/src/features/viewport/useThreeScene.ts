import { useRef, useEffect, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Tool3DMode, ViewportState, Mesh, WorkingPlane } from "../../types";

interface UseThreeSceneArgs {
  containerRef: RefObject<HTMLDivElement>;
  viewport: ViewportState;
  bodies: Record<string, Mesh>;
  previewWireframe: boolean;
  isSketching: boolean;
  workingPlane: WorkingPlane;
  tool3DMode: Tool3DMode;
}

export function useThreeScene({
  containerRef,
  viewport,
  bodies,
  previewWireframe,
  isSketching,
  workingPlane,
  tool3DMode,
}: UseThreeSceneArgs) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const wireframeGroupRef = useRef<THREE.Group | null>(null);
  const sketchGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;

    const aspect = w / h;
    const viewSize = 90;
    const camera = new THREE.OrthographicCamera(
      -viewSize * aspect, viewSize * aspect, viewSize, -viewSize, -1000, 1000,
    );
    camera.position.set(50, 30, 100);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(0, 0, 0);
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.update();
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);
    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-10, -5, -10);
    scene.add(backLight);

    const gridHelper = new THREE.GridHelper(1000, 10, 0x4fc3f7, 0x333355);
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;
    const axesHelper = new THREE.AxesHelper(30);
    scene.add(axesHelper);
    axesHelperRef.current = axesHelper;

    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    const wireframeGroup = new THREE.Group();
    scene.add(wireframeGroup);
    wireframeGroupRef.current = wireframeGroup;

    const sketchGroup = new THREE.Group();
    scene.add(sketchGroup);
    sketchGroupRef.current = sketchGroup;

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const cw = container.clientWidth || 1;
      const ch = container.clientHeight || 1;
      const newAspect = cw / ch;
      renderer.setSize(cw, ch);
      camera.left = -viewSize * newAspect;
      camera.right = viewSize * newAspect;
      camera.top = viewSize;
      camera.bottom = -viewSize;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (controls) {
      controls.enabled = !isSketching;
    }

    const renderer = rendererRef.current;
    if (renderer) {
      renderer.domElement.style.pointerEvents = isSketching ? "none" : "auto";
    }

    if (isSketching) {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      const [nx, ny, nz] = workingPlane.normal;
      const [ox, oy, oz] = workingPlane.origin;
      const dist = 100;
      camera.position.set(
        ox + nx * dist,
        oy + ny * dist,
        oz + nz * dist,
      );
      controls.target.set(ox, oy, oz);
      controls.update();
    }
  }, [isSketching, workingPlane]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (isSketching) return;
    if (tool3DMode === "select3d" || tool3DMode === "extrude") {
      controls.mouseButtons = {
        LEFT: -1 as unknown as THREE.MOUSE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.ROTATE,
      };
    } else {
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN,
      };
    }
  }, [isSketching, tool3DMode]);

  useEffect(() => {
    const grid = gridHelperRef.current;
    const axes = axesHelperRef.current;
    const meshGroup = meshGroupRef.current;
    const wireframeGroup = wireframeGroupRef.current;
    if (grid) grid.visible = !isSketching;
    if (axes) axes.visible = !isSketching;
    if (meshGroup) meshGroup.visible = !isSketching;
    if (wireframeGroup) wireframeGroup.visible = !isSketching;
  }, [isSketching]);

  useEffect(() => {
    const camera = cameraRef.current;
    const container = containerRef.current;
    if (!camera || !container || !isSketching) return;
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;

    camera.left = -viewport.offsetX / viewport.zoom;
    camera.right = (w - viewport.offsetX) / viewport.zoom;
    camera.top = -viewport.offsetY / viewport.zoom;
    camera.bottom = (h - viewport.offsetY) / viewport.zoom;
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [viewport, containerRef, isSketching]);

  useEffect(() => {
    const meshGroup = meshGroupRef.current;
    const wireframeGroup = wireframeGroupRef.current;
    if (!meshGroup || !wireframeGroup) return;

    while (meshGroup.children.length > 0) {
      const child = meshGroup.children[0];
      meshGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    while (wireframeGroup.children.length > 0) {
      const child = wireframeGroup.children[0];
      wireframeGroup.remove(child);
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    const entries = Object.values(bodies);
    if (entries.length === 0) return;

    for (const body of entries) {
      const vertices = new Float32Array(body.vertices.flat());
      const indices = new Uint32Array(body.triangles.flat());

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      geometry.computeVertexNormals();

      const material = new THREE.MeshPhysicalMaterial({
        color: 0x4fc3f7,
        metalness: 0.1,
        roughness: 0.6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(geometry, material);
      meshGroup.add(mesh);

      const wireGeo = new THREE.WireframeGeometry(geometry);
      const wireMat = new THREE.LineBasicMaterial({
        color: 0x88ddff,
        transparent: true,
        opacity: 0.3,
      });
      const wireframeLine = new THREE.LineSegments(wireGeo, wireMat);
      wireframeLine.visible = previewWireframe;
      wireframeGroup.add(wireframeLine);
    }
  }, [bodies, previewWireframe]);

  return { sketchGroupRef, meshGroupRef, cameraRef, sceneRef };
}
