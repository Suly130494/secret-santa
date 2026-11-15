const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « le 3 décembre à 21h37 », « le 1er décembre à 9h05 ». */
export function formatFoundAt(date) {
  const day = date.getDate() === 1 ? '1er' : String(date.getDate());
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `le ${day} ${MONTHS[date.getMonth()]} à ${date.getHours()}h${minutes}`;
}

/** Phrases de victoire. `when` est en minuscules (« le 3 décembre à 21h37 »). */
export const SHARE_TEMPLATES = [
  ({ giver, when, reward }) => `🔮 ${giver} a percé le secret du grimoire ${when} !`
    + (reward ? ` « ${reward} », c'est pour moi 😏` : ' Les autres, vous en êtes où ? 😏'),
  ({ giver, when, reward }) => `🧙 Abracadabra ! ${giver} a trouvé le mot magique ${when}.`
    + (reward ? ` Je repars avec « ${reward} » 🏆` : " Le sceau n'a pas résisté 💥"),
  ({ giver, when, reward }) => `🎅 Le Père Noël confirme : ${giver} a brisé le sceau ${when}.`
    + (reward ? ` « ${reward} » : merci, bisous 😘` : ' Trop facile 😎'),
  ({ giver, when, reward }) => `❄️ L'enveloppe de ${giver} s'est ouverte ${when}. Continuez à chercher, moi j'ai fini 😌`
    + (reward ? ` Et « ${reward} », c'est réglé.` : ''),
  ({ giver, when, reward }) => `✨ Flash spécial : ${giver} a résolu l'énigme ${when} !`
    + (reward ? ` On applaudit et on note bien : « ${reward} » 👏` : ' On applaudit bien fort 👏'),
  ({ giver, when, reward }) => `🦌 Même les rennes n'en reviennent pas : ${giver} a trouvé ${when}.`
    + (reward ? ` « ${reward} », je prends 🫡` : ' Prochaine étape : le chocolat chaud ☕'),
  ({ giver, when, reward }) => `🕯️ ${giver} a parlé aux esprits de Noël ${when}… et ils ont répondu.`
    + (reward ? ` « ${reward} » : affaire classée 🗂️` : ' Affaire classée 🗂️'),
  ({ giver, when, reward }) => `🎁 Désolé pour les autres : ${giver} a trouvé le mot magique ${when}.`
    + (reward ? ` « ${reward} » ? Avec plaisir 😁` : ' Bonne chance quand même 😁'),
];

/** Message de victoire prêt à partager, terminé par le sceau de preuve. */
export function buildShareMessage({ giver, foundAt, reward = '', seal, pick = Math.random }) {
  const index = Math.min(SHARE_TEMPLATES.length - 1, Math.floor(pick() * SHARE_TEMPLATES.length));
  const text = SHARE_TEMPLATES[index]({ giver, when: formatFoundAt(foundAt), reward: String(reward ?? '').trim() });
  return `${text}\nSceau : ${seal}`;
}

/** Lien de partage WhatsApp (ouvre l'appli avec le texte prérempli). */
export function whatsappUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
