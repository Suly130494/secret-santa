import { decodeHash } from './link.js';

/**
 * Quelle vue afficher pour ce « # » d'adresse ?
 * @returns {{view: 'landing'} | {view: 'admin'} | {view: 'broken'} | {view: 'player', hash: string, payload: object}}
 */
export function routeFor(hash) {
  const raw = String(hash ?? '').replace(/^#/, '').trim();
  if (raw === '') return { view: 'landing' };
  if (raw === 'admin') return { view: 'admin' };
  try {
    return { view: 'player', hash: raw, payload: decodeHash(raw) };
  } catch {
    return { view: 'broken' };
  }
}
