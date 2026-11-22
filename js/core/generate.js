import { normalizeWord } from './normalize.js';
import { drawAssignments, makeRescueCode } from './draw.js';
import { buildPayload, encodeHash } from './link.js';
import { CLUE_COUNT, normalizeClue, packClue } from './clues.js';

export class GenerateError extends Error {
  /** @param {'EMPTY_WORD'|'CLUES_MISSING'} code */
  constructor(code, message = code) {
    super(message);
    this.name = 'GenerateError';
    this.code = code;
  }
}

/**
 * Fait le tirage et fabrique un lien chiffré par participant.
 * Ne renvoie jamais les cibles : seulement les liens et les codes de secours.
 * @returns {Promise<{name: string, url: string, rescueCode: string}[]>}
 */
export async function generateLinks({ participants, exclusions = [], clues, reward = '', magicWord, baseUrl }) {
  if (!normalizeWord(magicWord)) throw new GenerateError('EMPTY_WORD');
  const cleanClues = (clues ?? []).map(normalizeClue);
  if (cleanClues.length !== CLUE_COUNT || cleanClues.some((c) => !c.d && !c.t)) throw new GenerateError('CLUES_MISSING');

  const people = participants.map((p) => ({
    name: String(p.name ?? '').trim(),
    ideas: (p.ideas ?? []).map((i) => String(i ?? '').trim()).filter(Boolean),
  }));
  const names = people.map((p) => p.name);
  const assignments = drawAssignments(names, exclusions);
  const ideasOf = new Map(people.map((p) => [p.name, p.ideas]));

  const codes = new Set();
  const links = [];
  for (const person of people) {
    let rescueCode;
    do { rescueCode = makeRescueCode(); } while (codes.has(rescueCode));
    codes.add(rescueCode);
    const target = assignments[person.name];
    const payload = await buildPayload({
      giver: person.name,
      participants: names,
      clues: cleanClues.map(packClue),
      reward: String(reward ?? '').trim(),
      target,
      ideas: ideasOf.get(target),
      magicWord,
      rescueCode,
    });
    links.push({ name: person.name, url: `${baseUrl}#${encodeHash(payload)}`, rescueCode });
  }
  return links;
}

/** Vrai si les liens pointeraient vers l'ordinateur de l'admin plutôt que vers le site en ligne. */
export function isLocalBaseUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'file:') return true;
    const host = u.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1' || host.endsWith('.localhost');
  } catch {
    return true;
  }
}
