/**
 * Met une saisie au format « ce qui compte » : minuscules, sans accents,
 * sans espaces ni ponctuation. « Flocon d’Hiver » → « flocondhiver ».
 * @param {string|undefined} input
 * @returns {string}
 */
export function normalizeWord(input) {
  if (typeof input !== 'string') return '';
  return input
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}
