/**
 * Liens courts via is.gd (gratuit, sans compte, autorise les appels depuis une page web).
 * is.gd voit le lien complet : prénoms, indices et récompense en clair ; cible et idées restent chiffrées.
 */

export function isGdRequestUrl(longUrl) {
  return `https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`;
}

export function parseIsGdResponse(json) {
  if (json && typeof json.shorturl === 'string' && json.shorturl.startsWith('https://is.gd/')) return json.shorturl;
  throw new Error(json?.errormessage ? `is.gd : ${json.errormessage}` : 'is.gd : réponse inattendue');
}

/** @returns {Promise<string>} le lien court */
export async function shortenUrl(longUrl, fetchImpl = (...args) => fetch(...args)) {
  const res = await fetchImpl(isGdRequestUrl(longUrl));
  if (!res.ok) throw new Error(`is.gd indisponible (${res.status})`);
  return parseIsGdResponse(await res.json());
}
