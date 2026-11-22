/**
 * Les cases de l'énigme. Chacune montre un dessin, un texte, ou les deux.
 * Forme de travail : {d: identifiant du dessin ('' si aucun), t: texte}.
 * Dans le lien, une case de texte seul reste une simple chaîne (comme les anciens liens à 3 cases) ;
 * une case avec dessin devient {d} ou {d, t}. Le lien ne transporte que l'identifiant, jamais l'image.
 */

export const CLUE_COUNT = 4;

const DRAWING_ID = /^[a-z0-9-]{1,24}$/;
const drawingIdOf = (raw) => (raw && typeof raw.d === 'string' && DRAWING_ID.test(raw.d) ? raw.d : '');

/** Case propre et rognée, quelle que soit sa forme d'origine. @returns {{d: string, t: string}} */
export function normalizeClue(raw) {
  if (typeof raw === 'string') return { d: '', t: raw.trim() };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { d: '', t: '' };
  return { d: drawingIdOf(raw), t: typeof raw.t === 'string' ? raw.t.trim() : '' };
}

/** Forme compacte pour le lien. */
export function packClue(clue) {
  const { d, t } = normalizeClue(clue);
  if (!d) return t;
  return t ? { d, t } : { d };
}

/** Vrai si une case lue dans un lien a une forme que packClue aurait pu produire. */
export function isPackedClue(v) {
  if (typeof v === 'string') return true;
  return !!v && typeof v === 'object' && !Array.isArray(v)
    && drawingIdOf(v) !== ''
    && (v.t === undefined || typeof v.t === 'string');
}

/** Brouillon de l'admin : toujours CLUE_COUNT cases {d, t}, texte laissé tel quel pendant la saisie. */
export function sanitizeDraftClues(list) {
  const src = Array.isArray(list) ? list : [];
  return Array.from({ length: CLUE_COUNT }, (_, k) => {
    const raw = src[k];
    if (typeof raw === 'string') return { d: '', t: raw };
    return { d: drawingIdOf(raw), t: raw && typeof raw.t === 'string' ? raw.t : '' };
  });
}
