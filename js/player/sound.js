import { MUTED_KEY } from '../core/storage.js';

const VOLUME = 0.5;
const PENTATONIC = [1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0, 2349.3, 2637.0];

/**
 * Sons du jeu, synthétisés en WebAudio (aucun fichier à charger).
 * Le contexte audio n'est créé qu'au premier geste de l'utilisateur.
 * @returns {{unlock(): void, toggle(): boolean, isMuted(): boolean, cue(name: string): void, scratch(level: number): void}}
 */
export function createSound(store) {
  let muted = store.get(MUTED_KEY) === true;
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let scratchGain = null;

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

  const ready = () => !muted && ensure() && ctx.state === 'running';

  function noise(loop = false) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = loop;
    return src;
  }

  function bell(freq, at = 0, duration = 1.6, level = 0.18) {
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
      osc.connect(g).connect(master);
      osc.start(t0);
      osc.stop(t0 + duration + 0.1);
    });
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
    setTimeout(() => { if (ready()) chime(); }, 120);
  }

  return {
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
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
        else if (name === 'whoosh') whoosh();
        else if (name === 'shimmer') shimmer();
        else if (name === 'error') error();
        else if (name === 'crack') crack();
        else if (name === 'flip') { chime(); whoosh(0.5, 0.15); }
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
  };
}
