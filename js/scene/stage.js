import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { gsap } from 'gsap';
import { createLoop } from './loop.js';

const BLOOM = { strength: 0.8, radius: 0.5, threshold: 0.85 };
const CAMERA_Z = 8;

/**
 * Moteur de rendu : renderer, caméra, bloom, boucle d'animation, conversions écran → monde.
 * Lève une erreur si WebGL n'est pas disponible.
 */
export function createStage(layer, { quality: initialQuality = 'high' } = {}) {
  let quality = initialQuality;
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x0b1026, 1);
  layer.replaceChildren(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 0, CAMERA_Z);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let width = 1;
  let height = 1;
  const pixelRatio = () => Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1.5);

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(width, height, false);
    composer.setPixelRatio(pixelRatio());
    composer.setSize(width, height);
    const scale = quality === 'high' ? 1 : 0.5;
    bloom.setSize(width * pixelRatio() * scale, height * pixelRatio() * scale);
  }
  resize();
  window.addEventListener('resize', resize);

  // Parallaxe douce au pointeur
  const target = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / width - 0.5) * 2;
    target.y = (e.clientY / height - 0.5) * 2;
  }, { passive: true });

  const updaters = new Set();
  const qualityListeners = new Set();
  const clock = new THREE.Clock();
  let elapsed = 0;
  let frameTimes = [];

  function setQuality(next) {
    if (next === quality) return;
    quality = next;
    resize();
    qualityListeners.forEach((fn) => fn(quality));
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    camera.position.x += (target.x * 0.12 - camera.position.x) * 0.04;
    camera.position.y += (-target.y * 0.08 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    updaters.forEach((fn) => fn(dt, elapsed));
    composer.render(dt);
    // Garde-fou : si le temps moyen d'image dépasse 30 ms sur 90 images, on allège.
    if (quality === 'high') {
      frameTimes.push(dt);
      if (frameTimes.length >= 90) {
        const mean = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        frameTimes = [];
        if (mean > 0.03) setQuality('low');
      }
    }
  }

  // Une seule boucle, même après plusieurs allers-retours vers une autre appli.
  const loop = createLoop(frame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      loop.stop();
    } else if (!loop.running) {
      clock.getDelta();
      frameTimes = [];
      loop.start();
    }
  });
  loop.start();

  /** Demi-hauteur visible (en unités monde) à la profondeur z. */
  const halfHeightAt = (z = 0) => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (CAMERA_Z - z);

  return {
    THREE,
    renderer,
    scene,
    camera,
    composer,
    bloom,
    get quality() { return quality; },
    onQuality(fn) { qualityListeners.add(fn); return () => qualityListeners.delete(fn); },
    onFrame(fn) { updaters.add(fn); return () => updaters.delete(fn); },
    /** Coordonnées écran (px) → point monde à la profondeur z. */
    screenToWorld(x, y, z = 0) {
      const hh = halfHeightAt(z);
      const hw = hh * (width / height);
      return new THREE.Vector3((x / width) * 2 * hw - hw, hh - (y / height) * 2 * hh, z);
    },
    /** Taille en px → taille en unités monde à la profondeur z. */
    pxToWorld(px, z = 0) { return (px / height) * 2 * halfHeightAt(z); },
    /** Rectangle d'un élément DOM → centre et taille en unités monde (z = 0). */
    anchorToWorld(el) {
      const r = el.getBoundingClientRect();
      const center = this.screenToWorld(r.left + r.width / 2, r.top + r.height / 2, 0);
      return { center, width: this.pxToWorld(r.width), height: this.pxToWorld(r.height) };
    },
    /** Flash de lumière (pic de bloom). */
    bloomPulse(extra = 1.2, seconds = 0.6) {
      gsap.killTweensOf(bloom);
      gsap.fromTo(bloom, { strength: BLOOM.strength + extra }, { strength: BLOOM.strength, duration: seconds, ease: 'power2.out' });
    },
    get size() { return { width, height }; },
  };
}
