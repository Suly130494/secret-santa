import { unlockPayload, linkId } from '../core/link.js';
import { progressKey } from '../core/storage.js';
import { proofSeal } from '../core/proof.js';
import { formatFoundAt, buildShareMessage, whatsappUrl } from '../core/share.js';
import { h, delay, mountTemplate } from '../ui/dom.js';
import { copyText } from '../ui/clipboard.js';
import { createScratchCard } from './scratch.js';
import { sanitizeProgress, resumeScreen } from './flow.js';

export const WRONG_WORD_MESSAGES = [
  'Hmm… le sceau ne reconnaît pas cette formule. 🤔',
  'Raté ! Même les lutins ont pouffé de rire. 🧝',
  'Le sceau a frissonné… mais il tient bon. ❄️',
  "Ce n'est pas le bon mot, mais c'était joliment tenté. ✨",
  'Le Père Noël secoue la tête, désolé. 🎅',
  'Pas encore ! Relis bien les trois cases. 🔍',
  'Brrr… mauvaise formule, le grimoire reste fermé. 📕',
];

/**
 * Le parcours d'un participant : intro → enveloppe scellée → victoire → pioche → résultat.
 */
export async function startPlayer({ root, payload, hash, scene, sound, store, now = () => new Date() }) {
  mountTemplate(root, 'tpl-player');
  document.title = `${payload.g}, ton enveloppe t'attend — Secret Santa`;
  const ref = (name) => root.querySelector(`[data-ref="${name}"]`);
  const player = root.querySelector('.player');
  const key = progressKey(linkId(hash));
  let progress = sanitizeProgress(store.get(key));
  const saveProgress = () => store.set(key, progress);
  const others = payload.p.filter((n) => n !== payload.g);
  let unlocked = null;
  let shareText = null;
  let lastWrong = -1;

  // ---- Utilitaires d'écran -------------------------------------------------
  function show(screen) {
    root.querySelectorAll('section[data-screen]').forEach((s) => { s.hidden = s.dataset.screen !== screen; });
    player.dataset.current = screen;
    window.scrollTo({ top: 0 });
  }

  let toastTimer;
  function toast(text) {
    const el = ref('toast');
    el.textContent = text;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
  }

  // ---- Son ----------------------------------------------------------------
  const soundBtn = ref('sound');
  const syncSound = () => {
    const muted = sound.isMuted();
    soundBtn.setAttribute('aria-pressed', String(muted));
    soundBtn.setAttribute('aria-label', muted ? 'Remettre le son' : 'Couper le son');
    soundBtn.classList.toggle('is-muted', muted);
  };
  soundBtn.addEventListener('click', () => { sound.toggle(); syncSound(); });
  syncSound();
  // iOS n'accepte de lancer l'audio qu'à la fin d'un geste (touchend / click), pas au pointerdown.
  ['pointerup', 'touchend', 'click', 'keydown'].forEach((type) => {
    window.addEventListener(type, () => sound.unlock(), { capture: true, passive: true });
  });

  // ---- Partage de victoire --------------------------------------------------
  async function getShareText() {
    if (!shareText) {
      const seal = await proofSeal(payload.g, progress.secret);
      shareText = buildShareMessage({ giver: payload.g, foundAt: new Date(progress.foundAt), reward: payload.r, seal });
    }
    return shareText;
  }

  async function renderShare(box) {
    const text = await getShareText();
    const copyBtn = h('button', {
      class: 'btn btn-ghost', type: 'button',
      onclick: async () => toast((await copyText(text)) ? 'Message copié ! Colle-le dans le groupe 📋' : 'Copie impossible, sélectionne le texte à la main'),
    }, 'Copier le message');
    box.replaceChildren(
      h('blockquote', { class: 'share-preview' }, text),
      h('div', { class: 'share-actions' },
        h('a', { class: 'btn btn-wa', href: whatsappUrl(text), target: '_blank', rel: 'noopener' }, 'Partager sur WhatsApp'),
        copyBtn,
      ),
    );
  }

  function openSheet() {
    renderShare(ref('sheet-share'));
    ref('sheet').hidden = false;
  }
  const closeSheet = () => { ref('sheet').hidden = true; };
  ref('sheet-close').addEventListener('click', closeSheet);
  ref('sheet-dismiss').addEventListener('click', closeSheet);

  // ---- Intro ----------------------------------------------------------------
  async function playIntro(short) {
    show('intro');
    ref('intro-name').textContent = `${payload.g},`;
    const screen = root.querySelector('[data-screen="intro"]');
    screen.classList.toggle('is-short', short);
    let skip;
    const skipped = new Promise((resolve) => { skip = resolve; });
    const onTap = () => { scene.skipIntro(); skip(); };
    screen.addEventListener('pointerdown', onTap);
    // Filet de sécurité : l'intro ne peut jamais bloquer, même si l'animation est ralentie.
    const safety = delay(short ? 3000 : 7000).then(() => scene.skipIntro());
    await Promise.race([Promise.all([scene.playIntro({ giver: payload.g, short }), delay(short ? 1300 : 4300)]), skipped, safety]);
    screen.removeEventListener('pointerdown', onTap);
  }

  // ---- Enveloppe scellée -----------------------------------------------------
  function zoomClue(text) {
    ref('clue-zoom-text').textContent = text;
    ref('clue-zoom').hidden = false;
  }
  ref('clue-zoom').addEventListener('click', () => { ref('clue-zoom').hidden = true; });

  function showSealed() {
    show('sealed');
    ref('sealed-name').textContent = payload.g;
    scene.showEnvelope(ref('envelope-anchor'));
    if (payload.r) {
      ref('reward-line').hidden = false;
      ref('reward-text').textContent = payload.r;
    }
    const row = ref('cards');
    row.replaceChildren();
    payload.q.forEach((text, i) => {
      const el = h('div', {});
      row.append(el);
      createScratchCard(el, {
        text,
        label: `Case ${i + 1}`,
        revealed: progress.revealed.includes(i),
        onScratch: (level) => sound.scratch(level),
        onReveal: () => {
          sound.cue('ping');
          if (!progress.revealed.includes(i)) {
            progress.revealed.push(i);
            saveProgress();
          }
        },
        onOpen: () => zoomClue(text),
      });
    });

    const form = ref('spell-form');
    const input = ref('spell-input');
    const btn = ref('spell-btn');
    input.addEventListener('focus', () => setTimeout(() => input.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300));
    let busy = false;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy || !input.value.trim()) return;
      busy = true;
      btn.disabled = true;
      ref('spell-msg').textContent = '';
      const value = input.value;
      const result = await unlockPayload(payload, value);
      if (!result) {
        let k;
        do { k = Math.floor(Math.random() * WRONG_WORD_MESSAGES.length); } while (k === lastWrong);
        lastWrong = k;
        ref('spell-msg').textContent = WRONG_WORD_MESSAGES[k];
        input.classList.remove('is-wrong');
        void input.offsetWidth;
        input.classList.add('is-wrong');
        await scene.shakeEnvelope();
        busy = false;
        btn.disabled = false;
        return;
      }
      input.blur();
      unlocked = result;
      progress = {
        ...progress,
        secret: value,
        mode: result.mode,
        foundAt: result.mode === 'magic' ? now().toISOString() : null,
        drawn: false,
      };
      saveProgress();
      // Le clavier se referme : on recentre l'enveloppe pour que la casse du sceau se voie en entier.
      ref('envelope-anchor').scrollIntoView({ block: 'center', behavior: 'smooth' });
      await delay(350);
      player.classList.add('is-breaking');
      await scene.breakSeal();
      player.classList.remove('is-breaking');
      if (result.mode === 'magic') showVictory();
      else showReady();
    });
  }

  // ---- Victoire --------------------------------------------------------------
  function showVictory() {
    show('victory');
    ref('found-at').textContent = formatFoundAt(new Date(progress.foundAt));
    if (payload.r) {
      ref('victory-reward').hidden = false;
      ref('victory-reward-text').textContent = payload.r;
    }
    renderShare(ref('victory-share'));
    ref('open-envelope').onclick = () => showReady();
  }

  // ---- Pioche -------------------------------------------------------------------
  function showReady() {
    show('ready');
    ref('draw').onclick = () => runDraw();
  }

  async function runDraw() {
    show('result');
    player.classList.add('is-drawing');
    hideResultDetails();
    scene.resetDraw();
    await scene.runDraw({ names: others, target: unlocked.target, anchor: ref('card-anchor') });
    progress.drawn = true;
    saveProgress();
    player.classList.remove('is-drawing');
    revealResult(false);
  }

  // ---- Résultat -------------------------------------------------------------------
  function hideResultDetails() {
    ref('ideas').hidden = true;
    ref('ideas-locked').hidden = true;
    ref('share-again').hidden = true;
    ref('result-name').classList.remove('is-revealed');
  }

  function renderIdeas() {
    const list = ref('ideas-list');
    const ideas = unlocked.ideas ?? [];
    list.replaceChildren(...(ideas.length ? ideas : ['Pas d’idée renseignée : laisse parler ton cœur 💝'])
      .map((idea, i) => h('li', { class: 'idea', style: `--d:${i * 120}ms` }, h('span', { class: 'idea-icon', 'aria-hidden': 'true' }, '🎁'), idea)));
    ref('ideas').hidden = false;
    ref('ideas-locked').hidden = true;
    ref('share-again').hidden = false;
  }

  async function revealResult(immediate) {
    const name = ref('result-name');
    name.textContent = unlocked.target;
    requestAnimationFrame(() => name.classList.add('is-revealed'));
    if (!immediate) await delay(1200);
    if (unlocked.mode === 'magic') renderIdeas();
    else ref('ideas-locked').hidden = false;
  }

  function showResult() {
    show('result');
    hideResultDetails();
    scene.showResultIdle(unlocked.target, ref('card-anchor'));
    revealResult(true);
  }

  ref('replay').addEventListener('click', () => runDraw());
  ref('share-again').addEventListener('click', openSheet);

  ref('late-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = ref('late-input');
    if (!input.value.trim()) return;
    const result = await unlockPayload(payload, input.value);
    if (result?.mode === 'magic') {
      unlocked = result;
      progress = { ...progress, secret: input.value, mode: 'magic', foundAt: now().toISOString() };
      saveProgress();
      shareText = null;
      input.blur();
      renderIdeas();
      toast('Bravo, tu as percé l’énigme ! 🎉');
      openSheet();
    } else {
      ref('late-msg').textContent = result?.mode === 'rescue'
        ? "Ça, c'est ton code de secours : il faut le mot magique 😉"
        : WRONG_WORD_MESSAGES[Math.floor(Math.random() * WRONG_WORD_MESSAGES.length)];
    }
  });

  // ---- Démarrage ------------------------------------------------------------------
  if (progress.secret) {
    unlocked = await unlockPayload(payload, progress.secret);
    if (!unlocked) {
      progress = sanitizeProgress({ revealed: progress.revealed });
      saveProgress();
    }
  }
  await playIntro(Boolean(unlocked));
  const screen = resumeScreen(progress, unlocked);
  if (screen === 'result') showResult();
  else if (screen === 'victory') showVictory();
  else if (screen === 'ready') showReady();
  else showSealed();
}
