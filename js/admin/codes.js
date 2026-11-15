/** Texte des codes de secours, à garder dans ses notes avant d'effacer le navigateur. */
export function rescueCodesText(links) {
  return ['Codes de secours du Secret Santa', ...links.map((l) => `${l.name} : ${l.rescueCode}`)].join('\n');
}
