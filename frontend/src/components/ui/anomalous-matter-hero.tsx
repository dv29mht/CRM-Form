import { useRef, useEffect, Suspense } from "react";
import * as THREE from "three";

export function GlobeScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 3.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // transparent bg
    currentMount.appendChild(renderer.domElement);

    // Globe geometry
    const geometry = new THREE.SphereGeometry(1.3, 64, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color("#1a73e8") },
        color2: { value: new THREE.Color("#ffffff") },
      },
      vertexShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0))*289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0))*289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314*r; }
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0*floor(p*ns.z*ns.z);
          vec4 x_ = floor(j*ns.z);
          vec4 y_ = floor(j - 7.0*x_);
          vec4 x = x_*ns.x + ns.yyyy;
          vec4 y = y_*ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
          m = m*m;
          return 42.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
        }

        void main() {
          vNormal = normal;
          vPosition = position;
          vUv = uv;
          // Very subtle displacement to keep globe shape
          float d = snoise(position * 1.5 + time * 0.3) * 0.06;
          vec3 newPos = position + normal * d;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;

        void main() {
          vec3 normal = normalize(vNormal);
          // Fresnel rim glow
          float fresnel = 1.0 - dot(normal, vec3(0.0, 0.0, 1.0));
          fresnel = pow(fresnel, 1.8);

          // Latitude lines
          float lat = abs(sin(vPosition.y * 10.0));
          float lon = abs(sin(atan(vPosition.z, vPosition.x) * 8.0));
          float grid = smoothstep(0.92, 1.0, lat) + smoothstep(0.92, 1.0, lon);
          grid = clamp(grid, 0.0, 1.0);

          vec3 baseColor = mix(color1 * 0.6, color1, fresnel);
          vec3 gridColor = mix(baseColor, color2, grid * 0.6);
          vec3 rimColor = mix(gridColor, vec3(0.5, 0.8, 1.0), fresnel * 0.5);

          gl_FragColor = vec4(rimColor, 0.92);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
    });

    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Atmosphere glow
    const atmosGeo = new THREE.SphereGeometry(1.42, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color("#4da6ff") },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0,0,1.0)), 3.0);
          gl_FragColor = vec4(color, intensity * 0.6);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Ambient + directional light
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0x88ccff, 1.2);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    let frameId: number;
    const animate = (t: number) => {
      material.uniforms.time.value = t * 0.0003;
      globe.rotation.y += 0.0015;
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
      geometry.dispose();
      material.dispose();
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

      {/* Heading above globe */}
      <div className="relative z-10 text-center px-6 mb-4">
        <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight drop-shadow-lg">
          Manage Your Sales<br />& Grow Your Business
        </h2>
        <p className="mt-2 text-sm text-white/75 max-w-xs mx-auto">
          Track leads, close opportunities, and drive business growth.
        </p>
      </div>

      {/* Floating stat cards */}
      <div className="relative z-10 flex gap-3 mt-2">
        <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl px-4 py-3 text-white shadow-lg">
          <p className="text-xs text-white/70">New Leads</p>
          <p className="text-xl font-bold">128</p>
        </div>
        <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl px-4 py-3 text-white shadow-lg">
          <p className="text-xs text-white/70">Opportunities</p>
          <p className="text-xl font-bold">36</p>
        </div>
        <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl px-4 py-3 text-white shadow-lg">
          <p className="text-xs text-white/70">Connected</p>
          <p className="text-xl font-bold">$23.4K</p>
        </div>
      </div>
    </div>
  );
}
