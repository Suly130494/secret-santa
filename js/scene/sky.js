import * as THREE from 'three';
import { PARTICLES } from './quality.js';

const NOISE = /* glsl */`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int k = 0; k < 5; k++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
`;

/** Ciel : dôme en dégradé, étoiles scintillantes, rideaux d'aurore boréale. */
export function createSky(stage) {
  const { scene } = stage;
  const group = new THREE.Group();
  scene.add(group);

  // --- Dôme ---
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uLight: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */`
      uniform float uLight;
      varying vec3 vDir;
      float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        float y = vDir.y;
        vec3 top = vec3(0.010, 0.016, 0.055);
        vec3 mid = vec3(0.052, 0.030, 0.150);
        vec3 low = vec3(0.022, 0.012, 0.060);
        vec3 col = y > -0.05 ? mix(mid, top, smoothstep(-0.05, 0.55, y)) : mix(mid, low, smoothstep(-0.05, -0.6, y));
        col *= mix(0.35, 1.0, uLight);
        col += (rand(gl_FragCoord.xy) - 0.5) / 255.0; // anti-bandes
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), domeMat));

  // --- Étoiles ---
  const starCount = PARTICLES.high.stars;
  const starPos = new Float32Array(starCount * 3);
  const starSize = new Float32Array(starCount);
  const starPhase = new Float32Array(starCount);
  for (let k = 0; k < starCount; k++) {
    const theta = Math.random() * Math.PI * 2;
    const y = Math.random() * 1.6 - 0.5;
    const r = Math.sqrt(1 - Math.min(1, y * y));
    const dir = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
    if (dir.z > 0.2) dir.z *= -1; // surtout devant la caméra
    dir.normalize().multiplyScalar(70);
    starPos.set([dir.x, dir.y, dir.z], k * 3);
    starSize[k] = Math.random() < 0.08 ? 2.6 + Math.random() * 1.6 : 0.8 + Math.random() * 1.4;
    starPhase[k] = Math.random() * Math.PI * 2;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhase, 1));
  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: stage.renderer.getPixelRatio() } },
    vertexShader: /* glsl */`
      attribute float aSize; attribute float aPhase;
      uniform float uTime; uniform float uPixelRatio;
      varying float vTwinkle;
      void main() {
        vTwinkle = 0.55 + 0.45 * sin(uTime * (0.8 + fract(aPhase) * 1.6) + aPhase);
        gl_PointSize = aSize * uPixelRatio * (0.8 + 0.4 * vTwinkle);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uOpacity; varying float vTwinkle;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.96, 0.88) * 1.2, a * vTwinkle * uOpacity);
      }
    `,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  group.add(stars);

  // --- Aurore boréale ---
  const auroraMat = (seed, speed) => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uSeed: { value: seed }, uSpeed: { value: speed } },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform float uOpacity; uniform float uSeed; uniform float uSpeed;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        float t = uTime * uSpeed;
        float wave = fbm(vec2(vUv.x * 3.0 + uSeed, t * 0.15)) * 0.35;
        float y = vUv.y - wave;
        float curtain = smoothstep(0.05, 0.35, y) * smoothstep(1.0, 0.45, y);
        float rays = fbm(vec2(vUv.x * 18.0 + uSeed * 3.0 + t * 0.4, y * 1.5));
        rays = pow(rays, 2.2) * 2.4;
        float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        vec3 teal = vec3(0.24, 0.90, 0.76);
        vec3 violet = vec3(0.48, 0.36, 1.0);
        vec3 pink = vec3(1.0, 0.44, 0.71);
        vec3 col = mix(teal, violet, smoothstep(0.3, 0.9, y));
        col = mix(col, pink, smoothstep(0.75, 1.0, y) * 0.5);
        float a = curtain * rays * edge * uOpacity;
        gl_FragColor = vec4(col * a, a);
      }
    `,
  });
  const aurora = [
    { mat: auroraMat(1.7, 1.0), pos: [0, 9, -40], rot: -0.08, size: [110, 34] },
    { mat: auroraMat(5.3, 0.7), pos: [-12, 13, -50], rot: 0.12, size: [120, 30] },
  ].map(({ mat, pos, rot, size }) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1], 1, 1), mat);
    mesh.position.set(...pos);
    mesh.rotation.z = rot;
    group.add(mesh);
    return mat;
  });

  const state = { stars: 0, aurora: 0, light: 0 };

  stage.onFrame((dt, t) => {
    starMat.uniforms.uTime.value = t;
    starMat.uniforms.uOpacity.value = state.stars;
    starMat.uniforms.uPixelRatio.value = stage.renderer.getPixelRatio();
    domeMat.uniforms.uLight.value = state.light;
    aurora.forEach((m) => {
      m.uniforms.uTime.value = t;
      m.uniforms.uOpacity.value = state.aurora * 0.35;
    });
  });

  stage.onQuality((q) => starGeo.setDrawRange(0, PARTICLES[q].stars));
  starGeo.setDrawRange(0, PARTICLES[stage.quality].stars);

  /** Intensités animables (0 → 1) : stars, aurora, light. */
  return { state };
}
