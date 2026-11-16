import { MUTED_KEY } from '../core/storage.js';

const VOLUME = 0.5;
const PENTATONIC = [1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0, 2349.3, 2637.0];
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

// Mélodies du domaine public, en [note MIDI, durée en temps].
// Jingle Bells (J. L. Pierpont, 1857) — refrain.
const JINGLE_BELLS = [
  [76, 1], [76, 1], [76, 2], [76, 1], [76, 1], [76, 2], [76, 1], [79, 1], [72, 1.5], [74, 0.5], [76, 4],
  [77, 1], [77, 1], [77, 1.5], [77, 0.5], [77, 1], [76, 1], [76, 1], [76, 0.5], [76, 0.5],
  [76, 1], [74, 1], [74, 1], [76, 1], [74, 2], [79, 2],
  [76, 1], [76, 1], [76, 2], [76, 1], [76, 1], [76, 2], [76, 1], [79, 1], [72, 1.5], [74, 0.5], [76, 4],
  [77, 1], [77, 1], [77, 1.5], [77, 0.5], [77, 1], [76, 1], [76, 1], [76, 0.5], [76, 0.5],
  [79, 1], [79, 1], [77, 1], [74, 1], [72, 4],
];
// Douce nuit (F. Gruber, 1818) — en croches (6/8).
const SILENT_NIGHT = [
  [67, 3], [69, 1], [67, 2], [64, 6], [67, 3], [69, 1], [67, 2], [64, 6],
  [74, 4], [74, 2], [71, 6], [72, 4], [72, 2], [67, 6],
  [69, 4], [69, 2], [72, 3], [71, 1], [69, 2], [67, 3], [69, 1], [67, 2], [64, 6],
  [69, 4], [69, 2], [72, 3], [71, 1], [69, 2], [67, 3], [69, 1], [67, 2], [64, 6],
  [74, 4], [74, 2], [77, 3], [74, 1], [71, 2], [72, 6], [76, 6],
  [72, 2], [67, 2], [64, 2], [67, 3], [65, 1], [62, 2], [60, 12],
];

/**
 * Sons du jeu, synthétisés en WebAudio (aucun fichier à charger) : effets, grelots, boîte à musique.
 * Le contexte audio n'est créé qu'au premier geste de l'utilisateur.
 */
export function createSound(store) {
  let muted = store.get(MUTED_KEY) === true;
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let scratchGain = null;
  let ambientWanted = false;
  let ambientGain = null;
  let ambientTimer = null;
  let busyUntil = 0; // fin du refrain en cours (temps audio)

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let k = 0; k < data.length; k++) data[k] = Math.random() * 2 - 1;
    return ctx;
  }

  // Le contexte n'est créé que par unlock() (geste de l'utilisateur), jamais par un son.
  const ready = () => !muted && ctx !== null && ctx.state === 'running';

  function noise(loop = false) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = loop;
    return src;
  }

  function bell(freq, at = 0, duration = 1.6, level = 0.18, out = master) {
    const t0 = ctx.currentTime + at;
    [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]].forEach(([ratio, gain], i) => {
      if (freq * ratio > 16000) return; // inaudible, et hors plage de l'oscillateur
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(level * gain, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration / (1 + i * 0.6));
      osc.connect(g).connect(out);
      osc.start(t0);
      osc.stop(t0 + duration + 0.1);
    });
  }

  /** Note de boîte à musique : attaque nette, harmoniques douces, longue résonance. */
  function pluck(freq, t0, level, out) {
    [[1, 1, 1.6], [2, 0.32, 0.9], [3.01, 0.12, 0.5], [4.2, 0.05, 0.25]].forEach(([ratio, gain, decay]) => {
      if (freq * ratio > 16000) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(level * gain, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
      osc.connect(g).connect(out);
      osc.start(t0);
      osc.stop(t0 + decay + 0.05);
    });
  }

  /** Joue une mélodie ; renvoie la durée en secondes. */
  function melody(notes, beat, { level = 0.12, transpose = 12, out = master, at = 0 } = {}) {
    let t = ctx.currentTime + at;
    notes.forEach(([note, beats]) => {
      pluck(midi(note + transpose), t, level, out);
      t += beats * beat;
    });
    return t - ctx.currentTime;
  }

  /** Grelots de traîneau : petites frappes métalliques secouées en rythme. */
  function sleighBells(duration = 2, level = 0.1, at = 0) {
    const t0 = ctx.currentTime + at;
    const hits = Math.round(duration * 22);
    for (let k = 0; k < hits; k++) {
      const u = k / hits;
      const env = Math.sin(Math.PI * Math.min(1, u * 1.1)); // monte puis redescend
      const t = t0 + u * duration + (Math.random() - 0.5) * 0.02;
      const base = 2600 + Math.random() * 1500;
      [1, 1.47, 2.09].forEach((ratio, i) => {
        const f = base * ratio;
        if (f > 16000) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        const peak = Math.max(0.0002, level * env * (i === 0 ? 1 : 0.4) * (0.6 + Math.random() * 0.4));
        const dec = 0.07 + Math.random() * 0.12;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
        osc.connect(g).connect(master);
        osc.start(t);
        osc.stop(t + dec + 0.02);
      });
    }
  }

  function chime() {
    [1046.5, 1318.5, 1568.0, 2093.0].forEach((f, i) => bell(f, i * 0.09, 1.8, 0.16));
  }

  function whoosh(duration = 0.7, level = 0.35) {
    const t0 = ctx.currentTime;
    const src = noise();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t0);
    filter.frequency.exponentialRampToValueAtTime(4000, t0 + duration * 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(level, t0 + duration * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + duration + 0.05);
  }

  function shimmer(duration = 2.4) {
    const t0 = ctx.currentTime;
    const src = noise(true);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 7500;
    band.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 7;
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain).connect(g.gain);
    src.connect(band).connect(g).connect(master);
    src.start(t0);
    lfo.start(t0);
    src.stop(t0 + duration + 0.1);
    lfo.stop(t0 + duration + 0.1);
    for (let k = 0; k < 7; k++) {
      bell(PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)] * 2, 0.2 + Math.random() * (duration - 0.6), 0.9, 0.05);
    }
  }

  function error() {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t0);
    osc.frequency.exponentialRampToValueAtTime(65, t0 + 0.3);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.4);
    whoosh(0.25, 0.12);
  }

  function crack() {
    const t0 = ctx.currentTime;
    const src = noise();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    src.connect(hp).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + 0.2);
    setTimeout(() => { if (ready()) { chime(); sleighBells(1.0, 0.09); } }, 120);
  }

  /** Refrain de Jingle Bells en boîte à musique, accompagné de grelots. */
  function jingle(at = 0) {
    const beat = 0.24;
    const length = melody(JINGLE_BELLS, beat, { level: 0.11, at });
    for (let b = 0; b < JINGLE_BELLS.reduce((s, [, d]) => s + d, 0); b += 2) {
      sleighBells(0.18, 0.035, at + b * beat);
    }
    busyUntil = ctx.currentTime + length;
    return length;
  }

  // --- Boîte à musique d'ambiance (Douce nuit en boucle, très douce) ---
  function playAmbientLoop() {
    clearTimeout(ambientTimer);
    if (!ambientWanted || !ctx || ctx.state !== 'running') return;
    const wait = Math.max(0, busyUntil - ctx.currentTime);
    if (wait > 0.05) {
      ambientTimer = setTimeout(playAmbientLoop, wait * 1000 + 600);
      return;
    }
    ambientGain?.disconnect();
    ambientGain = ctx.createGain();
    ambientGain.gain.value = 1;
    ambientGain.connect(master);
    const length = melody(SILENT_NIGHT, 0.34, { level: 0.05, out: ambientGain });
    ambientTimer = setTimeout(playAmbientLoop, (length + 4) * 1000);
  }

  function stopAmbientSound() {
    clearTimeout(ambientTimer);
    if (ambientGain && ctx) {
      const g = ambientGain;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => g.disconnect(), 1500);
    }
    ambientGain = null;
  }

  return {
    unlock() {
      const c = ensure();
      if (!c) return;
      const go = () => { if (ambientWanted && !ambientGain) playAmbientLoop(); };
      if (c.state === 'suspended') c.resume().then(go).catch(() => {});
      else go();
    },
    toggle() {
      muted = !muted;
      store.set(MUTED_KEY, muted);
      if (master) master.gain.setTargetAtTime(muted ? 0 : VOLUME, ctx.currentTime, 0.05);
      if (muted && scratchGain) scratchGain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      return muted;
    },
    isMuted: () => muted,
    cue(name) {
      if (!ready()) return;
      try {
        if (name === 'chime') chime();
        else if (name === 'ping') { bell(1568, 0, 1.2, 0.12); bell(2093, 0.08, 1.0, 0.08); }
        else if (name === 'whoosh') { whoosh(); sleighBells(1.4, 0.06, 0.1); }
        else if (name === 'shimmer') shimmer();
        else if (name === 'error') error();
        else if (name === 'crack') crack();
        else if (name === 'sleigh') sleighBells(2.8, 0.1);
        else if (name === 'flip') { chime(); whoosh(0.5, 0.15); jingle(0.9); }
        else if (name === 'jingle') { sleighBells(1.6, 0.1); jingle(0.4); }
      } catch { /* le son est un bonus : jamais bloquant */ }
    },
    scratch(level) {
      if (!ready()) return;
      if (!scratchGain) {
        const src = noise(true);
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = 3200;
        band.Q.value = 0.7;
        scratchGain = ctx.createGain();
        scratchGain.gain.value = 0;
        src.connect(band).connect(scratchGain).connect(master);
        src.start();
      }
      const now = ctx.currentTime;
      const target = level > 0 ? 0.08 + level * 0.22 : 0;
      scratchGain.gain.cancelScheduledValues(now);
      scratchGain.gain.setTargetAtTime(target, now, level > 0 ? 0.015 : 0.08);
      if (level > 0) scratchGain.gain.setTargetAtTime(0, now + 0.09, 0.06); // retombe si le doigt s'arrête
    },
    /** Boîte à musique de fond (démarre au premier geste si l'audio n'est pas encore débloqué). */
    startAmbient() {
      ambientWanted = true;
      if (ctx && ctx.state === 'running' && !ambientGain) playAmbientLoop();
    },
    stopAmbient() {
      ambientWanted = false;
      stopAmbientSound();
    },
  };
}
