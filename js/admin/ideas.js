/** Nombre de cases « idée ou thème » par participant dans la page admin. */
export const MIN_IDEAS = 3;
export const MAX_IDEAS = 10;

/** Remet une liste d'idées stockée dans une forme sûre : entre 3 et 10 cases, toutes des textes. */
export function sanitizeIdeas(list) {
  const items = (Array.isArray(list) ? list : []).slice(0, MAX_IDEAS).map((v) => (typeof v === 'string' ? v : ''));
  while (items.length < MIN_IDEAS) items.push('');
  return items;
}

export const canAddIdea = (ideas) => ideas.length < MAX_IDEAS;

export const canRemoveIdea = (ideas) => ideas.length > MIN_IDEAS;

/** Prénoms des participants qui ont moins de 3 idées remplies. */
export function incompleteIdeas(participants) {
  return participants
    .filter((p) => p.name.trim() && p.ideas.filter((i) => i.trim()).length < MIN_IDEAS)
    .map((p) => p.name.trim());
}
