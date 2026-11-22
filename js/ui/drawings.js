/**
 * Dessins du rébus, tracés à la main en SVG (encre = couleur du texte de la carte, touches d'or et de rouge).
 * Identifiants volontairement neutres : ni le code du site ni le lien ne nomment ce que montre l'image.
 * Le lien ne transporte que l'identifiant ; le dessin lui-même est déjà dans la page.
 */

const open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';

const A = `${open}
<ellipse cx="60" cy="91" rx="38" ry="4.5" fill="currentColor" opacity=".08" stroke="none"/>
<path d="M60 9C63 23 81 31 83 51C85 68 74 80 60 80C46 80 35 69 37 55C38 45 45 40 47 31C50 38 52 42 55 45C54 32 56 20 60 9Z" fill="#e8562a"/>
<path d="M61 35C64 46 73 52 72 63C71 72 66 78 60 78C53 78 48 72 49 65C50 59 54 55 55 49C57 53 58 55 59 57C59 49 59 42 61 35Z" fill="#f6c443" stroke-width="2"/>
<g transform="rotate(-11 60 82)"><rect x="22" y="76.5" width="76" height="11" rx="5.5" fill="#b0713a"/><ellipse cx="92.5" cy="82" rx="3" ry="4" fill="#e7b77a" stroke-width="1.8"/></g>
<g transform="rotate(11 60 82)"><rect x="22" y="76.5" width="76" height="11" rx="5.5" fill="#8f5729"/><ellipse cx="27.5" cy="82" rx="3" ry="4" fill="#e7b77a" stroke-width="1.8"/></g>
<path d="M88 30l4-5M31 33l-4-5M94 46l5-1M24 48l-5-1" stroke="#e3a92f"/>
</svg>`;

const B = `${open}
<ellipse cx="62" cy="90" rx="34" ry="4.5" fill="currentColor" opacity=".08" stroke="none"/>
<path d="M60 12L92 28L60 44L28 28Z" fill="#fffaf0"/>
<path d="M28 28L60 44L60 86L28 70Z" fill="#f1e0bd"/>
<path d="M60 44L92 28L92 70L60 86Z" fill="#e2c890"/>
<ellipse cx="60" cy="28" rx="5.5" ry="3.2" fill="#c0392b" stroke="none"/>
<g fill="currentColor" stroke="none">
<ellipse cx="37" cy="44" rx="3.1" ry="3.8" transform="rotate(-8 37 44)"/>
<ellipse cx="51" cy="70" rx="3.1" ry="3.8" transform="rotate(-8 51 70)"/>
<ellipse cx="68.6" cy="51" rx="3.1" ry="3.8" transform="rotate(8 68.6 51)"/>
<ellipse cx="76" cy="57" rx="3.1" ry="3.8" transform="rotate(8 76 57)"/>
<ellipse cx="83.4" cy="63" rx="3.1" ry="3.8" transform="rotate(8 83.4 63)"/>
</g>
</svg>`;

const C = `${open}
<path d="M3 50C18 40 36 42 52 47C70 52 92 38 117 45V88Q117 97 108 97H12Q3 97 3 88Z" fill="#dfe6bf" stroke="none"/>
<path d="M3 50C18 40 36 42 52 47C70 52 92 38 117 45"/>
<path d="M67 46C61 50 56 52 57 57C58 62 66 63 64 69C62 76 47 78 45 85C43 90 41 94 40 97H80C79 93 69 90 68 84C67 78 79 75 76 68C73 62 63 61 63 56C63 52 67 49 69 46Z" fill="#ecd29b"/>
<g fill="#cfa96a" stroke="none"><ellipse cx="55" cy="90" rx="2.6" ry="1.6"/><ellipse cx="66" cy="94" rx="2" ry="1.3"/><ellipse cx="70" cy="72" rx="1.8" ry="1.1"/><ellipse cx="58" cy="80" rx="1.6" ry="1"/></g>
<path d="M21 90V58" stroke="#8f5729" stroke-width="4"/>
<path d="M10 56H33L39 61.5L33 67H10Z" fill="#f6c443"/>
<path d="M88 80l2-6 2 6M94 82l1.5-5 1.5 5M24 96l2-6 2 6M98 60l1.5-4.5 1.5 4.5M10 76l1.5-5 1.5 5" stroke="#5f8a3c" stroke-width="2"/>
</svg>`;

const D = `${open}
<path d="M54 6C54 26 50 41 45 50C32 54 27 68 34 76C40 83 50 81 55 77C57 81 63 81 65 77C70 81 80 83 86 76C93 68 88 54 75 50C70 41 66 26 66 6" fill="#f2c4a0"/>
<path d="M42 60C39 64 40 69 44 71M78 60C81 64 80 69 76 71" stroke-width="2"/>
<g fill="currentColor" stroke="none"><ellipse cx="50" cy="73.5" rx="4.6" ry="2.6" transform="rotate(22 50 73.5)"/><ellipse cx="70" cy="73.5" rx="4.6" ry="2.6" transform="rotate(-22 70 73.5)"/></g>
<ellipse cx="63" cy="61" rx="5" ry="3.4" fill="#fff" opacity=".65" stroke="none"/>
<path d="M20 22C25 16 34 16 39 22M81 22C86 16 95 16 100 22" stroke-width="2.4"/>
<path d="M23 18l-2-4M29.5 15.5V11M36 18l2-4M84 18l-2-4M90.5 15.5V11M97 18l2-4" stroke-width="1.8"/>
<ellipse cx="24" cy="38" rx="7" ry="4" fill="#e88a7a" opacity=".45" stroke="none"/>
<ellipse cx="96" cy="38" rx="7" ry="4" fill="#e88a7a" opacity=".45" stroke="none"/>
</svg>`;

/** @type {{id: string, svg: string}[]} */
export const DRAWINGS = [
  { id: 'a', svg: A },
  { id: 'b', svg: B },
  { id: 'c', svg: C },
  { id: 'd', svg: D },
];

/** SVG d'un dessin, ou '' si l'identifiant est inconnu. */
export function drawingSvg(id) {
  return DRAWINGS.find((d) => d.id === id)?.svg ?? '';
}

/**
 * Élément <svg> prêt à insérer, ou null. Seuls les SVG ci-dessus sont analysés :
 * l'identifiant venu du lien sert uniquement à choisir parmi eux.
 */
export function drawingNode(id) {
  const svg = drawingSvg(id);
  if (!svg) return null;
  const tpl = document.createElement('template');
  tpl.innerHTML = svg;
  return tpl.content.firstElementChild;
}
