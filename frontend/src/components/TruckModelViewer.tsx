import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Props = {
  src: string;
  poster?: string;
  alt?: string;
  className?: string;
  lazy?: boolean;
};

/**
 * Lightweight three.js GLB viewer. Loads the model lazily (once the element
 * scrolls into view) so the fleet grid doesn't download every 40 MB model at
 * once. Falls back to a still poster image while loading or on failure.
 */
export default function TruckModelViewer({
  src,
  poster,
  alt = "3D truck model",
  className = "",
  lazy = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(!lazy);
  const [ready, setReady] = useState(false);
  const failedRef = useRef(false);

  useEffect(() => {
    if (!lazy) {
      setInView(true);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lazy]);

  useEffect(() => {
    if (!inView) return;
    const el = containerRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a2e, 0.55));

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(4, 6, 5);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xffffff, 1.1);
    rim.position.set(-5, 2, -4);
    scene.add(rim);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
    camera.position.set(5, 3.2, 5.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.4;
    controls.minDistance = 3;
    controls.maxDistance = 14;
    controls.minPolarAngle = Math.PI / 3.4;
    controls.maxPolarAngle = Math.PI / 1.85;

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    let cancelled = false;
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        if (cancelled) return;
        modelGroup.add(gltf.scene);

        const box = new THREE.Box3().setFromObject(modelGroup);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetDim = 3.4;
        const scale = targetDim / maxDim;
        modelGroup.scale.setScalar(scale);

        const center = box.getCenter(new THREE.Vector3());
        modelGroup.position.sub(center.multiplyScalar(scale));

        setReady(true);
      },
      undefined,
      () => {
        if (cancelled) return;
        failedRef.current = true;
        setReady(true);
      }
    );

    const clock = new THREE.Clock();
    const controlRef = { current: controls };
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controlRef.current.update();
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controlRef.current.dispose();
      modelGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m?.dispose());
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === el) {
        el.removeChild(renderer.domElement);
      }
    };
  }, [inView, src]);

  const showPoster = !ready || failedRef.current;

  return (
    <div ref={containerRef} className={className}>
      {showPoster && poster && (
        <img
          src={poster}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {showPoster && !poster && (
        <div className="absolute inset-0 animate-pulse bg-neutral-800" />
      )}
    </div>
  );
}