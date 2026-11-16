/**
 * Compte à rebours jusqu'au minuit du réveillon (25 décembre, 0 h, heure du téléphone).
 * Du 25 au 31 décembre : c'est Noël. À partir du 1er janvier : Noël suivant.
 * @param {Date} now
 * @returns {{phase: 'before', target: Date, days: number, hours: number, minutes: number, seconds: number} | {phase: 'christmas'}}
 */
export function christmasCountdown(now) {
  const year = now.getFullYear();
  const christmas = new Date(year, 11, 25, 0, 0, 0);
  if (now >= christmas) return { phase: 'christmas' };
  const total = Math.ceil((christmas.getTime() - now.getTime()) / 1000);
  return {
    phase: 'before',
    target: christmas,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
