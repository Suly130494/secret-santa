import * as THREE from 'three';
import { gsap } from 'gsap';
import { createGlow } from './particles.js';

const STAR_POS = new THREE.Vector3(0, 0.95, 0);
const AMBIENT_SPREAD = new THREE.Vector3(3.4, 2.6, 1.6);

/**
 * Ouverture : le ciel s'allume, la neige tombe, un tourbillon d'or se condense en étoile.
 */
export function createIntro(stage, { sky, snow, dust, moon, sleigh }, { onCue } = {}) {
  const star = createGlow(0xffd98a, 3.2);
  star.visible = false;
  star.position.copy(STAR_POS);
  stage.scene.add(star);

  let tl = null;
  let finish = null;

  function finalState() {
    Object.assign(sky.state, { stars: 1, aurora: 1, light: 1 });
    snow.state.opacity = 0.85;
    if (moon) moon.state.opacity = 1;
    star.visible = false;
    dust.setAmbient(140, new THREE.Vector3(0, 0.4, 0), AMBIENT_SPREAD);
  }

  return {
    play({ short = false, reducedMotion = false } = {}) {
      tl?.kill();
      return new Promise((resolve) => {
        finish = () => {
          finish = null;
          finalState();
          resolve();
        };
        if (short || reducedMotion) {
          tl = gsap.timeline({ onComplete: () => finish?.() })
            .to(sky.state, { stars: 1, aurora: 1, light: 1, duration: 1.1, ease: 'power2.out' }, 0)
            .to(snow.state, { opacity: 0.85, duration: 1.1 }, 0);
          if (moon) tl.to(moon.state, { opacity: 1, duration: 1.1 }, 0);
          return;
        }
        star.visible = true;
        star.material.opacity = 1;
        star.scale.setScalar(0.001);
        tl = gsap.timeline({ onComplete: () => finish?.() })
          .to(sky.state, { light: 1, duration: 2.6, ease: 'sine.inOut' }, 0)
          .to(sky.state, { stars: 1, duration: 1.3, ease: 'power1.out' }, 0)
          .to(snow.state, { opacity: 0.85, duration: 1.4 }, 0.8)
          .to(sky.state, { aurora: 1, duration: 2.6, ease: 'sine.inOut' }, 0.6)
          .to(moon?.state ?? {}, { opacity: 1, duration: 1.4, ease: 'sine.out' }, 0.2)
          .call(() => {
            if (!sleigh) return;
            onCue?.('sleigh');
            sleigh.fly(2.8);
          }, null, 0.5)
          .call(() => dust.swirlTo(STAR_POS, 2.0, 480), null, 1.1)
          .to(star.scale, { x: 1.7, y: 1.7, duration: 0.7, ease: 'back.out(3)' }, 2.9)
          .call(() => {
            dust.burst(STAR_POS, { count: 280, speed: 2.8, life: 1.5 });
            stage.bloomPulse(1.0, 0.9);
            onCue?.('shimmer');
          }, null, 3.05)
          .call(() => dust.setAmbient(140, new THREE.Vector3(0, 0.4, 0), AMBIENT_SPREAD), null, 3.2)
          .to(star.scale, { x: 1.0, y: 1.0, duration: 0.6, ease: 'sine.inOut' }, 3.6)
          .to(star.material, { opacity: 0, duration: 0.6, ease: 'power1.in' }, 4.1);
      });
    },
    skip() {
      if (!finish) return;
      tl?.progress(1, true);
      tl?.kill();
      finish();
    },
  };
}
