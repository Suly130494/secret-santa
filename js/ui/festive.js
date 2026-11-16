import { debounce } from './dom.js';

const SVG = 'http://www.w3.org/2000/svg';
const BULB_COLORS = ['#ff4d5e', '#3ddc84', '#ffd27a', '#fff4dc'];

function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/** Point d'une courbe quadratique de Bézier. */
function quad(p0, p1, p2, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

/** Guirlande lumineuse en festons en haut de l'écran. */
function buildGarland(width) {
  const height = 46;
  const root = svg('svg', { class: 'garland-svg', viewBox: `0 0 ${width} ${height}`, width, height, 'aria-hidden': 'true' });
  const swag = width < 500 ? 95 : 130;
  const count = Math.max(2, Math.round(width / swag));
  const step = width / count;
  let colorIndex = 0;
  for (let i = 0; i < count; i++) {
    const p0 = [i * step, 6];
    const p2 = [(i + 1) * step, 6];
    const p1 = [(i + 0.5) * step, 30];
    root.append(svg('path', { d: `M${p0} Q${p1} ${p2}`, class: 'garland-wire' }));
    const bulbs = 3;
    for (let b = 1; b <= bulbs; b++) {
      const t = b / (bulbs + 1);
      const [x, y] = quad(p0, p1, p2, t);
      const color = BULB_COLORS[colorIndex++ % BULB_COLORS.length];
      const g = svg('g', { class: 'bulb', transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`, style: `--c:${color};--d:${(Math.random() * 2.4).toFixed(2)}s` });
      g.append(svg('circle', { cx: 0, cy: 7, r: 7.5, class: 'bulb-halo' }));
      g.append(svg('rect', { x: -1.8, y: -1, width: 3.6, height: 3, rx: 0.8, class: 'bulb-cap' }));
      g.append(svg('ellipse', { cx: 0, cy: 6.5, rx: 2.8, ry: 4.4, class: 'bulb-glass' }));
      root.append(g);
    }
  }
  return root;
}

/** Silhouettes de sapins enneigés, avec quelques lumières. */
function buildForest(width) {
  const height = 96;
  const root = svg('svg', { class: 'forest-svg', viewBox: `0 0 ${width} ${height}`, width, height, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  root.append(svg('path', { d: `M0 ${height} L0 ${height - 14} Q${width / 2} ${height - 24} ${width} ${height - 12} L${width} ${height} Z`, class: 'forest-snow' }));
  let x = -10;
  while (x < width + 20) {
    const tall = 46 + Math.random() * 40;
    const wide = tall * (0.5 + Math.random() * 0.12);
    const base = height - 8 - Math.random() * 6;
    const tree = svg('g', { class: 'tree' });
    for (let k = 0; k < 3; k++) {
      const top = base - tall + k * tall * 0.24;
      const bottom = base - tall * (0.46 - k * 0.23);
      const half = (wide / 2) * (0.55 + k * 0.22);
      tree.append(svg('path', { d: `M${x} ${top} L${x + half} ${bottom} L${x - half} ${bottom} Z`, class: 'tree-tier' }));
      tree.append(svg('path', { d: `M${x - half * 0.9} ${bottom - 1} Q${x} ${bottom - 7} ${x + half * 0.9} ${bottom - 1}`, class: 'tree-snow' }));
    }
    if (Math.random() < 0.55) {
      for (let k = 0; k < 3; k++) {
        tree.append(svg('circle', {
          cx: x + (Math.random() - 0.5) * wide * 0.5, cy: base - tall * (0.15 + Math.random() * 0.55), r: 1.6,
          class: 'tree-light', style: `--c:${BULB_COLORS[Math.floor(Math.random() * 3)]};--d:${(Math.random() * 3).toFixed(2)}s`,
        }));
      }
    }
    root.append(tree);
    x += wide * (0.55 + Math.random() * 0.35);
  }
  return root;
}

/** Ajoute la guirlande (et, si demandé, la forêt) au décor de la page. */
export function mountFestive({ forest = false } = {}) {
  const garland = document.createElement('div');
  garland.className = 'garland';
  garland.setAttribute('aria-hidden', 'true');
  const trees = document.createElement('div');
  trees.className = 'forest';
  trees.setAttribute('aria-hidden', 'true');
  const render = () => {
    const width = Math.max(320, window.innerWidth);
    garland.replaceChildren(buildGarland(width));
    if (forest) trees.replaceChildren(buildForest(width));
  };
  render();
  document.body.append(garland);
  if (forest) document.getElementById('stage').after(trees);
  window.addEventListener('resize', debounce(render, 250));
}
