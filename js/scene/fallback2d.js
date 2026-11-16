import { h, delay } from '../ui/dom.js';

// Contenu statique (aucune donnée utilisateur) : innerHTML sans risque.
const ENVELOPE_SVG = `
<svg viewBox="0 0 320 210" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="fb-paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbf1dc"/><stop offset="1" stop-color="#e8d6b2"/>
    </linearGradient>
    <linearGradient id="fb-flap" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6e7c8"/><stop offset="1" stop-color="#e2cda4"/>
    </linearGradient>
    <radialGradient id="fb-wax" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#e2384f"/><stop offset="0.6" stop-color="#b3122e"/><stop offset="1" stop-color="#6e0718"/>
    </radialGradient>
  </defs>
  <rect x="4" y="4" width="312" height="202" rx="12" fill="url(#fb-paper)" stroke="#d9b56a" stroke-width="2"/>
  <rect x="12" y="12" width="296" height="186" rx="8" fill="none" stroke="#d9b56a" stroke-opacity=".45" stroke-width="1"/>
  <path d="M8 202 L160 112 L312 202" fill="none" stroke="#a07832" stroke-opacity=".3" stroke-width="1.5"/>
  <g class="fb-flap"><path d="M6 8 L160 122 L314 8 Z" fill="url(#fb-flap)" stroke="#d9b56a" stroke-width="2" stroke-linejoin="round"/></g>
  <g class="fb-holly">
    <path d="M160 150 q-24 4 -44 22 q8 -2 12 4 q4 -8 10 -6 q2 -8 10 -8 q0 -8 12 -12 z" fill="#1f7a43" stroke="#145a30" stroke-width="1.5"/>
    <path d="M160 150 q24 4 44 22 q-8 -2 -12 4 q-4 -8 -10 -6 q-2 -8 -10 -8 q0 -8 -12 -12 z" fill="#23864a" stroke="#145a30" stroke-width="1.5"/>
    <circle cx="160" cy="154" r="5.5" fill="#d42a3a"/><circle cx="152" cy="159" r="5" fill="#c41e3a"/><circle cx="168" cy="159" r="5" fill="#d42a3a"/>
  </g>
  <g class="fb-seal">
    <path class="fb-seal-l" d="M160 92 a30 30 0 0 0 0 60 l-3 -10 l4 -8 l-5 -9 l4 -9 l-4 -12 z" fill="url(#fb-wax)"/>
    <path class="fb-seal-r" d="M160 92 a30 30 0 0 1 0 60 l-3 -10 l4 -8 l-5 -9 l4 -9 l-4 -12 z" fill="url(#fb-wax)"/>
    <text class="fb-seal-star" x="160" y="131" text-anchor="middle" font-size="26" fill="#ffd98a">✦</text>
  </g>
</svg>`;

/**
 * Scène de secours en DOM/CSS (sans WebGL), même interface que la scène 3D.
 * @param {HTMLElement} layer
 * @param {{reducedMotion?: boolean, onCue?: (cue: string) => void}} opts
 */
export function createFallbackScene(layer, { reducedMotion = false, onCue } = {}) {
  let envelope = null;
  let deck = null;
  let skipIntroNow = null;

  const flakes = reducedMotion ? [] : Array.from({ length: 40 }, () => {
    const size = 2 + Math.random() * 4;
    return h('span', {
      class: 'fb-flake',
      style: `left:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-duration:${8 + Math.random() * 10}s;animation-delay:${-Math.random() * 18}s;opacity:${0.35 + Math.random() * 0.5}`,
    });
  });
  layer.replaceChildren(h('div', { class: 'fb-sky' }, flakes));

  function confetti(anchor) {
    if (reducedMotion) return;
    const colors = ['#ffd98a', '#d8263f', '#1f9d55', '#ffffff', '#f5c86a', '#c41e3a'];
    const box = h('div', { class: 'fb-confetti' }, Array.from({ length: 44 }, (_, i) => h('span', {
      style: `--x:${(Math.random() - 0.5) * 320}px;--y:${-120 - Math.random() * 160}px;--r:${Math.random() * 720}deg;background:${colors[i % colors.length]};animation-delay:${Math.random() * 0.15}s`,
    })));
    anchor.append(box);
    setTimeout(() => box.remove(), 2600);
  }

  function card(name, flipped = false) {
    return h('div', { class: `fb-card${flipped ? ' is-flipped' : ''}` },
      h('div', { class: 'fb-card-inner' },
        h('div', { class: 'fb-face fb-back' }, h('span', { class: 'fb-ornament' }, '🎄')),
        h('div', { class: 'fb-face fb-front' }, h('span', { class: 'fb-star' }, '✦'), h('span', { class: 'fb-name' }, name ?? '')),
      ),
    );
  }

  return {
    async playIntro({ short }) {
      const star = h('div', { class: `fb-intro-star${short ? ' is-short' : ''}` });
      layer.append(star);
      await Promise.race([delay(short ? 600 : 3200), new Promise((r) => { skipIntroNow = r; })]);
      star.remove();
    },

    skipIntro() { skipIntroNow?.(); },

    showEnvelope(anchor) {
      envelope = h('div', { class: 'fb-envelope' });
      envelope.innerHTML = ENVELOPE_SVG;
      anchor.replaceChildren(envelope);
    },

    async shakeEnvelope() {
      onCue?.('error');
      if (!envelope) return;
      envelope.classList.remove('is-shaking');
      void envelope.offsetWidth;
      envelope.classList.add('is-shaking');
      await delay(600);
      envelope.classList.remove('is-shaking');
    },

    async breakSeal() {
      if (!envelope) return;
      onCue?.('crack');
      envelope.classList.add('is-open');
      await delay(reducedMotion ? 300 : 1400);
      envelope.remove();
      envelope = null;
    },

    async runDraw({ names, target, anchor }) {
      deck?.remove();
      const order = [...names];
      const targetIndex = order.indexOf(target);
      deck = h('div', { class: `fb-deck${reducedMotion ? ' is-reduced' : ''}` },
        order.map((n, i) => {
          const c = card(n === target ? n : '');
          c.style.setProperty('--i', String(i));
          c.style.setProperty('--n', String(order.length));
          if (i === targetIndex) c.classList.add('is-target');
          return c;
        }),
      );
      anchor.replaceChildren(deck);
      onCue?.('whoosh');
      void deck.offsetWidth;
      deck.classList.add('is-shuffling');
      onCue?.('shimmer');
      await delay(reducedMotion ? 500 : 2600);
      deck.classList.remove('is-shuffling');
      deck.classList.add('is-picked');
      await delay(reducedMotion ? 200 : 700);
      deck.querySelector('.is-target')?.classList.add('is-flipped');
      onCue?.('flip');
      confetti(anchor);
      await delay(reducedMotion ? 300 : 900);
    },

    showResultIdle(target, anchor) {
      deck = h('div', { class: 'fb-deck is-picked is-idle' }, card(target, true));
      deck.firstElementChild.classList.add('is-target');
      anchor.replaceChildren(deck);
    },

    resetDraw() {
      deck?.remove();
      deck = null;
    },

    celebrate() {
      confetti(deck?.parentElement ?? layer);
    },
  };
}
