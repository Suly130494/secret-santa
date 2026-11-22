/** Logique pure du parcours (sans DOM), testée sous Node. */
import { CLUE_COUNT } from '../core/clues.js';

/** Remet une progression stockée dans une forme sûre. */
export function sanitizeProgress(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  return {
    revealed: Array.isArray(p.revealed) ? p.revealed.filter((i) => Number.isInteger(i) && i >= 0 && i < CLUE_COUNT) : [],
    secret: typeof p.secret === 'string' ? p.secret : undefined,
    mode: p.mode === 'magic' || p.mode === 'rescue' ? p.mode : undefined,
    foundAt: typeof p.foundAt === 'string' ? p.foundAt : null,
    drawn: p.drawn === true,
  };
}

/**
 * Écran où reprendre quand on revient sur son lien.
 * On ne saute à la carte retournée que si la pioche a déjà eu lieu.
 * @returns {'sealed'|'victory'|'ready'|'result'}
 */
export function resumeScreen(progress, unlocked) {
  if (!unlocked) return 'sealed';
  if (progress?.drawn) return 'result';
  return unlocked.mode === 'magic' ? 'victory' : 'ready';
}
