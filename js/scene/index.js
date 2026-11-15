import { createFallbackScene } from './fallback2d.js';
import { withTimeout } from '../core/timeout.js';

/** Au-delà, on n'attend plus three.js (réseau lent) : on passe en 2D. */
const LOAD_TIMEOUT_MS = 8000;

/**
 * @typedef {'whoosh'|'shimmer'|'crack'|'flip'|'error'} Cue
 * @typedef {object} Scene
 * @property {(o: {giver: string, short: boolean}) => Promise<void>} playIntro
 * @property {() => void} skipIntro
 * @property {(anchor: HTMLElement) => void} showEnvelope
 * @property {() => Promise<void>} shakeEnvelope
 * @property {() => Promise<void>} breakSeal
 * @property {(o: {names: string[], target: string, anchor: HTMLElement}) => Promise<void>} runDraw
 * @property {(target: string, anchor: HTMLElement) => void} showResultIdle
 * @property {() => void} resetDraw
 */

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Crée la scène : 3D si possible, sinon secours 2D.
 * @param {HTMLElement} layer
 * @param {{reducedMotion: boolean, onCue: (cue: Cue) => void}} opts
 * @returns {Promise<Scene>}
 */
export async function createScene(layer, opts) {
  const params = new URLSearchParams(location.search);
  if (!params.has('no3d') && webglAvailable()) {
    try {
      const [{ createWebGLScene }, { detectQuality }] = await withTimeout(
        Promise.all([import('./webgl-scene.js'), import('./quality.js')]),
        LOAD_TIMEOUT_MS,
      );
      return await createWebGLScene(layer, { ...opts, quality: detectQuality() });
    } catch (err) {
      console.warn('3D indisponible, passage en 2D :', err);
      layer.replaceChildren();
      document.body.classList.remove('has-webgl');
    }
  }
  return createFallbackScene(layer, opts);
}
