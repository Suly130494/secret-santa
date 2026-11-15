import { normalizeWord } from './normalize.js';
import { encodeJson, decodeJson } from './codec.js';
import { sealVault, openVault } from './crypto.js';

export const LINK_PREFIX = 'v1.';

export class InvalidLinkError extends Error {
  constructor(message = 'Lien invalide') {
    super(message);
    this.name = 'InvalidLinkError';
  }
}

/**
 * @typedef {{s: string, i: string, c: string}} Vault
 * @typedef {{v: 1, g: string, p: string[], q: string[], r: string, m: Vault, x: Vault}} Payload
 */

/** Construit le contenu d'un lien personnel. @returns {Promise<Payload>} */
export async function buildPayload({ giver, participants, clues, reward, target, ideas, magicWord, rescueCode }) {
  return {
    v: 1,
    g: giver,
    p: [...participants],
    q: [...clues],
    r: reward ?? '',
    m: await sealVault({ t: target, i: [...ideas] }, normalizeWord(magicWord)),
    x: await sealVault({ t: target }, normalizeWord(rescueCode)),
  };
}

/** @param {Payload} payload @returns {string} sans « # » */
export function encodeHash(payload) {
  return LINK_PREFIX + encodeJson(payload);
}

const isStr = (v) => typeof v === 'string';
const isVault = (v) => v && typeof v === 'object' && isStr(v.s) && isStr(v.i) && isStr(v.c);

/**
 * Nettoie un « # » : retire le « # » et tout ce qui suit la partie base64url
 * (point, parenthèse, espace encodé… collés par une appli de messagerie).
 */
export function cleanHash(hash) {
  const raw = String(hash ?? '').replace(/^#/, '').trim();
  if (!raw.startsWith(LINK_PREFIX)) return raw;
  return LINK_PREFIX + raw.slice(LINK_PREFIX.length).match(/^[A-Za-z0-9_-]*/)[0];
}

/** @param {string} hash @returns {Payload} */
export function decodeHash(hash) {
  const raw = cleanHash(hash);
  if (!raw.startsWith(LINK_PREFIX)) throw new InvalidLinkError('Préfixe inconnu');
  let p;
  try {
    p = decodeJson(raw.slice(LINK_PREFIX.length));
  } catch {
    throw new InvalidLinkError('Contenu illisible');
  }
  const valid = p && typeof p === 'object'
    && p.v === 1
    && isStr(p.g) && p.g.trim() !== ''
    && Array.isArray(p.p) && p.p.length >= 3 && p.p.every(isStr) && p.p.includes(p.g)
    && Array.isArray(p.q) && p.q.length === 3 && p.q.every(isStr)
    && isStr(p.r)
    && isVault(p.m) && isVault(p.x);
  if (!valid) throw new InvalidLinkError('Contenu incomplet');
  return p;
}

/**
 * Essaie le mot magique puis le code de secours.
 * @returns {Promise<{mode: 'magic', target: string, ideas: string[]} | {mode: 'rescue', target: string} | null>}
 */
export async function unlockPayload(payload, input) {
  const secret = normalizeWord(input);
  if (!secret) return null;
  const magic = await openVault(payload.m, secret);
  if (magic && isStr(magic.t)) return { mode: 'magic', target: magic.t, ideas: Array.isArray(magic.i) ? magic.i : [] };
  const rescue = await openVault(payload.x, secret);
  if (rescue && isStr(rescue.t)) return { mode: 'rescue', target: rescue.t };
  return null;
}

/** Identifiant court et stable d'un lien (FNV-1a 32 bits). */
export function linkId(hash) {
  let h = 0x811c9dc5;
  for (let k = 0; k < hash.length; k++) {
    h ^= hash.charCodeAt(k);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
