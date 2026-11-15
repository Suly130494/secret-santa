/**
 * Niveau de qualité de départ. Le garde-fou de stage.js rétrograde ensuite si ça rame.
 * @returns {'high'|'low'}
 */
export function detectQuality() {
  const params = new URLSearchParams(location.search);
  if (params.has('low')) return 'low';
  if (params.has('high')) return 'high';
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;
  return cores <= 2 || memory <= 2 ? 'low' : 'high';
}

export const PARTICLES = {
  high: { snow: 1400, stars: 1200, dust: 1500 },
  low: { snow: 600, stars: 600, dust: 600 },
};
