import { h } from '../ui/dom.js';

const BRUSH = 24; // rayon du pinceau en pixels CSS
const THRESHOLD = 0.5;
const GRID = 24;

function paintFoil(ctx, w, h_) {
  const g = ctx.createLinearGradient(0, 0, w, h_);
  g.addColorStop(0, '#f7d27a');
  g.addColorStop(0.45, '#c9962e');
  g.addColorStop(0.7, '#e9bd5c');
  g.addColorStop(1, '#f3d58b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h_);
  // reflets diagonaux
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#fff6d8';
  for (let x = -h_; x < w; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, h_);
    ctx.lineTo(x + h_, 0);
    ctx.lineTo(x + h_ + 6, 0);
    ctx.lineTo(x + 6, h_);
    ctx.fill();
  }
  // mouchetures
  for (let k = 0; k < (w * h_) / 60; k++) {
    ctx.globalAlpha = Math.random() * 0.35;
    ctx.fillStyle = Math.random() > 0.5 ? '#fff3c9' : '#8a5e12';
    ctx.fillRect(Math.random() * w, Math.random() * h_, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;
  // étoiles et mention
  const unit = Math.min(w, h_);
  ctx.fillStyle = 'rgba(92, 58, 6, 0.75)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(unit * 0.12)}px Outfit, system-ui, sans-serif`;
  ctx.fillText('Gratte-moi', w / 2, h_ / 2 + unit * 0.02);
  ctx.font = `${Math.round(unit * 0.2)}px serif`;
  ctx.fillText('✦', w / 2, h_ / 2 - unit * 0.2);
  ctx.font = `${Math.round(unit * 0.1)}px serif`;
  ctx.fillText('✦  ✦', w / 2, h_ / 2 + unit * 0.2);
}

/** Réduit la police jusqu'à ce que le texte tienne dans sa case. */
function fitText(el) {
  let size = 17;
  el.style.fontSize = `${size}px`;
  while (size > 10 && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) {
    size -= 0.5;
    el.style.fontSize = `${size}px`;
  }
}

/**
 * Case à gratter : une feuille d'or en canvas au-dessus d'un texte.
 * @param {HTMLElement} el
 * @param {{text: string, revealed?: boolean, label?: string, onScratch?: (level: number) => void, onReveal?: () => void, onOpen?: () => void}} opts
 */
export function createScratchCard(el, { text, revealed = false, label = 'Case à gratter', onScratch, onReveal, onOpen }) {
  el.classList.add('scratch');
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  const content = h('p', { class: 'scratch-text' }, text);
  const canvas = h('canvas', { class: 'scratch-foil', 'aria-hidden': 'true' });
  el.replaceChildren(content, canvas);

  let done = false;
  let drawing = false;
  let last = null;
  let lastCheck = 0;
  let ctx = null;
  let dpr = 1;

  const setLabel = () => el.setAttribute('aria-label', done ? `${label} : ${text}` : `${label}. Gratte-la, ou appuie sur Entrée pour la révéler.`);

  const fit = () => fitText(content);
  (document.fonts?.ready ?? Promise.resolve()).then(fit);
  requestAnimationFrame(fit);

  function setup() {
    const rect = el.getBoundingClientRect();
    if (!rect.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintFoil(ctx, rect.width, rect.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = BRUSH * 2;
  }

  function point(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function stroke(from, to) {
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(to.x, to.y, BRUSH, 0, Math.PI * 2);
    ctx.fill();
  }

  function clearedRatio() {
    if (!ctx) return 0;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let clear = 0;
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const x = Math.floor(((gx + 0.5) / GRID) * width);
        const y = Math.floor(((gy + 0.5) / GRID) * height);
        if (data[(y * width + x) * 4 + 3] < 40) clear++;
      }
    }
    return clear / (GRID * GRID);
  }

  function check(force = false) {
    const t = performance.now();
    if (!force && t - lastCheck < 120) return;
    lastCheck = t;
    if (clearedRatio() >= THRESHOLD) reveal();
  }

  function reveal() {
    if (done) return;
    done = true;
    drawing = false;
    el.classList.add('is-revealed');
    canvas.classList.add('is-gone');
    setTimeout(() => canvas.remove(), 450);
    setLabel();
    onScratch?.(0);
    onReveal?.();
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (done) return;
    if (!ctx) setup();
    drawing = true;
    canvas.setPointerCapture?.(e.pointerId);
    last = point(e);
    stroke(last, last);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing || done) return;
    const p = point(e);
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    stroke(last, p);
    last = p;
    onScratch?.(Math.min(1, dist / 18));
    check();
  });
  const stop = () => {
    if (!drawing) return;
    drawing = false;
    onScratch?.(0);
    check(true);
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  el.addEventListener('click', () => { if (done) onOpen?.(); });
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (done) onOpen?.();
    else reveal();
  });

  if (revealed) {
    done = true;
    el.classList.add('is-revealed');
    canvas.remove();
  } else {
    requestAnimationFrame(setup);
    (document.fonts?.ready ?? Promise.resolve()).then(() => { if (!done && !drawing) setup(); });
  }
  setLabel();

  return {
    reveal,
    destroy() { el.replaceChildren(); },
  };
}
