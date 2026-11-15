import { normalizeWord } from '../core/normalize.js';
import { generateLinks, isLocalBaseUrl } from '../core/generate.js';
import { verifySeal } from '../core/proof.js';
import { whatsappUrl, formatFoundAt } from '../core/share.js';
import { ADMIN_DRAFT_KEY, ADMIN_LINKS_KEY } from '../core/storage.js';
import { h, delay, debounce, mountTemplate } from '../ui/dom.js';
import { copyText } from '../ui/clipboard.js';
import { rescueCodesText } from './codes.js';

const DEFAULT_NAMES = ['Marie', 'Sulyvan', 'Papa', 'Maman', 'Boune'];

const ERROR_MESSAGES = {
  DUPLICATE: 'Deux participants ont le même prénom (majuscules et accents ne comptent pas).',
  TOO_FEW: 'Il faut au moins 3 participants.',
  EMPTY_NAME: "Un participant n'a pas de prénom.",
  IMPOSSIBLE: "Avec ces exclusions, aucun tirage n'est possible. Retires-en une.",
  EMPTY_WORD: 'Choisis un mot magique (avec au moins une lettre ou un chiffre).',
  CLUES_MISSING: "Remplis les 3 cases de l'énigme.",
};

const defaultState = () => ({
  participants: DEFAULT_NAMES.map((name) => ({ name, ideas: ['', '', ''] })),
  exclusions: [],
  clues: ['', '', ''],
  magicWord: '',
  reward: '',
});

const str = (v) => (typeof v === 'string' ? v : '');

/** Remet un brouillon stocké dans une forme sûre (ou renvoie null). */
function sanitizeDraft(draft) {
  if (!draft || !Array.isArray(draft.participants)) return null;
  return {
    participants: draft.participants.map((p) => ({
      name: str(p?.name),
      ideas: [0, 1, 2].map((k) => str(p?.ideas?.[k])),
    })),
    exclusions: (Array.isArray(draft.exclusions) ? draft.exclusions : [])
      .filter((e) => Array.isArray(e))
      .map(([g, r]) => [str(g), str(r)]),
    clues: [0, 1, 2].map((k) => str(draft.clues?.[k])),
    magicWord: str(draft.magicWord),
    reward: str(draft.reward),
  };
}

export function startAdmin({ root, store, baseUrl }) {
  mountTemplate(root, 'tpl-admin');
  document.title = "Le grimoire de l'organisateur — Secret Santa";
  const $ = (sel) => root.querySelector(sel);
  const slot = (name) => root.querySelector(`[data-slot="${name}"]`);

  let state = sanitizeDraft(store.get(ADMIN_DRAFT_KEY)) ?? defaultState();
  const saveNow = () => store.set(ADMIN_DRAFT_KEY, state);
  const save = debounce(saveNow, 300);

  slot('local-banner').hidden = !isLocalBaseUrl(baseUrl);

  const names = () => state.participants.map((p) => p.name.trim()).filter(Boolean);

  // ---- Participants -------------------------------------------------------
  function renderParticipants() {
    const box = slot('participants');
    box.replaceChildren(...state.participants.map((person, index) => {
      const nameId = `p-${index}-name`;
      const label = person.name.trim() || `participant ${index + 1}`;
      return h('div', { class: 'person' },
        h('div', { class: 'person-head' },
          h('label', { class: 'sr-only', for: nameId }, `Prénom du participant ${index + 1}`),
          h('input', {
            class: 'field', id: nameId, type: 'text', value: person.name, placeholder: 'Prénom', autocomplete: 'off',
            oninput: (e) => { person.name = e.target.value; save(); },
            onchange: () => { renderExclusions(); renderSealOptions(); },
          }),
          state.participants.length > 3 && h('button', {
            class: 'icon-btn', type: 'button', 'aria-label': `Retirer ${label}`,
            onclick: () => {
              state.participants.splice(index, 1);
              renderAll();
              saveNow();
            },
          }, '×'),
        ),
        person.ideas.map((idea, k) => {
          const id = `p-${index}-idea-${k}`;
          return [
            h('label', { class: 'sr-only', for: id }, `Idée ${k + 1} de ${label}`),
            h('input', {
              class: 'field field-idea', id, type: 'text', value: idea, autocomplete: 'off',
              placeholder: `Idée ou thème ${k + 1}`,
              oninput: (e) => { person.ideas[k] = e.target.value; save(); },
            }),
          ];
        }),
      );
    }));
  }

  // ---- Exclusions ---------------------------------------------------------
  function nameSelect(value, label, onPick) {
    const list = names();
    const select = h('select', { class: 'field', 'aria-label': label, onchange: (e) => onPick(e.target.value) },
      h('option', { value: '' }, 'Choisir…'),
      list.map((n) => h('option', { value: n, selected: n === value }, n)),
    );
    if (!list.includes(value)) select.value = '';
    return select;
  }

  function renderExclusions() {
    const box = slot('exclusions');
    if (state.exclusions.length === 0) {
      box.replaceChildren(h('p', { class: 'empty' }, 'Aucune exclusion : tout le monde peut tirer tout le monde.'));
      return;
    }
    box.replaceChildren(...state.exclusions.map((pair, index) => h('div', { class: 'exclusion' },
      nameSelect(pair[0], `Exclusion ${index + 1} : qui`, (v) => { pair[0] = v; saveNow(); }),
      h('span', { class: 'between' }, 'ne peut pas tirer'),
      nameSelect(pair[1], `Exclusion ${index + 1} : qui ne peut pas être tiré`, (v) => { pair[1] = v; saveNow(); }),
      h('button', {
        class: 'icon-btn', type: 'button', 'aria-label': `Supprimer l'exclusion ${index + 1}`,
        onclick: () => { state.exclusions.splice(index, 1); renderExclusions(); saveNow(); },
      }, '×'),
    )));
  }

  // ---- Énigme et récompense ----------------------------------------------
  function renderMagicPreview() {
    const clean = normalizeWord(state.magicWord);
    const box = slot('magic-preview');
    if (!clean) {
      box.replaceChildren('Majuscules, accents, espaces et ponctuation ne comptent pas.');
    } else {
      box.replaceChildren('Ce qui compte : ', h('span', { class: 'preview-word' }, clean),
        clean.length < 6 ? ' — astuce : un mot plus long (6 lettres ou plus, ou deux mots) résiste mieux aux petits malins.' : '');
    }
  }

  function bindRiddle() {
    root.querySelectorAll('[data-clue]').forEach((area) => {
      const k = Number(area.dataset.clue);
      area.value = state.clues[k];
      area.addEventListener('input', () => { state.clues[k] = area.value; save(); });
    });
    const word = $('#magic-word');
    word.value = state.magicWord;
    word.addEventListener('input', () => { state.magicWord = word.value; renderMagicPreview(); save(); });
    const reward = $('#reward');
    reward.value = state.reward;
    reward.addEventListener('input', () => { state.reward = reward.value; save(); });
  }

  // ---- Vérification du sceau ----------------------------------------------
  function renderSealOptions() {
    const select = $('#seal-name');
    const current = select.value;
    select.replaceChildren(...names().map((n) => h('option', { value: n, selected: n === current }, n)));
  }

  $('#seal-check').addEventListener('click', async () => {
    const out = slot('seal-result');
    const name = $('#seal-name').value;
    const code = $('#seal-code').value;
    if (!normalizeWord(state.magicWord)) {
      out.className = 'msg msg-warn';
      out.textContent = "Renseigne d'abord le mot magique, plus haut.";
      return;
    }
    const ok = await verifySeal(name, state.magicWord, code);
    out.className = ok ? 'msg msg-ok' : 'msg msg-error';
    out.textContent = ok ? `✓ Sceau authentique : ${name} a bien trouvé le mot magique.` : '✗ Ce sceau ne correspond pas.';
  });

  // ---- Résultats -----------------------------------------------------------
  function renderResults(record, { regenerated = false } = {}) {
    if (!record?.links?.length) return;
    slot('results-panel').hidden = false;
    slot('regen-note').hidden = !regenerated;
    const when = record.generatedAt ? formatFoundAt(new Date(record.generatedAt)) : '';
    slot('results-meta').textContent = `${record.links.length} liens, tirage effectué ${when}. Envoie à chacun le sien.`;
    slot('results').replaceChildren(...record.links.map((link) => {
      const masked = 'NOEL-••••••';
      const codeEl = h('code', {}, masked);
      const toggle = h('button', {
        class: 'quiet-link', type: 'button', 'aria-label': `Afficher le code de secours de ${link.name}`,
        onclick: () => {
          const shown = codeEl.textContent === link.rescueCode;
          codeEl.textContent = shown ? masked : link.rescueCode;
          toggle.textContent = shown ? 'Afficher' : 'Masquer';
        },
      }, 'Afficher');
      const copyBtn = h('button', {
        class: 'btn btn-small', type: 'button',
        onclick: async () => {
          const ok = await copyText(link.url);
          copyBtn.textContent = ok ? 'Copié ✓' : 'Copie impossible';
          setTimeout(() => { copyBtn.textContent = 'Copier le lien'; }, 1600);
        },
      }, 'Copier le lien');
      const message = `🎅 Coucou ${link.name} ! Voici ton lien secret pour le Secret Santa : ${link.url}`;
      let shortUrl = link.url;
      try { const u = new URL(link.url); shortUrl = `${u.host}${u.pathname}#…`; } catch { /* lien local */ }
      return h('article', { class: 'link-card' },
        h('div', { class: 'link-head' },
          h('span', { class: 'link-name' }, link.name),
          h('span', { class: 'link-url' }, shortUrl),
        ),
        h('div', { class: 'link-actions' },
          copyBtn,
          h('a', { class: 'btn btn-small btn-wa', href: whatsappUrl(message), target: '_blank', rel: 'noopener' }, 'Envoyer sur WhatsApp'),
        ),
        h('div', { class: 'rescue' }, 'Code de secours : ', codeEl, toggle),
      );
    }));
  }

  // ---- Tirage ----------------------------------------------------------------
  const generateBtn = $('#generate');
  generateBtn.addEventListener('click', async () => {
    const errorBox = slot('gen-error');
    const warnBox = slot('gen-warning');
    errorBox.textContent = '';
    warnBox.textContent = '';
    const previous = store.get(ADMIN_LINKS_KEY);
    if (previous?.links?.length && !window.confirm('Relancer le tirage ? Les liens déjà envoyés correspondraient à l’ancien tirage.')) return;

    const missing = state.participants.filter((p) => p.name.trim() && p.ideas.filter((i) => i.trim()).length < 3).map((p) => p.name.trim());
    const exclusions = state.exclusions.filter(([g, r]) => g && r && normalizeWord(g) !== normalizeWord(r));
    const label = slot('generate-label');
    generateBtn.disabled = true;
    generateBtn.classList.add('is-casting');
    label.textContent = 'Le grimoire opère…';
    try {
      const [links] = await Promise.all([
        generateLinks({
          participants: state.participants,
          exclusions,
          clues: state.clues,
          reward: state.reward,
          magicWord: state.magicWord,
          baseUrl,
        }),
        delay(1200),
      ]);
      const record = { generatedAt: new Date().toISOString(), links };
      store.set(ADMIN_LINKS_KEY, record);
      renderResults(record, { regenerated: Boolean(previous?.links?.length) });
      if (missing.length) warnBox.textContent = `Idées incomplètes pour : ${missing.join(', ')}. Les liens fonctionnent quand même.`;
      slot('results-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      errorBox.textContent = ERROR_MESSAGES[err?.code] ?? 'Oups, quelque chose a coincé. Réessaie.';
      if (!ERROR_MESSAGES[err?.code]) console.error(err);
    } finally {
      generateBtn.disabled = false;
      generateBtn.classList.remove('is-casting');
      label.textContent = '✦ Lancer le tirage secret';
    }
  });

  // ---- Discrétion : mot magique masqué, liens effaçables -------------------------
  const toggleWord = $('#toggle-word');
  toggleWord.addEventListener('click', () => {
    const input = $('#magic-word');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggleWord.textContent = show ? 'Masquer' : 'Afficher';
    toggleWord.setAttribute('aria-pressed', String(show));
  });

  $('#copy-codes').addEventListener('click', async (e) => {
    const record = store.get(ADMIN_LINKS_KEY);
    if (!record?.links?.length) return;
    const ok = await copyText(rescueCodesText(record.links));
    e.target.textContent = ok ? 'Codes copiés ✓ (garde-les dans tes notes)' : 'Copie impossible';
    setTimeout(() => { e.target.textContent = 'Copier tous les codes de secours'; }, 2400);
  });

  $('#clear-links').addEventListener('click', () => {
    if (!window.confirm('Effacer les liens, les codes de secours et le mot magique de ce navigateur ? Pense à copier les codes de secours avant.')) return;
    store.remove(ADMIN_LINKS_KEY);
    state.magicWord = '';
    saveNow();
    $('#magic-word').value = '';
    renderMagicPreview();
    slot('results').replaceChildren();
    slot('results-panel').hidden = true;
  });

  // ---- Ajouts / réinitialisation ----------------------------------------------
  $('#add-participant').addEventListener('click', () => {
    state.participants.push({ name: '', ideas: ['', '', ''] });
    renderParticipants();
    saveNow();
    root.querySelector(`#p-${state.participants.length - 1}-name`)?.focus();
  });

  $('#add-exclusion').addEventListener('click', () => {
    state.exclusions.push(['', '']);
    renderExclusions();
    saveNow();
  });

  $('#reset-form').addEventListener('click', () => {
    if (!window.confirm('Réinitialiser le formulaire ? Les liens déjà générés restent affichés.')) return;
    state = defaultState();
    store.remove(ADMIN_DRAFT_KEY);
    renderAll();
    bindValues();
  });

  function bindValues() {
    root.querySelectorAll('[data-clue]').forEach((area) => { area.value = state.clues[Number(area.dataset.clue)]; });
    $('#magic-word').value = state.magicWord;
    $('#reward').value = state.reward;
    renderMagicPreview();
  }

  function renderAll() {
    renderParticipants();
    renderExclusions();
    renderSealOptions();
  }

  renderAll();
  bindRiddle();
  renderMagicPreview();
  renderResults(store.get(ADMIN_LINKS_KEY));
}
