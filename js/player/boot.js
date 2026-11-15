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
  await startPlayer({ root, payload: route.payload, hash: route.hash, scene, sound, store });
}
