const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « le 3 décembre à 21h37 », « le 1er décembre à 9h05 ». */
export function formatFoundAt(date) {
  const day = date.getDate() === 1 ? '1er' : String(date.getDate());
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `le ${day} ${MONTHS[date.getMonth()]} à ${date.getHours()}h${minutes}`;
}

/**
 * Récompense prête à compléter « le premier gagne… » (même tournure que sur l'enveloppe) :
 * sans ponctuation finale, minuscule en tête sauf pour un sigle.
 */
export function rewardPhrase(reward) {
  const r = String(reward ?? '').trim().replace(/[\s.!?…;,:]+$/u, '');
  return /^\p{Lu}\p{Ll}/u.test(r) ? r[0].toLowerCase() + r.slice(1) : r;
}

/**
 * Phrases de victoire. `when` est en minuscules (« le 3 décembre à 21h37 »).
 * La récompense suit toujours « le premier gagne », à la 3ᵉ personne comme dans l'admin
 * (« ses cadeaux », « assis » s'accordent avec « le premier »). Chacun peut partager sa victoire,
 * pas seulement le premier : les messages ne réclament donc la récompense que sous condition
 * (c'est l'heure des messages dans le groupe qui tranche). Aucun accord au féminin ou au masculin
 * à la première personne : le même texte vaut pour tout le monde.
 */
export const SHARE_TEMPLATES = [
  ({ giver, when, reward }) => `🔮 ${giver} a percé le secret du grimoire ${when} !`
    + (reward ? ` Le premier gagne ${reward}… si personne n'a posté avant moi, c'est pour moi 😏` : ' Les autres, vous en êtes où ? 😏'),
  ({ giver, when, reward }) => `🧙 Abracadabra ! ${giver} a trouvé le mot magique ${when}.`
    + (reward ? ` Rappel : le premier gagne ${reward}. Regardez bien l'heure 🏆` : " Le sceau n'a pas résisté 💥"),
  ({ giver, when, reward }) => `🎅 Le Père Noël confirme : ${giver} a brisé le sceau ${when}.`
    + (reward ? ` Le premier gagne ${reward} : si c'est moi, merci, bisous 😘` : ' Trop facile 😎'),
  ({ giver, when, reward }) => `❄️ L'enveloppe de ${giver} s'est ouverte ${when}. Continuez à chercher, moi j'ai fini 😌`
    + (reward ? ` Pour info, le premier gagne ${reward}.` : ''),
  ({ giver, when, reward }) => `✨ Flash spécial : ${giver} a résolu l'énigme ${when} !`
    + (reward ? ` Le premier gagne ${reward} : à vos chronos 👏` : ' On applaudit bien fort 👏'),
  ({ giver, when, reward }) => `🦌 Même les rennes n'en reviennent pas : ${giver} a trouvé ${when}.`
    + (reward ? ` Le premier gagne ${reward}… je prends, si la place est libre 🫡` : ' Prochaine étape : le chocolat chaud ☕'),
  ({ giver, when, reward }) => `🕯️ ${giver} a parlé aux esprits de Noël ${when}… et ils ont répondu.`
    + (reward ? ` Le premier gagne ${reward}, et les esprits tiennent les comptes 🗂️` : ' Affaire classée 🗂️'),
  ({ giver, when, reward }) => `🎁 Pardon les autres : ${giver} a trouvé le mot magique ${when}.`
    + (reward ? ` Le premier gagne ${reward}, sauf si quelqu'un a posté avant moi 😁` : ' Bonne chance quand même 😁'),
];

/** Message de victoire prêt à partager, terminé par le sceau de preuve. */
export function buildShareMessage({ giver, foundAt, reward = '', seal, pick = Math.random }) {
  const index = Math.min(SHARE_TEMPLATES.length - 1, Math.floor(pick() * SHARE_TEMPLATES.length));
  const text = SHARE_TEMPLATES[index]({ giver, when: formatFoundAt(foundAt), reward: rewardPhrase(reward) });
  return `${text}\nSceau : ${seal}`;
}

/** Lien de partage WhatsApp (ouvre l'appli avec le texte prérempli). */
export function whatsappUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
