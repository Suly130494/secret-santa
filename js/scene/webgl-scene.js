import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createStage } from './stage.js';
import { createSky } from './sky.js';
import { createSnow, createGoldDust } from './particles.js';
import { createIntro } from './intro.js';
import { createEnvelope } from './envelope.js';
import { createCards } from './cards.js';

/**
 * Scène 3D (three.js) : même interface que la scène de secours 2D.
 * @returns {Promise<import('./index.js').Scene>}
 */
export async function createWebGLScene(layer, { reducedMotion = false, onCue, quality = 'high' } = {}) {
  const stage = createStage(layer, { quality });
  const { scene, renderer } = stage;

  // Reflets et lumières partagés par l'enveloppe et les cartes
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffe2b0, 1.4);
  key.position.set(2, 3, 5);
  const rim = new THREE.DirectionalLight(0x8a7bff, 0.9);
  rim.position.set(-3, 1, -2);
  scene.add(key, rim, new THREE.HemisphereLight(0x8899ff, 0x1a0f2e, 0.35));

  const sky = createSky(stage);
  const snow = createSnow(stage);
  const dust = createGoldDust(stage);
  const intro = createIntro(stage, { sky, snow, dust }, { onCue });
  const envelope = createEnvelope(stage, dust, { onCue, reducedMotion });
  const cards = await createCards(stage, dust, { onCue });
  document.body.classList.add('has-webgl');

  // Pour le débogage en développement.
  if (location.hostname === 'localhost') window.__stage = stage;

  return {
    playIntro: ({ short }) => intro.play({ short, reducedMotion }),
    skipIntro: () => intro.skip(),
    showEnvelope: (anchor) => envelope.show(anchor),
    shakeEnvelope: () => envelope.shake(),
    breakSeal: () => envelope.breakSeal(),
    runDraw: ({ names, target, anchor }) => cards.run({ names, target, anchor, reducedMotion }),
    showResultIdle: (target, anchor) => cards.showIdle(target, anchor),
    resetDraw: () => cards.reset(),
  };
}
