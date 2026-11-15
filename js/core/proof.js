import { normalizeWord } from './normalize.js';
import { SAFE_ALPHABET } from './codec.js';
import { PBKDF2_ITERATIONS } from './crypto.js';

/**
 * Sceau de preuve : 4 caractères impossibles à deviner sans le mot magique.
 * Dérivé par PBKDF2 (même coût que le déchiffrement du lien) : un sceau publié dans le groupe
 * ne permet pas de retrouver le mot magique plus vite qu'en attaquant son propre lien.
 * @returns {Promise<string>}
 */
export async function proofSeal(giver, magicWord) {
  const subtle = globalThis.crypto.subtle;
  const base = await subtle.importKey('raw', new TextEncoder().encode(normalizeWord(magicWord)), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(`sceau|${normalizeWord(giver)}`), iterations: PBKDF2_ITERATIONS },
    base,
    32,
  ));
  return [...bits].map((b) => SAFE_ALPHABET[b % SAFE_ALPHABET.length]).join('');
}

/** @returns {Promise<boolean>} */
export async function verifySeal(giver, magicWord, code) {
  const clean = String(code ?? '').trim().toUpperCase();
  return clean === (await proofSeal(giver, magicWord));
}
