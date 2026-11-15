import { decodeHash, cleanHash } from './link.js';

/**
 * Quelle vue afficher pour ce « # » d'adresse ?
 * @returns {{view: 'landing'} | {view: 'admin'} | {view: 'broken'} | {view: 'player', hash: string, payload: object}}
 */
export function routeFor(hash) {
  const raw = cleanHash(hash);
  if (raw === '') return { view: 'landing' };
  if (raw === 'admin') return { view: 'admin' };
  try {
    return { view: 'player', hash: raw, payload: decodeHash(raw) };
  } catch {
    return { view: 'broken' };
  }
}
