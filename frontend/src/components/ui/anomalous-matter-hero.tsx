import { useRef, useEffect, Suspense } from "react";
import * as THREE from "three";

// Approximate continent dot positions as [lat, lon] in degrees
const CONTINENT_DOTS: [number, number][] = [
  // North America
  [50, -100], [45, -90], [40, -80], [40, -100], [35, -90], [35, -110],
  [30, -100], [30, -85], [55, -120], [48, -70], [25, -100], [20, -100],
  // South America
  [5, -60], [0, -55], [-10, -55], [-15, -60], [-20, -65], [-25, -65],
  [-30, -65], [-35, -65], [-40, -65], [10, -70],
  // Europe
  [55, 10], [50, 10], [50, 20], [55, 20], [48, 2], [52, 0],
  [60, 20], [60, 10], [45, 15], [40, 20], [40, 10],
  // Africa
  [20, 20], [15, 20], [10, 20], [5, 20], [0, 25], [-5, 25],
  [-10, 25], [-20, 25], [-30, 25], [30, 20], [25, 30], [10, 10],
  // Asia
  [60, 60], [55, 60], [50, 80], [45, 80], [40, 80], [35, 80],
  [30, 80], [25, 80], [60, 100], [55, 100], [50, 100], [40, 100],
  [35, 110], [30, 110], [25, 110], [20, 80], [15, 80], [10, 78],
  [35, 60], [30, 60], [40, 60], [50, 40], [40, 40], [35, 40],
  // Australia
  [-25, 135], [-30, 135], [-20, 135], [-25, 125], [-35, 148],
  [-30, 148], [-25, 148],
  // Japan / SE Asia
  [35, 138], [34, 136], [36, 140], [15, 100], [10, 105], [5, 110],
];

function buildContinentDots(R: number): THREE.Points {
  const positions: number[] = [];
  CONTINENT_DOTS.forEach(([lat, lon]) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const r = R + 0.01;
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.055,
    transparent: true,
    opacity: 0.75,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

export function GlobeScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    currentMount.appendChild(renderer.domElement);

    const R = 1.4;
    const group = new THREE.Group();
    scene.add(group);

    // ── Solid globe base ──
    const sphereMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color("#1040a0"),
      emissive: new THREE.Color("#071a4a"),
      specular: new THREE.Color("#4488ff"),
      shininess: 80,
      transparent: true,
      opacity: 0.97,
    });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), sphereMat));

    // ── Ocean tint layer (subtle lighter blue) ──
    const oceanMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color("#1a5fd4"),
      emissive: new THREE.Color("#0a2a70"),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(R + 0.002, 64, 64), oceanMat));

    // ── Latitude lines ──
    const latMat = new THREE.LineBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.2 });
    for (let i = 1; i < 12; i++) {
      const phi = (i / 12) * Math.PI;
      const r = R * Math.sin(phi);
      const y = R * Math.cos(phi);
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= 128; j++) {
        const t = (j / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(r * Math.cos(t), y, r * Math.sin(t)));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), latMat));
    }

    // ── Longitude lines ──
    const lonMat = new THREE.LineBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.2 });
    for (let i = 0; i < 16; i++) {
      const theta = (i / 16) * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= 128; j++) {
        const phi = (j / 128) * Math.PI;
        pts.push(new THREE.Vector3(
          R * Math.sin(phi) * Math.cos(theta),
          R * Math.cos(phi),
          R * Math.sin(phi) * Math.sin(theta)
        ));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lonMat));
    }

    // ── Continent dots ──
    group.add(buildContinentDots(R));

    // ── Atmosphere glow ──
    const atmosMat = new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color("#4488ff") } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.55 - dot(vNormal, vec3(0,0,1.0)), 3.0);
          gl_FragColor = vec4(glowColor, clamp(intensity * 0.8, 0.0, 1.0));
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.2, 64, 64), atmosMat));

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0x223366, 0.8));
    const key = new THREE.DirectionalLight(0x99bbff, 2.0);
    key.position.set(5, 3, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x4466aa, 0.5);
    fill.position.set(-4, -2, 2);
    scene.add(fill);

    // ── Animation ──
    let frameId: number;
    const animate = () => {
      group.rotation.y += 0.0018;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!currentMount) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />;
}

export function AnomalousMatterHero() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      <Suspense fallback={<div className="w-full h-full" />}>
        <GlobeScene />
      </Suspense>

      {/* Heading */}
      <div className="relative z-10 text-center px-6 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight drop-shadow-lg">
          Manage Your Sales<br />&amp; Grow Your Business
        </h2>
        <p className="mt-2 text-sm text-white/70 max-w-xs mx-auto">
          Track leads, close opportunities, and drive business growth.
        </p>
      </div>

      {/* Stat cards */}
      <div className="relative z-10 flex gap-3">
        <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-4 py-3 text-white shadow-lg min-w-[90px] text-center">
          <p className="text-xs text-white/65 mb-1">New Leads</p>
          <p className="text-2xl font-bold">128</p>
        </div>
        <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-4 py-3 text-white shadow-lg min-w-[90px] text-center">
          <p className="text-xs text-white/65 mb-1">Opportunities</p>
          <p className="text-2xl font-bold">36</p>
        </div>
        <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-4 py-3 text-white shadow-lg min-w-[90px] text-center">
          <p className="text-xs text-white/65 mb-1">Connected</p>
          <p className="text-2xl font-bold">$23.4K</p>
        </div>
      </div>
    </div>
  );
}
