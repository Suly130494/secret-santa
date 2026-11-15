import * as THREE from 'three';
import { PARTICLES } from './quality.js';

/** Neige : chute calculée dans le shader (aucun coût CPU). */
export function createSnow(stage) {
  const count = PARTICLES.high.snow;
  const pos = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  const phase = new Float32Array(count);
  const size = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    pos.set([(Math.random() - 0.5) * 26, (Math.random() - 0.5) * 18, -7 + Math.random() * 11], k * 3);
    speed[k] = 0.3 + Math.random() * 0.5;
    phase[k] = Math.random() * Math.PI * 2;
    size[k] = 1.5 + Math.random() * 3.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 }, uGust: { value: 0 } },
    vertexShader: /* glsl */`
      attribute float aSpeed; attribute float aPhase; attribute float aSize;
      uniform float uTime; uniform float uPixelRatio; uniform float uGust;
      varying float vDepth;
      void main() {
        vec3 p = position;
        p.y = mod(p.y - uTime * aSpeed + 9.0, 18.0) - 9.0;
        p.x += sin(uTime * 0.6 + aPhase) * 0.35 + uGust * (1.0 + aSpeed) * 1.5;
        p.z += cos(uTime * 0.4 + aPhase) * 0.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vDepth = clamp((p.z + 7.0) / 11.0, 0.0, 1.0);
        gl_PointSize = aSize * uPixelRatio * (6.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uOpacity; varying float vDepth;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d);
        gl_FragColor = vec4(vec3(0.92, 0.95, 1.0), a * uOpacity * mix(0.35, 0.9, vDepth));
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  stage.scene.add(points);
  const state = { opacity: 0, gust: 0 };
  stage.onFrame((dt, t) => {
    mat.uniforms.uTime.value = t;
    mat.uniforms.uOpacity.value = state.opacity;
    mat.uniforms.uGust.value = state.gust;
    mat.uniforms.uPixelRatio.value = stage.renderer.getPixelRatio();
  });
  const apply = (q) => geo.setDrawRange(0, PARTICLES[q].snow);
  apply(stage.quality);
  stage.onQuality(apply);
  return { state };
}

const MODE_OFF = 0;
const MODE_FREE = 1;
const MODE_SWIRL = 2;
const MODE_AMBIENT = 3;

/**
 * Poussière d'or : réserve de particules simulées sur le CPU (gerbes, traînées, spirales).
 */
export function createGoldDust(stage) {
  const max = PARTICLES.high.dust;
  let limit = PARTICLES[stage.quality].dust;
  const pos = new Float32Array(max * 3);
  const vel = new Float32Array(max * 3);
  const alpha = new Float32Array(max);
  const size = new Float32Array(max);
  const tint = new Float32Array(max);
  const life = new Float32Array(max);
  const maxLife = new Float32Array(max);
  const mode = new Uint8Array(max);
  const baseSize = new Float32Array(max);
  // paramètres de spirale
  const sr = new Float32Array(max);
  const sa = new Float32Array(max);
  const sz = new Float32Array(max);
  const center = new THREE.Vector3();
  let swirlDuration = 1;

  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const alphaAttr = new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage);
  const sizeAttr = new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('aAlpha', alphaAttr);
  geo.setAttribute('aSize', sizeAttr);
  geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
  for (let k = 0; k < max; k++) tint[k] = Math.random();

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aAlpha; attribute float aSize; attribute float aTint;
      uniform float uPixelRatio;
      varying float vAlpha; varying float vTint;
      void main() {
        vAlpha = aAlpha; vTint = aTint;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * (8.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      varying float vAlpha; varying float vTint;
      void main() {
        if (vAlpha <= 0.001) discard;
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = exp(-d * d * 5.0);
        vec3 gold = mix(vec3(1.0, 0.78, 0.38), vec3(1.0, 0.95, 0.8), step(0.82, vTint));
        gl_FragColor = vec4(gold * 2.2 * core * vAlpha, core * vAlpha);
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 10;
  stage.scene.add(points);

  let cursor = 0;
  function take() {
    for (let n = 0; n < limit; n++) {
      const k = (cursor + n) % limit;
      if (mode[k] === MODE_OFF) { cursor = (k + 1) % limit; return k; }
    }
    // tout est occupé : on recycle la suivante (hors ambiance)
    const k = cursor;
    cursor = (cursor + 1) % limit;
    return k;
  }

  function spawn(k, x, y, z, vx, vy, vz, lifetime, s, m = MODE_FREE) {
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
    vel[k * 3] = vx; vel[k * 3 + 1] = vy; vel[k * 3 + 2] = vz;
    life[k] = 0; maxLife[k] = lifetime; baseSize[k] = s; mode[k] = m;
  }

  const ambient = { count: 0, center: new THREE.Vector3(0, 0.4, 0), spread: new THREE.Vector3(3.2, 2.4, 1.5) };
  function respawnAmbient(k) {
    const c = ambient.center, s = ambient.spread;
    spawn(k, c.x + (Math.random() - 0.5) * 2 * s.x, c.y + (Math.random() - 0.5) * 2 * s.y, c.z + (Math.random() - 0.5) * 2 * s.z,
      (Math.random() - 0.5) * 0.08, 0.05 + Math.random() * 0.12, 0, 4 + Math.random() * 4, 1.5 + Math.random() * 2.5, MODE_AMBIENT);
    life[k] = Math.random() * maxLife[k] * 0.5;
  }

  stage.onFrame((dt, t) => {
    mat.uniforms.uPixelRatio.value = stage.renderer.getPixelRatio();
    let ambientSeen = 0;
    const drag = Math.pow(0.12, dt); // freinage
    for (let k = 0; k < max; k++) {
      const m = mode[k];
      if (m === MODE_OFF || k >= limit) { alpha[k] = 0; continue; }
      life[k] += dt;
      const u = life[k] / maxLife[k];
      if (m === MODE_SWIRL) {
        const p = Math.min(1, life[k] / swirlDuration);
        const e = p * p * (3 - 2 * p);
        const r = sr[k] * (1 - e);
        const a = sa[k] + e * 7.5;
        pos[k * 3] = center.x + Math.cos(a) * r;
        pos[k * 3 + 1] = center.y + Math.sin(a) * r * 0.62;
        pos[k * 3 + 2] = center.z + sz[k] * (1 - e);
        alpha[k] = Math.min(1, p * 4) * (p > 0.96 ? (1 - p) * 25 : 1);
        size[k] = baseSize[k] * (0.6 + 0.6 * (1 - e));
        if (p >= 1) mode[k] = MODE_OFF;
        continue;
      }
      if (u >= 1) {
        if (m === MODE_AMBIENT && ambientSeen < ambient.count) { respawnAmbient(k); ambientSeen++; continue; }
        mode[k] = MODE_OFF; alpha[k] = 0; continue;
      }
      if (m === MODE_AMBIENT) ambientSeen++;
      vel[k * 3] *= m === MODE_AMBIENT ? 1 : drag;
      vel[k * 3 + 1] = (m === MODE_AMBIENT ? vel[k * 3 + 1] : vel[k * 3 + 1] * drag + 0.25 * dt);
      vel[k * 3 + 2] *= m === MODE_AMBIENT ? 1 : drag;
      pos[k * 3] += vel[k * 3] * dt + (m === MODE_AMBIENT ? Math.sin(t + k) * 0.002 : 0);
      pos[k * 3 + 1] += vel[k * 3 + 1] * dt;
      pos[k * 3 + 2] += vel[k * 3 + 2] * dt;
      const fadeIn = Math.min(1, u * 8);
      const twinkle = m === MODE_AMBIENT ? 0.55 + 0.45 * Math.sin(t * 3 + k * 1.7) : 1;
      alpha[k] = fadeIn * (1 - u) * twinkle;
      size[k] = baseSize[k] * (m === MODE_AMBIENT ? 1 : 1 - u * 0.6);
    }
    // nombre d'ambiance à maintenir
    if (ambientSeen < ambient.count) {
      for (let n = ambientSeen; n < ambient.count; n++) respawnAmbient(take());
    }
    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  stage.onQuality((q) => {
    limit = PARTICLES[q].dust;
    for (let k = limit; k < max; k++) mode[k] = MODE_OFF;
  });

  return {
    /** Gerbe d'étincelles. */
    burst(origin, { count = 300, speed = 3, life: lifetime = 1.6, size: s = 3 } = {}) {
      const n = Math.round(count * (limit / max));
      for (let i = 0; i < n; i++) {
        const k = take();
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, (Math.random() - 0.5) * 0.6).normalize();
        const v = speed * (0.3 + Math.random() * 0.9);
        spawn(k, origin.x, origin.y, origin.z, dir.x * v, dir.y * v, dir.z * v, lifetime * (0.6 + Math.random() * 0.6), s * (0.5 + Math.random()));
      }
    },
    /** Quelques particules à une position (traînées). */
    emit(origin, n = 2, spread = 0.08) {
      for (let i = 0; i < n; i++) {
        const k = take();
        spawn(k, origin.x + (Math.random() - 0.5) * spread, origin.y + (Math.random() - 0.5) * spread, origin.z,
          (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, 0, 0.6 + Math.random() * 0.6, 1.5 + Math.random() * 2);
      }
    },
    /** Spirale de particules qui converge vers un point. */
    swirlTo(target, seconds = 2, count = 420) {
      center.copy(target);
      swirlDuration = seconds;
      const n = Math.round(count * (limit / max));
      for (let i = 0; i < n; i++) {
        const k = take();
        mode[k] = MODE_SWIRL;
        life[k] = -Math.random() * seconds * 0.25;
        sr[k] = 2.5 + Math.random() * 4.5;
        sa[k] = Math.random() * Math.PI * 2;
        sz[k] = (Math.random() - 0.5) * 3;
        baseSize[k] = 2 + Math.random() * 3;
      }
      return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    },
    /** Poussière flottante permanente autour d'une zone. */
    setAmbient(count, centerPoint, spread) {
      ambient.count = Math.round(count * (limit / max));
      if (centerPoint) ambient.center.copy(centerPoint);
      if (spread) ambient.spread.copy(spread);
    },
  };
}

/** Halo lumineux (sprite additif) : étoile de l'intro, lueurs. */
export function createGlow(color = 0xffd98a, intensity = 3) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,240,200,0.85)');
  g.addColorStop(0.45, 'rgba(255,200,110,0.25)');
  g.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 11;
  return sprite;
}
