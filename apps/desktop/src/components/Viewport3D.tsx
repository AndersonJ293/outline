import { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useStore } from "../stores/useStore";

export default function Viewport3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentMesh = useStore((s) => s.currentMesh);
  const previewWireframe = useStore((s) => s.previewWireframe);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const wireframeRef = useRef<THREE.LineSegments | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(50, 50, 50);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-10, -5, -10);
    scene.add(backLight);

    const gridHelper = new THREE.GridHelper(100, 10, 0x4fc3f7, 0x333355);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(30);
    scene.add(axesHelper);

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", resize);

    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener("resize", resize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      if (Array.isArray(meshRef.current.material)) {
        meshRef.current.material.forEach((m) => m.dispose());
      } else {
        (meshRef.current.material as THREE.Material).dispose();
      }
      meshRef.current = null;
    }

    if (wireframeRef.current) {
      scene.remove(wireframeRef.current);
      wireframeRef.current.geometry.dispose();
      (wireframeRef.current.material as THREE.Material).dispose();
      wireframeRef.current = null;
    }

    if (!currentMesh) return;

    const vertices = new Float32Array(currentMesh.vertices.flat());
    const indices = new Uint32Array(currentMesh.triangles.flat());

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    const initialBox = geometry.boundingBox;
    const center = new THREE.Vector3();
    if (initialBox) {
      initialBox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
      geometry.computeBoundingBox();
      geometry.computeVertexNormals();
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x4fc3f7,
      metalness: 0.1,
      roughness: 0.6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    const wireframeGeo = new THREE.WireframeGeometry(geometry);
    const wireframeMat = new THREE.LineBasicMaterial({
      color: 0x88ddff,
      transparent: true,
      opacity: 0.3,
    });
    const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
    scene.add(wireframe);
    wireframeRef.current = wireframe;

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (camera && controls) {
      const box = new THREE.Box3().setFromObject(mesh);
      const framedCenter = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z, 1);
      const distance = maxSize * 2.2;

      controls.target.copy(framedCenter);
      camera.position.set(
        framedCenter.x + distance,
        framedCenter.y + distance,
        framedCenter.z + distance,
      );
      camera.near = Math.max(distance / 100, 0.1);
      camera.far = distance * 100;
      camera.updateProjectionMatrix();
      controls.update();
    }
  }, [currentMesh]);

  useEffect(() => {
    if (wireframeRef.current) {
      wireframeRef.current.visible = previewWireframe;
    }
  }, [previewWireframe]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        background: "#1a1a2e",
        position: "relative",
        overflow: "hidden",
      }}
    />
  );
}
