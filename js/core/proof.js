import { normalizeWord } from './normalize.js';
import { SAFE_ALPHABET } from './codec.js';
import { sha256 } from './crypto.js';

/**
 * Sceau de preuve : 4 caractères impossibles à deviner sans le mot magique.
 * @returns {Promise<string>}
 */
export async function proofSeal(giver, magicWord) {
  const digest = await sha256(`${normalizeWord(magicWord)}|${normalizeWord(giver)}`);
  let out = '';
  for (let k = 0; k < 4; k++) out += SAFE_ALPHABET[digest[k] % SAFE_ALPHABET.length];
  return out;
}

/** @returns {Promise<boolean>} */
export async function verifySeal(giver, magicWord, code) {
  const clean = String(code ?? '').trim().toUpperCase();
  return clean === (await proofSeal(giver, magicWord));
}
