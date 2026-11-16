import { createScene } from '../scene/index.js';
import { createSound } from './sound.js';
import { startPlayer } from './app.js';

/** Prépare son et scène, puis lance le lecteur. */
export async function bootPlayer({ root, route, store }) {
  const params = new URLSearchParams(location.search);
  const reducedMotion = params.has('reduced') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const sound = createSound(store);
  const scene = await createScene(document.getElementById('stage'), {
    reducedMotion,
    onCue: (cue) => sound.cue(cue),
  });
  // ?now=2026-12-24T23:59:50 : simule une autre date (pour tester le passage à minuit).
  const fake = params.get('now') ? new Date(params.get('now')).getTime() : NaN;
  const offset = Number.isFinite(fake) ? fake - Date.now() : 0;
  const now = () => new Date(Date.now() + offset);
  await startPlayer({ root, payload: route.payload, hash: route.hash, scene, sound, store, now });
}
