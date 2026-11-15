import { normalizeWord } from './normalize.js';
import { SAFE_ALPHABET } from './codec.js';
import { cryptoRandom } from './crypto.js';

export class DrawError extends Error {
  /** @param {'TOO_FEW'|'EMPTY_NAME'|'DUPLICATE'|'IMPOSSIBLE'} code */
  constructor(code, message = code) {
    super(message);
    this.name = 'DrawError';
    this.code = code;
  }
}

function shuffled(list, rng) {
  const out = [...list];
  for (let k = out.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [out[k], out[j]] = [out[j], out[k]];
  }
  return out;
}

/**
 * Tire au sort qui offre à qui : personne ne se tire soi-même, chacun reçoit une fois.
 * @param {string[]} names
 * @param {[string, string][]} exclusions paires [donneur, receveur] interdites
 * @param {() => number} rng
 * @returns {Record<string, string>} donneur → receveur
 */
export function drawAssignments(names, exclusions = [], rng = cryptoRandom) {
  const people = names.map((n) => String(n ?? '').trim());
  if (people.some((n) => normalizeWord(n) === '')) throw new DrawError('EMPTY_NAME');
  if (people.length < 3) throw new DrawError('TOO_FEW');
  const keys = people.map(normalizeWord);
  if (new Set(keys).size !== keys.length) throw new DrawError('DUPLICATE');

  const banned = new Set(exclusions.map(([g, r]) => `${normalizeWord(g)}>${normalizeWord(r)}`));
  const allowed = (g, r) => g !== r && !banned.has(`${keys[g]}>${keys[r]}`);

  const givers = shuffled(people.map((_, k) => k), rng);
  const taken = new Set();
  const result = new Map();

  const place = (pos) => {
    if (pos === givers.length) return true;
    const g = givers[pos];
    for (const r of shuffled(people.map((_, k) => k), rng)) {
      if (taken.has(r) || !allowed(g, r)) continue;
      taken.add(r);
      result.set(g, r);
      if (place(pos + 1)) return true;
      taken.delete(r);
      result.delete(g);
    }
    return false;
  };

  if (!place(0)) throw new DrawError('IMPOSSIBLE');
  const out = {};
  people.forEach((name, g) => { out[name] = people[result.get(g)]; });
  return out;
}

/** Code de secours personnel, ex. « NOEL-K7QM2X » (6 caractères : ~30 bits, trop long à deviner). */
export function makeRescueCode(rng = cryptoRandom) {
  let code = 'NOEL-';
  for (let k = 0; k < 6; k++) code += SAFE_ALPHABET[Math.floor(rng() * SAFE_ALPHABET.length)];
  return code;
}
